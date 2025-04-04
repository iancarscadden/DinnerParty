# Map Request Feature Implementation Documentation

## Overview
This document details the implementation of the dinner party request feature, which allows group leaders to request to attend other groups' dinner parties through the map interface.

## Database Structure

### Party Requests Table
```sql
CREATE TABLE party_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requesting_group_id UUID NOT NULL,
    host_group_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_requesting_group
      FOREIGN KEY (requesting_group_id) REFERENCES groups (id),
    CONSTRAINT fk_host_group
      FOREIGN KEY (host_group_id) REFERENCES groups (id)
);
```

### Groups Table Modification
Added new field:
- `has_attendant`: boolean - Indicates if a group has accepted another group to attend their party

## TypeScript Interfaces

### PartyRequest Interface
```typescript
export interface PartyRequest {
  id: string;
  requesting_group_id: string;
  host_group_id: string;
  created_at: string;
  updated_at: string;
}
```

### Updated Group Interface
```typescript
export interface Group {
  // ... existing fields ...
  has_attendant: boolean;
  // ... other fields ...
}
```

## Core Functions Implementation

### 1. Check Group Attendant Status
```typescript
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
```

### 2. Check Existing Requests
```typescript
export async function checkExistingRequest(
  requestingGroupId: string, 
  hostGroupId: string
): Promise<boolean> {
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
```

### 3. Create Party Request
```typescript
export async function createPartyRequest(
  requestingGroupId: string, 
  hostGroupId: string
): Promise<PartyRequest | null> {
  try {
    // Check if host group has attendant
    const hasAttendant = await checkGroupHasAttendant(hostGroupId);
    if (hasAttendant) {
      throw new Error('This group already has an attendant');
    }

    // Check for existing request
    const hasExistingRequest = await checkExistingRequest(requestingGroupId, hostGroupId);
    if (hasExistingRequest) {
      throw new Error('Your group has already requested to join this party');
    }

    // Create request
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
```

### 4. Update Group Attendant Status
```typescript
export async function updateGroupHasAttendant(
  groupId: string, 
  hasAttendant: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('groups')
      .update({ 
        has_attendant: hasAttendant,
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
```

### 5. Accept Party Request
```typescript
export async function acceptPartyRequest(requestId: string): Promise<boolean> {
  try {
    // Get request details
    const { data: request, error: requestError } = await supabase
      .from('party_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) throw new Error('Request not found');

    // Update host group
    await supabase
      .from('groups')
      .update({
        has_attendant: true,
        accepted_attendee_group_id: request.requesting_group_id
      })
      .eq('id', request.host_group_id);

    // Update requesting group
    await supabase
      .from('groups')
      .update({
        attending_host_group_id: request.host_group_id
      })
      .eq('id', request.requesting_group_id);

    // Clean up other requests
    await supabase
      .from('party_requests')
      .delete()
      .eq('host_group_id', request.host_group_id);

    return true;
  } catch (error) {
    console.error('Error accepting party request:', error);
    return false;
  }
}
```

## Map Screen Implementation

### Request Handler in map.tsx
```typescript
const handleRequestAttend = async (hostGroupId: string) => {
  try {
    // Validation checks
    if (!userGroup.group) {
      Alert.alert("No Group", "You need to be in a group to request to attend.");
      return;
    }

    if (!userGroup.isLeader) {
      Alert.alert("Not Group Leader", "Only the group leader can request to attend.");
      return;
    }

    // Create request
    await createPartyRequest(userGroup.group.id, hostGroupId);
    
    Alert.alert(
      "Request Sent",
      "Your request to join this dinner party has been sent!",
      [{ text: "OK", onPress: () => setSelectedParty(null) }]
    );
  } catch (error: any) {
    Alert.alert("Error", error.message || 'Failed to send request.');
  }
};
```

## Request Flow
1. User taps a dinner party pin on the map
2. MapGroupCard displays with party details
3. User clicks "Request to Attend"
4. System checks:
   - User is not requesting their own party
   - User has a group
   - User is the group leader
   - Host group doesn't have an attendant
   - No existing request from this group
5. If all checks pass:
   - Creates new party request
   - Shows success message
   - Closes MapGroupCard

## Error Handling
- Comprehensive error handling at each step
- User-friendly error messages
- Proper error logging for debugging
- Transaction-like operations for data consistency

## Future Considerations
1. Implement request expiration
2. Add request cancellation functionality
3. Implement notifications for request status changes
4. Add request queue management for popular dinner parties 