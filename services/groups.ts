import { supabase } from './supabase';

export interface Group {
  id: string;
  leader_id: string;
  join_code: string;
  is_ready: boolean;
  is_live: boolean;
  is_locked: boolean;
  has_attendant: boolean;
  video_links: string[];
  dinnerparty_details: any; // Using any for now, will type this properly later
  accepted_attendee_group_id: string | null;
  attending_host_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface DinnerParty {
  id: string;
  group_id: string;
  main_dish: string;
  side: string;
  address: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartyRequest {
  id: string;
  requesting_group_id: string;
  host_group_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for host group information returned to attending groups
 */
export interface HostGroupInfo {
  hostGroup: {
    id: string;
    name: string;
    leader: {
      id: string;
      display_name: string;
      profile_picture_url: string;
    };
    members: Array<{
      id: string;
      display_name: string;
      profile_picture_url: string;
    }>;
  };
  dinnerParty: {
    id: string;
    name: string;
    location: string;
    dinner_time: string;
    description: string;
  };
}

/**
 * Interface for attendee group information returned to host groups
 */
export interface AttendeeGroupInfo {
  attendeeGroup: {
    id: string;
    name: string;
    leader: {
      id: string;
      display_name: string;
      profile_picture_url: string;
    };
    members: Array<{
      id: string;
      display_name: string;
      profile_picture_url: string;
    }>;
  };
}

// Check if user is in a group
export async function getUserGroup(userId: string): Promise<{ group: Group | null; isLeader: boolean }> {
  try {
    // First get the group membership
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .single();

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        console.log('No group found for user');
        return { group: null, isLeader: false };
      }
      throw memberError;
    }
    if (!memberData) return { group: null, isLeader: false };

    // Then get the group details
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', memberData.group_id)
      .single();

    if (groupError) {
      if (groupError.code === 'PGRST116') {
        console.log('Group data not found');
        return { group: null, isLeader: false };
      }
      throw groupError;
    }
    if (!groupData) return { group: null, isLeader: false };

    return {
      group: groupData,
      isLeader: groupData.leader_id === userId
    };
  } catch (error) {
    console.error('Error getting user group:', error);
    return { group: null, isLeader: false };
  }
}

async function generateUniqueJoinCode(): Promise<string> {
  const characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed similar looking characters
  const codeLength = 6;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate a random code
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }

    // Check if code exists
    const { data, error } = await supabase
      .from('groups')
      .select('id')
      .eq('join_code', code)
      .single();

    if (error && error.code === 'PGRST116') {
      // Code doesn't exist, we can use it
      return code;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique join code');
}

// Create a new group
export async function createGroup(leaderId: string): Promise<Group | null> {
  try {
    const joinCode = await generateUniqueJoinCode();

    // Create the group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert([
        {
          leader_id: leaderId,
          join_code: joinCode,
        }
      ])
      .select()
      .single();

    if (groupError) throw groupError;
    if (!groupData) throw new Error('Failed to create group');

    // Add the leader as a member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert([
        {
          group_id: groupData.id,
          user_id: leaderId,
        }
      ]);

    if (memberError) throw memberError;

    return groupData;
  } catch (error) {
    console.error('Error creating group:', error);
    return null;
  }
}

// Function to lock group and prevent further joins
export async function lockGroup(groupId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('groups')
      .update({ 
        is_locked: true,
      })
      .eq('id', groupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error locking group:', error);
    return false;
  }
}

// Modified checkAndUpdateGroupReadyState to handle new logic
async function checkAndUpdateGroupReadyState(groupId: string): Promise<boolean> {
  try {
    const { count, error: countError } = await supabase
      .from('group_members')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId);

    if (countError || count === null) return false;

    // Update group state based on member count
    const updates: any = {};
    
    if (count >= 3) {
      updates.is_ready = true;
    } else {
      updates.is_ready = false;
      updates.is_locked = false;
      updates.is_live = false;
      
      // If group had less than 3 members and was live, clean up videos
      const { data: groupData } = await supabase
        .from('groups')
        .select('is_live')
        .eq('id', groupId)
        .single();
        
      if (groupData?.is_live) {
        await deleteGroupVideos(groupId);
      }
    }

    const { error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId);

    if (error) throw error;
    return updates.is_ready;
  } catch (error) {
    console.error('Error checking group ready state:', error);
    return false;
  }
}

