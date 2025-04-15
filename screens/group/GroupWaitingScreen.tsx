import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  ActivityIndicator, 
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Alert,
  Clipboard
} from 'react-native';
import { getGroupMembers, leaveGroup, lockGroup } from '../../services/groups';
import { getUserProfile } from '../../services/users';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

interface GroupWaitingScreenProps {
  groupId: string;
  joinCode: string;
  leaderId: string;
  onLeaveGroup?: () => void;
  parentRefreshing?: boolean;
  onParentRefresh?: () => void;
}

export function GroupWaitingScreen({ 
  groupId, 
  joinCode, 
  leaderId, 
  onLeaveGroup,
  parentRefreshing = false,
  onParentRefresh
}: GroupWaitingScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const router = useRouter();
  const [members, setMembers] = useState<Array<{
    user_id: string;
    users: {
      display_name: string;
      profile_picture_url: string;
    };
  }>>([]);

  useEffect(() => {
    loadMembers();
    
    // Setup real-time subscriptions
    const setupSubscription = () => {
      if (subscribed) return;
      
      console.log('Setting up GroupWaitingScreen real-time subscriptions for group:', groupId);
      
      // Subscribe to group_members changes
      const memberSubscription = supabase
        .channel('waiting_member_updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`
        }, () => {
          console.log('Group members changed in waiting screen, reloading members');
          loadMembers(false); // Don't show loading indicator for real-time updates
        })
        .subscribe();

      // Subscribe to groups changes
      const groupSubscription = supabase
        .channel('waiting_group_updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'groups',
          filter: `id=eq.${groupId}`
        }, (payload) => {
          console.log('Group updated in waiting screen:', payload.new);
          
          // If group becomes locked, automatically navigate to setup
          if (payload.new.is_locked) {
            console.log('Group is now locked, refreshing to show setup screen');
            router.replace('/(tabs)/social');
          }
        })
        .subscribe();

      setSubscribed(true);
      
      return () => {
        memberSubscription.unsubscribe();
        groupSubscription.unsubscribe();
        setSubscribed(false);
      };
    };
    
    setupSubscription();
    
    // Cleanup on unmount
    return () => {
      if (subscribed) {
        console.log('Cleaning up GroupWaitingScreen subscriptions');
        supabase.channel('waiting_member_updates').unsubscribe();
        supabase.channel('waiting_group_updates').unsubscribe();
        setSubscribed(false);
      }
    };
  }, [groupId]);

  // Add effect to respond to parent refreshing state
  useEffect(() => {
    if (parentRefreshing) {
      loadMembers();
    }
  }, [parentRefreshing]);

  const loadMembers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const memberData = await getGroupMembers(groupId);
      setMembers(memberData);
      setIsReady(memberData.length >= 3);

      // Check group state
      const { data: groupData } = await supabase
        .from('groups')
        .select('is_locked, is_ready')
        .eq('id', groupId)
        .single();

      if (groupData?.is_locked) {
        // If group is locked, move to setup screen
        router.replace('/(tabs)/social');
        return;
      }

      // If member count is 0, user has left the group
      if (memberData.length === 0) {
        if (onLeaveGroup) {
          onLeaveGroup();
        }
        router.replace('/(tabs)/social');
        return;
      }
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (isLeaving) return;

    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLeaving(true);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('No user found');

              const success = await leaveGroup(user.id, groupId);
              if (!success) throw new Error('Failed to leave group');
              
              // Call onLeaveGroup to reset parent state
              if (onLeaveGroup) {
                onLeaveGroup();
              }
              // Navigate back to social tab which will show InitialGroupScreen
              router.replace('/(tabs)/social');
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group');
            } finally {
              setIsLeaving(false);
            }
          }
        }
      ]
    );
  };

  const handleMakeProfile = async () => {
    if (isLocking) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No user found');
        return;
      }

      // Check if user is leader
      if (user.id !== leaderId) {
        Alert.alert(
          'Not Authorized',
          'Only the leader can initialize a group',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Initialize Group',
        'Are you sure you want to initialize the group? New members will not be able to join.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Continue',
            onPress: async () => {
              try {
                setIsLocking(true);
                const success = await lockGroup(groupId);
                if (!success) {
                  throw new Error('Failed to lock group');
                }
                // Force a refresh of the group state by calling loadMembers
                // This will trigger the parent GroupScreen to update and show GroupSetupScreen
                loadMembers();
              } catch (error) {
                console.error('Error locking group:', error);
                Alert.alert('Error', 'Failed to initialize group');
              } finally {
                setIsLocking(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error checking leader status:', error);
      Alert.alert('Error', 'Failed to verify leader status');
    }
  };

  const handleCopyCode = () => {
    Clipboard.setString(joinCode);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const isLeader = leaderId === members.find(m => m.user_id === leaderId)?.user_id;

  const onRefresh = useCallback(() => {
    console.log('GroupWaitingScreen - Manual refresh triggered');
    if (onParentRefresh) {
      // Use parent's refresh function if available
      onParentRefresh();
    } else {
      // Otherwise use local refresh
      setRefreshing(true);
      loadMembers();
    }
  }, [onParentRefresh]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={parentRefreshing || refreshing}
          onRefresh={onRefresh}
          tintColor="#4B2E83"
          colors={["#4B2E83"]}
        />
      }
    >
      <View style={styles.codeContainer}>
        <View style={styles.codeContent}>
          <View style={styles.codeTextContainer}>
            <Text style={styles.codeLabel}>Your Group Code:</Text>
            <Text style={styles.codeText}>{joinCode}</Text>
          </View>
          <TouchableOpacity 
            style={styles.copyButton}
            onPress={handleCopyCode}
          >
            {isCopied ? (
              <Text style={styles.copiedText}>Copied!</Text>
            ) : (
              <Ionicons name="document-text-outline" size={28} color="#4B2E83" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.membersContainer}>
        {/* Top row - 3 members */}
        <View style={styles.memberRow}>
          {[...Array(3)].map((_, index) => (
            <View key={`top-${index}`} style={styles.memberSlot}>
              {members[index] ? (
                <>
                  <Image
                    source={{ uri: members[index].users.profile_picture_url }}
                    style={styles.profilePic}
                    fadeDuration={0}
                  />
                  <Text style={styles.memberName}>
                    {members[index].users.display_name}
                  </Text>
                  {members[index].user_id === leaderId && (
                    <Text style={styles.leaderTag}>Leader</Text>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.placeholderPic} />
                  <Text style={styles.waitingText}>Waiting...</Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Bottom row - 2 members */}
        <View style={styles.memberRow}>
          {[...Array(2)].map((_, index) => (
            <View key={`bottom-${index}`} style={styles.memberSlot}>
              {members[index + 3] ? (
                <>
                  <Image
                    source={{ uri: members[index + 3].users.profile_picture_url }}
                    style={styles.profilePic}
                    fadeDuration={0}
                  />
                  <Text style={styles.memberName}>
                    {members[index + 3].users.display_name}
                  </Text>
                  {members[index + 3].user_id === leaderId && (
                    <Text style={styles.leaderTag}>Leader</Text>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.placeholderPic} />
                  <Text style={styles.waitingText}>Waiting...</Text>
                </>
              )}
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sneakyLinkText}>
        This ain't no sneaky link, get at least 3 members to move on
      </Text>

      <View style={styles.messageContainer}>
        <TouchableOpacity
          style={[
            styles.initializeButton,
            (!isReady || isLocking) && styles.disabledButton
          ]}
          onPress={handleMakeProfile}
          disabled={!isReady || isLocking}
        >
          <Text style={styles.initializeButtonText}>
            {isLocking ? 'Initializing...' : 'Initialize Group'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Spacer to push leave button to bottom */}
      <View style={styles.spacer} />

      <TouchableOpacity
        style={[styles.leaveButton, isLeaving && styles.disabledButton]}
        onPress={handleLeaveGroup}
        disabled={isLeaving}
      >
        <Text style={styles.leaveButtonText}>
          {isLeaving ? 'Leaving...' : 'Leave Group'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeContainer: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 30,
  },
  codeContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  codeTextContainer: {
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  codeText: {
    fontSize: 32,
    color: '#4B2E83',
    fontWeight: '600',
    letterSpacing: 4,
  },
  copyButton: {
    padding: 8,
    position: 'absolute',
    right: 0,
  },
  copiedText: {
    color: '#4B2E83',
    fontSize: 14,
    fontWeight: '600',
  },
  membersContainer: {
    gap: 20,
    marginBottom: 15,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  memberSlot: {
    alignItems: 'center',
    width: 100,
    height: 140,
    justifyContent: 'center',
  },
  profilePic: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    marginBottom: 8,
  },
  placeholderPic: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: '#E5E5E5',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 17,
    color: '#4B2E83',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  leaderTag: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  waitingText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  messageContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sneakyLinkText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
  initializeButton: {
    backgroundColor: '#4B2E83',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  initializeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4B2E83',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  leaveButtonText: {
    color: '#4B2E83',
    fontSize: 16,
    fontWeight: '600',
  },
}); 