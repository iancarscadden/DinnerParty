import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, useColorScheme, Appearance } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
// Adjust this multiplier to control video height:
// - Increase the number (e.g., 0.8) to make videos taller
// - Decrease the number (e.g., 0.4) to make videos shorter
const VIDEO_HEIGHT = width * 1.0; // Current setting makes videos 60% of screen width

// Update profile pictures with correct paths and types
const PROFILE_PICS = {
  ian: require('../assets/images/profile-pic.jpg'),
  eli: require('../assets/images/eli-profile.jpg'),
  adam: require('../assets/images/adam-profile.jpg'),
} as const;

// Update video sources with correct paths
const VIDEO_SOURCES = [
  require('../assets/videos/video1.mp4'),
  require('../assets/videos/video2.mp4'),
  require('../assets/videos/video3.mp4'),
] as const;

interface GroupProfileModalProps {
  onClose: () => void;
  onHide: () => void;
  onRequestAttend: () => void;
  groupData: {
    hostName: string;
    members: Array<{
      name: string;
      profilePic: keyof typeof PROFILE_PICS;
    }>;
    date: string;
    time: string;
    menu: {
      entree: string;
      sides: string[];
    };
  };
}

export default function GroupProfileModal({
  onClose,
  onHide,
  onRequestAttend,
  groupData,
}: GroupProfileModalProps) {
  const [videoLoadingStates, setVideoLoadingStates] = useState<boolean[]>([true, true, true]);
  const [videoErrorStates, setVideoErrorStates] = useState<boolean[]>([false, false, false]);
  const colorScheme = useColorScheme();
  const [brightness, setBrightness] = useState(1);

  // Update brightness based on color scheme
  useEffect(() => {
    const updateBrightness = () => {
      const isDark = Appearance.getColorScheme() === 'dark';
      setBrightness(isDark ? 0.7 : 1); // Reduce brightness in dark mode
    };

    updateBrightness();
    const subscription = Appearance.addChangeListener(updateBrightness);

    return () => {
      subscription.remove();
    };
  }, []);

  // Preload images when component mounts
  useEffect(() => {
    groupData.members.forEach(member => {
      Image.prefetch(Image.resolveAssetSource(PROFILE_PICS[member.profilePic]).uri);
    });
  }, []);

  const handleVideoLoad = (index: number, status: AVPlaybackStatus) => {
    if ('isLoaded' in status && status.isLoaded) {
      setVideoLoadingStates(prev => {
        const newStates = [...prev];
        newStates[index] = false;
        return newStates;
      });
    } else {
      setVideoErrorStates(prev => {
        const newStates = [...prev];
        newStates[index] = true;
        return newStates;
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{groupData.hostName}'s Dinner Party</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="chevron-forward" size={28} color="#4B2E83" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.videosContainer}>
          {VIDEO_SOURCES.map((video, index) => (
            <View key={index} style={styles.videoWrapper}>
              {videoLoadingStates[index] && !videoErrorStates[index] && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4B2E83" />
                </View>
              )}
              {videoErrorStates[index] ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={24} color="#666" />
                  <Text style={styles.errorText}>Failed to load video</Text>
                </View>
              ) : (
                <View style={[styles.videoContainer, { opacity: brightness }]}>
                  <Video
                    source={video}
                    style={styles.video}
                    shouldPlay={true}
                    isLooping={true}
                    isMuted={true}
                    useNativeControls={false}
                    resizeMode={ResizeMode.COVER}
                    onLoad={(status) => handleVideoLoad(index, status)}
                    onError={() => handleVideoLoad(index, { isLoaded: false })}
                    progressUpdateIntervalMillis={1000}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.dateTime}>
          {groupData.time} {groupData.date}
        </Text>

        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Menu</Text>
          <Text style={styles.menuItem}>Entrée: {groupData.menu.entree}</Text>
          {groupData.menu.sides.map((side, index) => (
            <Text key={index} style={styles.menuItem}>• {side}</Text>
          ))}
        </View>

        <View style={styles.membersContainer}>
          {groupData.members.map((member, index) => (
            <View key={index} style={styles.memberItem}>
              <Image 
                source={PROFILE_PICS[member.profilePic]}
                style={styles.profilePic}
                fadeDuration={0}
              />
              <Text style={styles.memberName}>{member.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.hideButton} onPress={onHide}>
          <Text style={styles.hideButtonText}>Hide Party</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.requestButton} onPress={onRequestAttend}>
          <Text style={styles.requestButtonText}>Request to Attend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: height * 0.7, // Increased from 0.6 for taller modal
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    height: 60, // Fixed height for header
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    position: 'relative',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4B2E83',
    textAlign: 'center',
    position: 'absolute',
    left: 60, // Space for back button
    right: 60, // Space for symmetry
  },
  closeButton: {
    height: 60, // Match header height
    width: 60, // Fixed width
    position: 'absolute',
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  videosContainer: {
    padding: 15,
    gap: 15,
  },
  videoWrapper: {
    width: '100%',
    height: VIDEO_HEIGHT, // Using the increased height
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    marginBottom: 15,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000', // Added to ensure consistent background
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000', // Changed to black for better video display
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  dateTime: {
    fontSize: 17,
    textAlign: 'center',
    color: '#666',
    marginVertical: 15,
  },
  menuContainer: {
    padding: 15,
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 8,
  },
  menuItem: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  membersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    marginTop: 10,
  },
  memberItem: {
    alignItems: 'center',
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  memberName: {
    fontSize: 17, // Increased from 15
    color: '#4B2E83',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 15,
    paddingBottom: 20, // Extra padding at bottom
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    gap: 12,
  },
  hideButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#666',
    alignItems: 'center',
  },
  requestButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  hideButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 