// Modified joinGroup to check for locked status
export async function joinGroup(userId: string, joinCode: string): Promise<Group | null> {
  try {
    console.log('Attempting to join group with code:', joinCode, 'for user:', userId);
    
    // First find the group with this code
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('join_code', joinCode)
      .single();

    if (groupError) {
      console.error('Error finding group:', groupError);
      throw groupError;
    }
    if (!groupData) {
      console.error('No group found with join code:', joinCode);
      throw new Error('Invalid join code');
    }
    if (groupData.is_locked) {
      console.error('Group is locked:', groupData.id);
      throw new Error('Group is locked and not accepting new members');
    }

    console.log('Found group:', groupData.id);

    // Check if user is already a member of this group
    const { data: existingMembership, error: membershipError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupData.id)
      .eq('user_id', userId)
      .single();
      
    // Only throw error if it's not a "no rows returned" error
    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('Error checking membership:', membershipError);
      throw membershipError;
    }
    
    if (existingMembership) {
      console.log('User is already a member of this group');
      return groupData;
    }

    // Get current member count
    const { count, error: countError } = await supabase
      .from('group_members')
      .select('*', { count: 'exact' })
      .eq('group_id', groupData.id);

    if (countError) {
      console.error('Error getting member count:', countError);
      throw countError;
    }
    
    if (count === null || count >= 5) {
      console.error('Group is full. Current count:', count);
      throw new Error('Group is full or unavailable');
    }

    console.log('Current member count:', count);

    // Add the user as a member
    const { data: newMember, error: memberError } = await supabase
      .from('group_members')
      .insert([{
        group_id: groupData.id,
        user_id: userId,
      }])
      .select()
      .single();

    if (memberError) {
      console.error('Error adding member:', memberError);
      throw memberError;
    }

    if (!newMember) {
      console.error('Failed to add member - no data returned');
      throw new Error('Failed to add member to group');
    }

    console.log('Successfully added member:', newMember);

    // Check if group is now ready
    await checkAndUpdateGroupReadyState(groupData.id);

    // Get updated group data
    const { data: updatedGroup, error: updateError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupData.id)
      .single();

    if (updateError) {
      console.error('Error getting updated group:', updateError);
      throw updateError;
    }

    return updatedGroup || groupData;
  } catch (error) {
    console.error('Error joining group:', error);
    return null;
  }
}

