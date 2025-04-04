import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image, RefreshControl, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { updateGroupProfile, getGroupMembers, leaveGroup } from '../../services/groups';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../services/supabase';
import { useRouter } from 'expo-router';

interface GroupSetupScreenProps {
  groupId: string;
  memberCount: number;
  onProfileComplete: () => void;
  joinCode: string;
  onLeaveGroup?: () => void;
  parentRefreshing?: boolean;
  onParentRefresh?: () => void;
}

interface GroupMember {
  user_id: string;
  users: {
    display_name: string;
    profile_picture_url: string;
  };
}

const { width } = Dimensions.get('window');
const VIDEO_HEIGHT = width * 0.8;

async function uploadVideo(uri: string, groupId: string, index: number): Promise<string> {
  try {
    // Convert video to base64
    const response = await fetch(uri);
    const blob = await response.blob();
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          const fileExt = 'mp4';
          const fileName = `${Date.now()}_${index}.${fileExt}`;
          const filePath = `${groupId}/${fileName}`;

          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from('party_videos')
            .upload(filePath, decode(base64Data), {
              contentType: 'video/mp4',
              upsert: true
            });

          if (error) throw error;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('party_videos')
            .getPublicUrl(filePath);

          resolve(publicUrl);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

export function GroupSetupScreen({ 
  groupId, 
  memberCount, 
  onProfileComplete, 
  joinCode, 
  onLeaveGroup,
  parentRefreshing = false,
  onParentRefresh
}: GroupSetupScreenProps) {
  const [videos, setVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadMembers();
  }, []);

  // Add effect to respond to parent refreshing state
  useEffect(() => {
    if (parentRefreshing) {
      loadMembers();
    }
  }, [parentRefreshing]);

  const loadMembers = async () => {
    try {
      const memberData = await getGroupMembers(groupId);
      setMembers(memberData);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found during member load');
        return;
      }

      // Check if current user is the leader (first member)
      const isUserLeader = memberData[0]?.user_id === user?.id;
      setIsLeader(isUserLeader);

      // Get group state
      const { data: groupData } = await supabase
        .from('groups')
        .select('is_locked, is_live, is_ready')
        .eq('id', groupId)
        .single();

      // If group is not locked or member count drops below 3, go back to waiting screen
      if (!groupData?.is_locked || memberData.length < 3) {
        router.replace('/(tabs)/social');
        return;
      }

      // If group is live, move to profile screen
      if (groupData?.is_live) {
        router.replace('/(tabs)/social');
        return;
      }

      // Update member count if it doesn't match
      if (memberData.length !== memberCount) {
        console.log('Updating member count:', { 
          previous: memberCount, 
          current: memberData.length 
        });
        // If we're in an inconsistent state, force navigation back to social
        if (memberData.length === 0) {
          router.replace('/(tabs)/social');
          return;
        }
      }
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setLoadingMembers(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('GroupSetupScreen - Manual refresh triggered');
    if (onParentRefresh) {
      // Use parent's refresh function if available
      onParentRefresh();
    } else {
      // Otherwise use local refresh
      setRefreshing(true);
      loadMembers();
    }
  }, [onParentRefresh]);

  const handleAddVideo = async () => {
    if (videos.length >= memberCount) {
      Alert.alert('Error', `You can only add up to ${memberCount} videos (one per member)`);
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Error', 'Permission to access media library is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 30,
      });

      if (!result.canceled && result.assets[0].uri) {
        setVideos([...videos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (videos.length !== memberCount) {
      Alert.alert(
        'Incorrect Video Count', 
        `Please add exactly ${memberCount} videos (one for each member). Currently have ${videos.length} videos.`
      );
      return;
    }

    if (members.length !== memberCount) {
      Alert.alert(
        'Error',
        'Member count mismatch. Please refresh the page or contact support.'
      );
      return;
    }

    try {
      setLoading(true);
      
      // Upload all videos to Supabase Storage
      const uploadPromises = videos.map((video, index) => 
        uploadVideo(video, groupId, index)
      );

      const videoUrls = await Promise.all(uploadPromises);

      const success = await updateGroupProfile(groupId, videoUrls);
      if (success) {
        onProfileComplete();
      } else {
        Alert.alert('Error', 'Failed to save group profile');
      }
    } catch (error) {
      console.error('Error saving group profile:', error);
      Alert.alert('Error', 'Failed to save group profile. Please try again.');
    } finally {
      setLoading(false);
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
              if (!user) {
                Alert.alert('Error', 'User session not found');
                return;
              }
              
              const success = await leaveGroup(user.id, groupId);
              if (success) {
                // First call onLeaveGroup to reset parent state
                if (onLeaveGroup) {
                  onLeaveGroup();
                }
                // Then navigate back to social tab
                // The parent GroupScreen will show InitialGroupScreen because group state is null
                router.replace('/(tabs)/social');
              } else {
                throw new Error('Failed to leave group');
              }
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

  if (loading || loadingMembers) {
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
      <View style={styles.membersContainer}>
        {members.map((member, index) => (
          <View key={index} style={styles.memberItem}>
            <Image
              source={{ uri: member.users.profile_picture_url }}
              style={styles.profilePic}
            />
            <Text style={styles.memberName}>{member.users.display_name}</Text>
            {member.user_id === members[0]?.user_id && (
              <Text style={styles.leaderTag}>Leader</Text>
            )}
          </View>
        ))}
      </View>

      {isLeader ? (
        <>
          <Text style={styles.headerText}>
            Add {memberCount} Videos
          </Text>
          <Text style={styles.subHeaderText}>
            One video for each group member
          </Text>

          <View style={styles.videoList}>
            {videos.map((video, index) => (
              <View key={index} style={styles.videoContainer}>
                <Video
                  source={{ uri: video }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  isLooping
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveVideo(index)}
                >
                  <Ionicons name="close-circle" size={28} color="#DC3545" />
                </TouchableOpacity>
              </View>
            ))}

            {videos.length < memberCount && (
              <TouchableOpacity
                style={[styles.addButton, { height: VIDEO_HEIGHT }]}
                onPress={handleAddVideo}
              >
                <Ionicons name="add-circle" size={32} color="#4B2E83" />
                <Text style={styles.addButtonText}>Add Video</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              videos.length !== memberCount && styles.buttonDisabled
            ]}
            onPress={handleSave}
            disabled={videos.length !== memberCount}
          >
            <Text style={styles.saveButtonText}>Save Profile</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>
            Waiting for the leader to add videos...
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.leaveButton, isLeaving && styles.buttonDisabled]}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  membersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 30,
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  memberItem: {
    alignItems: 'center',
    marginBottom: 16,
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
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  waitingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    color: '#4B2E83',
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  videoList: {
    flex: 1,
  },
  videoContainer: {
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: VIDEO_HEIGHT,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  addButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4B2E83',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#4B2E83',
    fontSize: 16,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#4B2E83',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
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
    marginBottom: 10,
  },
  leaveButtonText: {
    color: '#4B2E83',
    fontSize: 16,
    fontWeight: '600',
  },
}); 