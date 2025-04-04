import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert, RefreshControl, ScrollView } from 'react-native';
import { getUserGroup, type Group } from '../services/groups';
import { supabase } from '../services/supabase';
import { InitialGroupScreen } from './group/InitialGroupScreen';
import { GroupSetupScreen } from './group/GroupSetupScreen';
import { GroupProfileScreen } from './group/GroupProfileScreen';
import { GroupWaitingScreen } from './group/GroupWaitingScreen';

export default function GroupScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [subscribed, setSubscribed] = useState(false);

  // Setup subscription when component mounts
  useEffect(() => {
    setupSubscription();
    
    return () => {
      // Cleanup subscription on unmount
      cleanupSubscription();
    };
  }, []);

  // Load initial state
  useEffect(() => {
    loadGroupState();
  }, []);

  const setupSubscription = () => {
    if (subscribed) return;
    
    // Subscribe to group_members changes to detect when members join/leave
    const memberSubscription = supabase
      .channel('group_member_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_members',
      }, () => {
        console.log('Group members changed, refreshing state');
        loadGroupState();
      })
      .subscribe();

    // Subscribe to groups changes to detect when group status changes
    const groupSubscription = supabase
      .channel('group_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'groups',
      }, () => {
        console.log('Group updated, refreshing state');
        loadGroupState();
      })
      .subscribe();

    setSubscribed(true);
    
    return () => {
      memberSubscription.unsubscribe();
      groupSubscription.unsubscribe();
      setSubscribed(false);
    };
  };

  const cleanupSubscription = () => {
    // This is a placeholder for cleanup logic
    // The actual cleanup happens in the useEffect return function
    setSubscribed(false);
  };

  const loadGroupState = async () => {
    try {
      if (!refreshing) setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, cannot load group state');
        return;
      }

      console.log('Loading group state for user:', user.id);
      const { group: userGroup, isLeader: userIsLeader } = await getUserGroup(user.id);
      
      if (userGroup) {
        // Get member count
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact' })
          .eq('group_id', userGroup.id);

        console.log('Group loaded:', userGroup);
        console.log('Is leader:', userIsLeader);
        console.log('Member count:', count);
        console.log('Group locked:', userGroup.is_locked);

        setMemberCount(count || 0);
        setGroup(userGroup);
        setIsLeader(userIsLeader);
      } else {
        console.log('No group found for user');
        setGroup(null);
        setIsLeader(false);
        setMemberCount(0);
      }
    } catch (error) {
      console.error('Error loading group state:', error);
      Alert.alert('Error', 'Failed to load group data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('Manual refresh triggered');
    setRefreshing(true);
    loadGroupState();
  }, []);

  const handleGroupJoined = () => {
    console.log('Group joined, refreshing state');
    loadGroupState();
  };

  const handleProfileComplete = () => {
    console.log('Profile completed, refreshing state');
    loadGroupState();
  };

  const handleLeaveGroup = () => {
    console.log('handleLeaveGroup called');
    // Reset all group-related state
    setGroup(null);
    setIsLeader(false);
    setMemberCount(0);
    // Force a refresh of the group state
    loadGroupState();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
      </View>
    );
  }

  // Render the appropriate screen based on group state
  const renderContent = () => {
    if (!group) {
      return <InitialGroupScreen 
        onGroupJoined={handleGroupJoined} 
        parentRefreshing={refreshing}
        onParentRefresh={onRefresh}
      />;
    }

    // Show waiting screen if group is not locked
    if (!group.is_locked) {
      return (
        <GroupWaitingScreen
          groupId={group.id}
          joinCode={group.join_code}
          leaderId={group.leader_id}
          onLeaveGroup={handleLeaveGroup}
          parentRefreshing={refreshing}
          onParentRefresh={onRefresh}
        />
      );
    }

    // Show setup screen when group is locked but not live
    if (!group.is_live) {
      return (
        <GroupSetupScreen
          groupId={group.id}
          memberCount={memberCount}
          joinCode={group.join_code}
          onProfileComplete={handleProfileComplete}
          onLeaveGroup={handleLeaveGroup}
          parentRefreshing={refreshing}
          onParentRefresh={onRefresh}
        />
      );
    }

    console.log('Rendering GroupProfileScreen with:', {
      group,
      isLeader,
      memberCount
    });

    return (
      <GroupProfileScreen
        group={group}
        isLeader={isLeader}
        onLeaveGroup={handleLeaveGroup}
        parentRefreshing={refreshing}
        onParentRefresh={onRefresh}
      />
    );
  };

  // Wrap the content in a ScrollView with RefreshControl if it's not the InitialGroupScreen
  return group ? (
    <View style={styles.container}>
      {renderContent()}
    </View>
  ) : (
    renderContent()
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 