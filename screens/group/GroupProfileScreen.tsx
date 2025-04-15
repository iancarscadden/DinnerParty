import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Image, ActivityIndicator, Alert, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { useColorScheme, Appearance } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Group, getGroupMembers, leaveGroup } from '../../services/groups';
import { useRouter } from 'expo-router';
import { useAuth } from '../../services/auth';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS
} from 'react-native-reanimated';
import { VideoVisibilityTracker } from '../../components/VideoVisibilityTracker';

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = width * 0.8;

interface GroupProfileScreenProps {
  group: Group;
  isLeader: boolean;
  onLeaveGroup: () => void;
  parentRefreshing?: boolean;
  onParentRefresh?: () => void;
}

interface GroupMemberWithProfile {
  user_id: string;
  joined_at: string;
  users: {
    display_name: string;
    profile_picture_url: string;
  };
}

export function GroupProfileScreen({ 
  group, 
  isLeader, 
  onLeaveGroup,
  parentRefreshing = false,
  onParentRefresh
}: GroupProfileScreenProps) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [brightness, setBrightness] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentScrollY, setCurrentScrollY] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [activeAudioIndex, setActiveAudioIndex] = useState(0);
  const [visibilityMap, setVisibilityMap] = useState<Record<number, number>>({});
  const scrollY = useSharedValue(0);
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuth();

  // Scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      runOnJS(setCurrentScrollY)(event.contentOffset.y);
    },
  });

  // Log initial props and auth state once on component mount
  useEffect(() => {
    // Debug logs for initial props and state
    console.log('GroupProfileScreen - Initial Props:', { group, isLeader });
    console.log('GroupProfileScreen - Auth State:', { session, authLoading });
  }, []);

  useEffect(() => {
    console.log('GroupProfileScreen - Effect triggered with:', {
      authLoading,
      hasSession: !!session?.user,
      hasGroup: !!group?.id
    });

    if (authLoading) {
      console.log('GroupProfileScreen - Still loading auth...');
      return;
    }

    if (!session?.user) {
      console.log('GroupProfileScreen - No session, redirecting to welcome');
      router.replace('/onboarding/welcome');
      return;
    }

    if (group?.id) {
      console.log('GroupProfileScreen - Loading members for group:', group.id);
      loadMembers();
    } else {
      console.log('GroupProfileScreen - No group ID available');
    }

    updateBrightness();
    const subscription = Appearance.addChangeListener(updateBrightness);
    return () => subscription.remove();
  }, [authLoading, session, group?.id]);

  // Add effect to respond to parent refreshing state
  useEffect(() => {
    if (parentRefreshing && group?.id) {
      console.log('GroupProfileScreen - Parent refresh triggered');
      loadMembers();
    }
  }, [parentRefreshing, group?.id]);

  const updateBrightness = () => {
    const isDark = Appearance.getColorScheme() === 'dark';
    setBrightness(isDark ? 0.7 : 1);
  };

  const loadMembers = async () => {
    if (!group?.id) {
      console.log('GroupProfileScreen - loadMembers called without group ID');
      return;
    }
    
    console.log('GroupProfileScreen - Starting loadMembers for group:', group.id);
    try {
      const memberData = await getGroupMembers(group.id);
      console.log('GroupProfileScreen - Received member data:', memberData);
      
      const sortedMembers = memberData.sort((a, b) => {
        if (a.user_id === group.leader_id) return -1;
        if (b.user_id === group.leader_id) return 1;
        return 0;
      });
      
      console.log('GroupProfileScreen - Setting sorted members:', sortedMembers);
      setMembers(sortedMembers);
    } catch (error) {
      console.error('GroupProfileScreen - Error loading members:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      console.log('GroupProfileScreen - Finishing loadMembers, setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!session?.user?.id || !group?.id) {
      Alert.alert('Error', 'Unable to leave group at this time. Please try again.');
      return;
    }

    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this dinner party? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const success = await leaveGroup(session.user.id, group.id);
              if (success) {
                onLeaveGroup();
                router.replace('/(tabs)/social');
              } else {
                throw new Error('Failed to leave group');
              }
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave the group. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(() => {
    console.log('GroupProfileScreen - Manual refresh triggered');
    if (onParentRefresh) {
      // Use parent's refresh function if available
      onParentRefresh();
    } else {
      // Otherwise use local refresh
      setRefreshing(true);
      loadMembers();
    }
  }, [onParentRefresh, group?.id]);

  // Handle visibility changes for videos
  const handleVisibilityChange = useCallback((index: number, visibilityPercentage: number) => {
    setVisibilityMap(prev => {
      // Only update if there's a significant change
      if (Math.abs((prev[index] || 0) - visibilityPercentage) > 5) {
        return {
          ...prev,
          [index]: visibilityPercentage
        };
      }
      return prev;
    });
  }, []);

  // Track which video has the highest visibility for audio
  useEffect(() => {
    if (Object.keys(visibilityMap).length === 0) return;

    // Find the video with the highest visibility
    let maxVisibility = 0;
    let maxVisibilityIndex = 0;

    Object.entries(visibilityMap).forEach(([indexStr, visibility]) => {
      const index = parseInt(indexStr, 10);
      if (visibility > maxVisibility) {
        maxVisibility = visibility;
        maxVisibilityIndex = index;
      }
    });

    // Only switch active audio if visibility is significant
    if (maxVisibility > 25) {
      setActiveAudioIndex(maxVisibilityIndex);
    }
  }, [visibilityMap]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
      </View>
    );
  }

  return (
    <Animated.ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={parentRefreshing || refreshing}
          onRefresh={onRefresh}
          tintColor="#4B2E83"
          colors={["#4B2E83"]}
          title="Pull to refresh"
          titleColor="#4B2E83"
        />
      }
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        setScrollViewHeight(height);
      }}
    >
      <Text style={styles.headerText}>Your Group</Text>

      <View style={styles.videosContainer}>
        {group.video_links && group.video_links.length > 0 ? (
          group.video_links.map((video, index) => (
            <VideoVisibilityTracker
              key={index}
              videoUrl={video}
              index={index}
              scrollY={currentScrollY}
              scrollViewHeight={scrollViewHeight}
              onVisibilityChange={handleVisibilityChange}
              isAudioEnabled={index === activeAudioIndex}
              brightness={brightness}
              shouldPlay={true}
              isLooping={true}
              videoHeight={VIDEO_HEIGHT}
              unmutedInExpanded={true}
              tabName="social"
            />
          ))
        ) : (
          <View style={styles.noVideoContainer}>
            <Text style={styles.noVideoText}>No videos available</Text>
          </View>
        )}
      </View>

      <View style={styles.membersContainer}>
        {members.map((member, index) => (
          <View key={index} style={styles.memberItem}>
            <Image
              source={{ uri: member.users.profile_picture_url }}
              style={styles.profilePic}
              fadeDuration={0}
            />
            <Text style={styles.memberName}>{member.users.display_name}</Text>
            {member.user_id === group.leader_id && (
              <Text style={styles.leaderTag}>Leader</Text>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.leaveButton, isLoading && styles.disabledButton]}
        onPress={handleLeaveGroup}
        disabled={isLoading}
      >
        <Text style={styles.leaveButtonText}>
          {isLoading ? 'Leaving...' : 'Leave Group'}
        </Text>
      </TouchableOpacity>
    </Animated.ScrollView>
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
  headerText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4B2E83',
    marginBottom: 20,
    textAlign: 'center',
  },
  videosContainer: {
    gap: 15,
    marginBottom: 30,
  },
  videoContainer: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  noVideoContainer: {
    height: VIDEO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginVertical: 10,
  },
  noVideoText: {
    fontSize: 16,
    color: '#666',
  },
  membersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 20,
    marginBottom: 30,
  },
  memberItem: {
    alignItems: 'center',
    width: 100,
  },
  profilePic: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
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
  leaveButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#4B2E83',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
    alignSelf: 'center',
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