// Add this function to handle video cleanup
async function deleteGroupVideos(groupId: string): Promise<void> {
  try {
    console.log('Attempting to delete videos for group:', groupId);
    
    // List all files in the group's folder
    const { data: files, error: listError } = await supabase.storage
      .from('party_videos')
      .list(groupId);

    if (listError) {
      console.error('Error listing files:', listError);
      throw listError;
    }

    if (files && files.length > 0) {
      console.log('Found files to delete:', files.map(f => f.name));
      
      // Delete all files in the folder
      const filePaths = files.map(file => `${groupId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from('party_videos')
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting files:', deleteError);
        throw deleteError;
      }
    }

    // The folder will be automatically removed when empty
    console.log('Successfully cleaned up videos for group:', groupId);
  } catch (error) {
    console.error('Error deleting group videos:', error);
    throw error;
  }
}

// Add this function to handle leader reassignment
async function reassignGroupLeader(groupId: string, excludeUserId: string): Promise<string | null> {
  try {
    // Get all members sorted by join date (excluding the leaving user)
    const { data: members, error } = await supabase
      .from('group_members')
      .select('user_id, joined_at')
      .eq('group_id', groupId)
      .neq('user_id', excludeUserId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    if (!members || members.length === 0) return null;

    // Get the oldest member (first in the sorted list)
    const newLeaderId = members[0].user_id;

    // Update the group with the new leader
    const { error: updateError } = await supabase
      .from('groups')
      .update({ leader_id: newLeaderId })
      .eq('id', groupId);

    if (updateError) throw updateError;

    return newLeaderId;
  } catch (error) {
    console.error('Error reassigning group leader:', error);
    throw error;
  }
}

// Delete dinner party for a group
export async function deleteDinnerParty(groupId: string): Promise<boolean> {
  try {
    console.log('Deleting dinner party for group:', groupId);
    
    // Delete the dinner party
    const { error } = await supabase
      .from('dinner_parties')
      .delete()
      .eq('group_id', groupId);

    if (error) {
      console.error('Error deleting dinner party:', error);
      throw error;
    }

    console.log('Successfully deleted dinner party for group:', groupId);
    return true;
  } catch (error) {
    console.error('Error deleting dinner party:', error);
    return false;
  }
}

// Update the leaveGroup function with new logic
export async function leaveGroup(userId: string, groupId: string): Promise<boolean> {
  try {
    // First check if user is leader
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('leader_id')
      .eq('id', groupId)
      .single();

    if (groupError) throw groupError;
    if (!groupData) throw new Error('Group not found');

    // If leader is leaving, disband the entire group
    if (groupData.leader_id === userId) {
      console.log('Group leader is leaving, disbanding group:', groupId);
      
      // Step 1: Reset any group relationships
      const { error: resetError } = await supabase
        .from('groups')
        .update({
          accepted_attendee_group_id: null,
          attending_host_group_id: null,
          is_ready: false,
          is_live: false,
          is_locked: false
        })
        .eq('id', groupId);
        
      if (resetError) {
        console.error('Error resetting group relationships:', resetError);
        throw resetError;
      }
      
      // Step 2: Delete any active dinner party
      await deleteDinnerParty(groupId);
      
      // Step 3: Delete all videos from storage
      await deleteGroupVideos(groupId);
      
      // Step 4: Delete all group members
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);
        
      if (membersError) {
        console.error('Error deleting group members:', membersError);
        throw membersError;
      }
      
      // Step 5: Delete any party requests associated with this group
      const { error: requestsError } = await supabase
        .from('party_requests')
        .delete()
        .or(`requesting_group_id.eq.${groupId},host_group_id.eq.${groupId}`);
        
      if (requestsError) {
        console.error('Error deleting party requests:', requestsError);
        // Continue with other operations, don't throw
      }
      
      // Step 6: Delete the group itself
      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (deleteError) {
        console.error('Error deleting group:', deleteError);
        throw deleteError;
      }
      
      console.log('Successfully disbanded group:', groupId);
      return true;
    } else {
      // If regular member is leaving, just remove them from the group
      console.log('Regular member leaving group:', userId);
      
      // Remove the user from the group
      const { error: leaveError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (leaveError) {
        console.error('Error leaving group:', leaveError);
        throw leaveError;
      }
      
      // Check if the group is now empty
      const { data: remainingMembers, error: countError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId);
        
      if (countError) {
        console.error('Error counting remaining members:', countError);
        throw countError;
      }
      
      // If no members left, delete the group
      if (!remainingMembers || remainingMembers.length === 0) {
        console.log('No members left in group, deleting group:', groupId);
        
        // Delete any active dinner party
        await deleteDinnerParty(groupId);
        
        // Delete all videos
        await deleteGroupVideos(groupId);
        
        // Delete any party requests associated with this group
        const { error: requestsError } = await supabase
          .from('party_requests')
          .delete()
          .or(`requesting_group_id.eq.${groupId},host_group_id.eq.${groupId}`);
          
        if (requestsError) {
          console.error('Error deleting party requests:', requestsError);
          // Continue with other operations, don't throw
        }
        
        // Delete the group
        const { error: deleteError } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupId);
          
        if (deleteError) {
          console.error('Error deleting empty group:', deleteError);
          throw deleteError;
        }
      } else {
        // If members remain, check if we need to reassign the leader
        if (groupData.leader_id === userId) {
          const newLeaderId = await reassignGroupLeader(groupId, userId);
          if (!newLeaderId) {
            console.error('Failed to reassign leader for group:', groupId);
            throw new Error('Failed to reassign group leader');
          }
        }
        
        // Check if the group is still ready
        await checkAndUpdateGroupReadyState(groupId);
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error leaving group:', error);
    return false;
  }
}

// Update group profile (videos)
export async function updateGroupProfile(
  groupId: string,
  videoLinks: string[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('groups')
      .update({
        video_links: videoLinks,
        is_live: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating group profile:', error);
    return false;
  }
}

// Get group members with their profiles
export async function getGroupMembers(groupId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        user_id,
        joined_at,
        users:user_id (
          display_name,
          profile_picture_url
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting group members:', error);
    return [];
  }
}

// Create a dinner party
export async function createDinnerParty(
  groupId: string,
  partyDetails: {
    main_dish: string;
    side: string;
    address: string;
    latitude: number;
    longitude: number;
  }
): Promise<DinnerParty | null> {
  try {
    const { data: partyData, error: partyError } = await supabase
      .from('dinner_parties')
      .insert([{
        group_id: groupId,
        ...partyDetails,
      }])
      .select()
      .single();

    if (partyError) throw partyError;
    return partyData;
  } catch (error) {
    console.error('Error creating dinner party:', error);
    return null;
  }
}

// Get active dinner party for a group
export async function getGroupDinnerParty(groupId: string): Promise<DinnerParty | null> {
  try {
    const { data: partyData, error: partyError } = await supabase
      .from('dinner_parties')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .single();

    if (partyError) {
      if (partyError.code === 'PGRST116') return null;
      throw partyError;
    }
    return partyData;
  } catch (error) {
    console.error('Error getting group dinner party:', error);
    return null;
  }
}

// Get all active dinner parties
export async function getActiveDinnerParties(): Promise<Array<{
  party: DinnerParty;
  group: {
    id: string;
    video_links: string[];
    leader: {
      display_name: string;
      profile_picture_url: string;
    };
    members: Array<{
      display_name: string;
      profile_picture_url: string;
    }>;
  };
}>> {
  try {
    // Build the query to get all active dinner parties
    const { data, error } = await supabase
      .from('dinner_parties')
      .select(`
        *,
        group:group_id (
          id,
          video_links,
          leader:leader_id (
            display_name,
            profile_picture_url
          ),
          members:group_members (
            user:user_id (
              display_name,
              profile_picture_url
            )
          )
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data into the expected format
    return (data || []).map(item => ({
      party: {
        id: item.id,
        group_id: item.group_id,
        main_dish: item.main_dish,
        side: item.side,
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at
      },
      group: {
        id: item.group.id,
        video_links: item.group.video_links || [],
        leader: item.group.leader,
        members: item.group.members.map((member: any) => member.user)
      }
    }));
  } catch (error) {
    console.error('Error getting active dinner parties:', error);
    return [];
  }
}

// Check if a group has an attendant
export async function checkGroupHasAttendant(groupId: string): Promise<boolean> {
  try {
    const { data: groupData, error } = await supabase
      .from('groups')
      .select('has_attendant')
      .eq('id', groupId)
      .single();

    if (error) throw error;
    return groupData?.has_attendant || false;
  } catch (error) {
    console.error('Error checking if group has attendant:', error);
    return false;
  }
}

// Check if a request already exists
export async function checkExistingRequest(requestingGroupId: string, hostGroupId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('party_requests')
      .select('id')
      .eq('requesting_group_id', requestingGroupId)
      .eq('host_group_id', hostGroupId)
      .single();

    if (error && error.code === 'PGRST116') return false;
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking existing request:', error);
    return false;
  }
}

// Create a party request
export async function createPartyRequest(requestingGroupId: string, hostGroupId: string): Promise<PartyRequest | null> {
  try {
    // Check if requesting their own party
    if (requestingGroupId === hostGroupId) {
      throw new Error('You cannot request to attend your own dinner party');
    }
    
    // Check if the host group already has an attendant
    const hasAttendant = await checkGroupHasAttendant(hostGroupId);
    if (hasAttendant) {
      throw new Error('This group already has an attendant');
    }

    // Check if requesting group is already attending another party
    const { data: requestingGroup, error: groupError } = await supabase
      .from('groups')
      .select('attending_host_group_id')
      .eq('id', requestingGroupId)
      .single();
      
    if (groupError) throw groupError;
    if (requestingGroup?.attending_host_group_id) {
      throw new Error('Your group is already attending another dinner party');
    }

    // Check if a request already exists
    const hasExistingRequest = await checkExistingRequest(requestingGroupId, hostGroupId);
    if (hasExistingRequest) {
      throw new Error('Your group has already requested to join this party');
    }

    // Create the request
    const { data, error } = await supabase
      .from('party_requests')
      .insert([{
        requesting_group_id: requestingGroupId,
        host_group_id: hostGroupId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating party request:', error);
    throw error;
  }
}

// Update group's has_attendant status
export async function updateGroupHasAttendant(groupId: string, hasAttendant: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('groups')
      .update({ 
        has_attendant: hasAttendant,
        // If setting has_attendant to false, also clear the accepted_attendee_group_id
        ...(hasAttendant === false && { accepted_attendee_group_id: null })
      })
      .eq('id', groupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating group has_attendant status:', error);
    return false;
  }
}

/**
 * Validates if a string is a valid UUID
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Accepts a party request and updates group relationships
 */
export async function acceptPartyRequest(requestId: string): Promise<boolean> {
  try {
    if (!isValidUUID(requestId)) {
      throw new Error('Invalid request ID format');
    }

    // Get the request details
    const { data: request, error } = await supabase
      .from('party_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (error) throw error;
    if (!request) throw new Error('Request not found');
    
    // Validate UUIDs in the request
    if (!isValidUUID(request.host_group_id) || !isValidUUID(request.requesting_group_id)) {
      throw new Error('Invalid group ID format in request');
    }

    // First check if the host group has an attendant already
    const hasAttendant = await checkGroupHasAttendant(request.host_group_id);
    
    if (hasAttendant) {
      throw new Error('This group already has an attendant');
    }

    try {
      // Start by updating host group
      const { error: updateError } = await supabase
        .from('groups')
        .update({
          has_attendant: true,
          accepted_attendee_group_id: request.requesting_group_id
        })
        .eq('id', request.host_group_id);

      if (updateError) throw updateError;

      // Update the requesting group
      const { error: requestingGroupError } = await supabase
        .from('groups')
        .update({
          attending_host_group_id: request.host_group_id
        })
        .eq('id', request.requesting_group_id);

      if (requestingGroupError) {
        // Rollback the host group update if requesting group update fails
        await supabase
          .from('groups')
          .update({
            has_attendant: false,
            accepted_attendee_group_id: null
          })
          .eq('id', request.host_group_id);
        
        throw requestingGroupError;
      }

      // Delete all other requests for this host group
      const { error: deleteError } = await supabase
        .from('party_requests')
        .delete()
        .eq('host_group_id', request.host_group_id);

      if (deleteError) {
        // Rollback both previous updates if delete fails
        await supabase
          .from('groups')
          .update({
            attending_host_group_id: null
          })
          .eq('id', request.requesting_group_id);
          
        await supabase
          .from('groups')
          .update({
            has_attendant: false,
            accepted_attendee_group_id: null
          })
          .eq('id', request.host_group_id);
          
        throw deleteError;
      }

      // Also delete all outgoing requests from the accepted group
      const { error: outgoingDeleteError } = await supabase
        .from('party_requests')
        .delete()
        .eq('requesting_group_id', request.requesting_group_id);

      if (outgoingDeleteError) {
        console.error('Error deleting outgoing requests:', outgoingDeleteError);
        // We don't need to roll back here as this is a cleanup operation
        // The main acceptance is already complete
      }

      return true;
    } catch (innerError) {
      console.error('Error in transaction:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('Error accepting party request:', error);
    return false;
  }
}

// Get party requests for a host group
export async function getPartyRequests(hostGroupId: string): Promise<Array<{
  request: PartyRequest;
  requestingGroup: {
    id: string;
    video_links: string[];
    leader: {
      display_name: string;
      profile_picture_url: string;
    };
    members: Array<{
      display_name: string;
      profile_picture_url: string;
    }>;
  };
}>> {
  try {
    const { data, error } = await supabase
      .from('party_requests')
      .select(`
        *,
        requesting_group:requesting_group_id (
          id,
          video_links,
          leader:leader_id (
            display_name,
            profile_picture_url
          ),
          members:group_members (
            user:user_id (
              display_name,
              profile_picture_url
            )
          )
        )
      `)
      .eq('host_group_id', hostGroupId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(item => ({
      request: {
        id: item.id,
        requesting_group_id: item.requesting_group_id,
        host_group_id: item.host_group_id,
        created_at: item.created_at,
        updated_at: item.updated_at
      },
      requestingGroup: {
        id: item.requesting_group.id,
        video_links: item.requesting_group.video_links || [],
        leader: item.requesting_group.leader,
        members: item.requesting_group.members.map((member: any) => member.user)
      }
    }));
  } catch (error) {
    console.error('Error getting party requests:', error);
    return [];
  }
}

// Clear all party requests for a host group
export async function clearPartyRequests(hostGroupId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('party_requests')
      .delete()
      .eq('host_group_id', hostGroupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error clearing party requests:', error);
    return false;
  }
}

// Modify cancelAttendance function type signature
export async function cancelAttendance(
  groupId: string, 
  cancelType: 'host' | 'attendee'
): Promise<boolean> {
  try {
    // Get the relationship details based on whether the group is host or attendee
    let hostGroupId: string | null = null;
    let attendeeGroupId: string | null = null;
    
    if (cancelType === 'host') {
      // This group is the host, get the attendee group ID
      const { data: hostGroup, error: hostError } = await supabase
        .from('groups')
        .select('accepted_attendee_group_id')
        .eq('id', groupId)
        .single();
      
      if (hostError) throw hostError;
      if (!hostGroup?.accepted_attendee_group_id) return false;
      
      hostGroupId = groupId;
      attendeeGroupId = hostGroup.accepted_attendee_group_id;
    } else {
      // This group is the attendee, get the host group ID
      const { data: attendeeGroup, error: attendeeError } = await supabase
        .from('groups')
        .select('attending_host_group_id')
        .eq('id', groupId)
        .single();
      
      if (attendeeError) throw attendeeError;
      if (!attendeeGroup?.attending_host_group_id) return false;
      
      attendeeGroupId = groupId;
      hostGroupId = attendeeGroup.attending_host_group_id;
    }
    
    // Reset the host group
    if (hostGroupId) {
      const { error: hostResetError } = await supabase
        .from('groups')
        .update({
          has_attendant: false,
          accepted_attendee_group_id: null
        })
        .eq('id', hostGroupId);
      
      if (hostResetError) throw hostResetError;
    }
    
    // Reset the attendee group
    if (attendeeGroupId) {
      const { error: attendeeResetError } = await supabase
        .from('groups')
        .update({
          attending_host_group_id: null
        })
        .eq('id', attendeeGroupId);
      
      if (attendeeResetError) throw attendeeResetError;
    }
    
    return true;
  } catch (error) {
    console.error('Error canceling attendance:', error);
    return false;
  }
}

/**
 * Checks if a dinner party is still active (not in the past)
 */
export async function isDinnerPartyActive(groupId: string): Promise<boolean> {
  try {
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('dinner_time')
      .eq('id', groupId)
      .single();
    
    if (groupError) {
      console.error('Error checking dinner party time:', groupError);
      return false;
    }
    
    if (!groupData || !groupData.dinner_time) {
      return false;
    }
    
    const dinnerTime = new Date(groupData.dinner_time);
    const now = new Date();
    
    // Check if dinner time is in the future or within the last 6 hours
    // (allowing for parties that are currently happening)
    const sixHoursInMs = 6 * 60 * 60 * 1000;
    return dinnerTime.getTime() > (now.getTime() - sixHoursInMs);
  } catch (error) {
    console.error('Error in isDinnerPartyActive:', error);
    return false;
  }
}

/**
 * Gets information about the host group that the user's group is attending
 */
export async function getHostGroupInfo(userGroupId: string): Promise<HostGroupInfo | null> {
  try {
    // First get the user's group to find the host group ID
    const { data: userGroup, error: userGroupError } = await supabase
      .from('groups')
      .select('attending_host_group_id')
      .eq('id', userGroupId)
      .single();
    
    if (userGroupError || !userGroup || !userGroup.attending_host_group_id) {
      return null;
    }
    
    const hostGroupId = userGroup.attending_host_group_id;
    
    // Check if the dinner party is still active
    const isActive = await isDinnerPartyActive(hostGroupId);
    if (!isActive) {
      // Dinner party has passed, automatically cancel the attendance
      await cancelAttendance(userGroupId, 'attendee');
      return null;
    }
    
    // Get the host group details
    const { data: hostGroup, error: hostError } = await supabase
      .from('groups')
      .select(`
        *,
        leader:leader_id (
          id, 
          display_name, 
          profile_picture_url,
          phone_number
        ),
        members:group_members (
          user:user_id (
            id,
            display_name,
            profile_picture_url
          )
        )
      `)
      .eq('id', hostGroupId)
      .single();
      
    if (hostError) throw hostError;
    if (!hostGroup) return null;
    
    // Get the dinner party details
    const { data: dinnerParty, error: partyError } = await supabase
      .from('dinner_parties')
      .select('*')
      .eq('group_id', hostGroupId)
      .single();
      
    if (partyError && partyError.code !== 'PGRST116') throw partyError;
    
    return {
      hostGroup,
      dinnerParty: dinnerParty || null
    };
  } catch (error) {
    console.error('Error getting host group info:', error);
    return null;
  }
}

/**
 * Gets information about the attendee group for a host group
 */
export async function getAttendeeGroupInfo(hostGroupId: string): Promise<AttendeeGroupInfo | null> {
  try {
    // First get the host group to find the attendee group ID
    const { data: hostGroup, error: hostGroupError } = await supabase
      .from('groups')
      .select('accepted_attendee_group_id, dinner_time')
      .eq('id', hostGroupId)
      .single();
    
    if (hostGroupError || !hostGroup || !hostGroup.accepted_attendee_group_id) {
      return null;
    }
    
    // Check if the dinner party is still active
    const isActive = await isDinnerPartyActive(hostGroupId);
    if (!isActive) {
      // Dinner party has passed, automatically clean up the relationship
      await cancelAttendance(hostGroupId, 'host');
      return null;
    }
    
    // Get the attendee group details
    const { data: attendeeGroup, error: attendeeError } = await supabase
      .from('groups')
      .select(`
        *,
        leader:leader_id (
          id, 
          display_name, 
          profile_picture_url
        ),
        members:group_members (
          user:user_id (
            id,
            display_name,
            profile_picture_url
          )
        )
      `)
      .eq('id', hostGroup.accepted_attendee_group_id)
      .single();
      
    if (attendeeError) throw attendeeError;
    if (!attendeeGroup) return null;
    
    return {
      attendeeGroup
    };
  } catch (error) {
    console.error('Error getting attendee group info:', error);
    return null;
  }
}