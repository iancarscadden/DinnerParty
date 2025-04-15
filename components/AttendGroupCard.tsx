import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Image, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  useAnimatedScrollHandler,
  runOnJS,
  withTiming,
  withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpandableVideo } from './ExpandableVideo';
import { VideoVisibilityTracker } from './VideoVisibilityTracker';
import { useAudio } from '../contexts/AudioContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const TAB_BAR_HEIGHT = 49;
const VIDEO_HEIGHT = width * 0.8;
const MIN_HEADER_HEIGHT = 120;
const MAX_HEADER_HEIGHT = 180;
const MIN_FONT_SIZE = 24;
const MAX_FONT_SIZE = 32;

// Calculate responsive profile picture size based on card width
// Leave margins between pictures and account for 3 pictures in a row
const PROFILE_PIC_SIZE = Math.min(120, (CARD_WIDTH - 60) / 3);
const PROFILE_PIC_MARGIN = 5;

// Pre-define profile pictures
const PROFILE_PICS = {
  ian: require('../assets/images/profile-pic.jpg'),
  eli: require('../assets/images/eli-profile.jpg'),
  adam: require('../assets/images/adam-profile.jpg'),
} as const;

// Pre-define video sources
const VIDEO_SOURCES = [
  require('../assets/videos/video1.mp4'),
  require('../assets/videos/video2.mp4'),
  require('../assets/videos/video3.mp4'),
] as const;

interface GroupMember {
  name: string;
  profilePic: string; // Will come from user.profile_picture_url in the database
}

interface AttendGroupCardProps {
  group: {
    hostName: string;     // From hosting group's leader.display_name
    phoneNumber: string;  // From hosting group's leader.phone_number
    members: GroupMember[]; // Array of members from the hosting group's members table
    menu: {
      entree: string;    // From dinner_parties.main_dish
      sides: string[];   // From dinner_parties.side (will need to be split if multiple)
    };
    videoLinks?: string[]; // Array of video URLs
  };
  brightness: number;
  onCancelAttendance: () => void;
  screenContext?: 'host' | 'attend'; // New prop to indicate which screen is using the card
}

export function AttendGroupCard({ 
  group,
  brightness,
  onCancelAttendance,
  screenContext = 'attend' // Default to attend screen context
}: AttendGroupCardProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [activeAudioIndex, setActiveAudioIndex] = useState(0);
  const [visibilityMap, setVisibilityMap] = useState<Record<number, number>>({});
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [currentScrollY, setCurrentScrollY] = useState(0);
  const scrollY = useSharedValue(0);
  const headerHeight = useSharedValue(MIN_HEADER_HEIGHT);
  const insets = useSafeAreaInsets();
  
  const CARD_HEIGHT = height * 0.8 - (TAB_BAR_HEIGHT + insets.bottom);

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

  // Track which video has the highest visibility
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

  const handlePhonePress = () => {
    Linking.openURL(`sms:${group.phoneNumber}`);
  };

  const formatPhoneNumber = (phone: string) => {
    return `(${phone.slice(0,3)})-${phone.slice(3,6)}-${phone.slice(6)}`;
  };

  // Updated scroll handler with runOnJS to ensure state updates happen on JS thread
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      runOnJS(setCurrentScrollY)(event.contentOffset.y);
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [-100, 0],
      [MAX_HEADER_HEIGHT, MIN_HEADER_HEIGHT],
      'clamp'
    );

    return {
      height,
    };
  });

  const headerTextStyle = useAnimatedStyle(() => {
    const fontSize = interpolate(
      scrollY.value,
      [-100, 0],
      [MAX_FONT_SIZE, MIN_FONT_SIZE],
      'clamp'
    );

    return {
      fontSize,
    };
  });

  const subHeaderTextStyle = useAnimatedStyle(() => {
    const fontSize = interpolate(
      scrollY.value,
      [-100, 0],
      [20, 16],
      'clamp'
    );

    return {
      fontSize,
    };
  });

  // Function to get the appropriate header text based on the screen context
  const getHeaderText = () => {
    return screenContext === 'host' ? 'You have guests!' : 'You\'re accepted!';
  };

  // Function to get the appropriate subheader text based on the screen context
  const getSubHeaderText = () => {
    return screenContext === 'host' 
      ? `Let's get this gc going, message ${group.hostName} at:`
      : `Let's get this gc going, message ${group.hostName} at:`;
  };

  // Function to check if we should show the phone number section
  const shouldShowPhoneNumber = () => {
    return group.phoneNumber && group.phoneNumber !== '0000000000';
  };

  return (
    <View style={[styles.mainCardContainer, { height: CARD_HEIGHT }]}>
      <View style={styles.card}>
        <Animated.ScrollView
          style={styles.cardScroll}
          showsVerticalScrollIndicator={true}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => setIsScrolling(true)}
          onScrollEndDrag={() => setIsScrolling(false)}
          onMomentumScrollEnd={() => setIsScrolling(false)}
          contentContainerStyle={styles.scrollContent}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setScrollViewHeight(height);
          }}
        >
          <Animated.View style={[styles.cardHeader, headerStyle]}>
            <Animated.Text 
              style={[styles.headerText, headerTextStyle]}
              allowFontScaling={false}
            >
              {getHeaderText()}
            </Animated.Text>
            <Animated.Text style={[styles.subHeaderText, subHeaderTextStyle]}>
              {getSubHeaderText()}
            </Animated.Text>

            {/* Phone number section conditionally shown */}
            {shouldShowPhoneNumber() && (
              <TouchableOpacity 
                style={styles.phoneNumberContainer}
                onPress={handlePhonePress}
              >
                <View style={styles.phoneButtonContent}>
                  <Ionicons name="chatbubble-outline" size={18} color="#fff" style={styles.messageIcon} />
                  <Text style={styles.phoneNumberText}>
                    {formatPhoneNumber(group.phoneNumber)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>

          <View style={styles.videosContainer}>
            {group.videoLinks && group.videoLinks.length > 0 ? (
              group.videoLinks.map((videoUrl, index) => (
                <VideoVisibilityTracker
                  key={index}
                  videoUrl={videoUrl}
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

          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Menu</Text>
            {/* Only show menu items that aren't TBD */}
            {group.menu.entree !== 'TBD' && (
              <Text style={styles.menuItem}>Entrée: {group.menu.entree}</Text>
            )}
            {group.menu.sides[0] !== 'TBD' && (
              <Text style={styles.menuItem}>Sides: {group.menu.sides.join(', ')}</Text>
            )}
            {group.menu.entree === 'TBD' && group.menu.sides[0] === 'TBD' && (
              <Text style={styles.menuItem}>Menu details will appear here</Text>
            )}
          </View>

          {/* Member profiles section with adaptive layout based on count */}
          {group.members && group.members.length > 0 ? (
            <View style={styles.membersSection}>
              <View style={styles.membersContainer}>
                {/* For any group size, show first 3 members (or fewer) in top row */}
                {group.members.slice(0, Math.min(3, group.members.length)).map((member, index) => (
                  <View key={`top-${index}`} style={styles.memberItem}>
                    <Image
                      source={{ uri: member.profilePic }}
                      style={styles.profilePic}
                      fadeDuration={0}
                    />
                    <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
                      {member.name}
                    </Text>
                  </View>
                ))}
              </View>
              
              {/* Second row for when there are 4 or 5 members */}
              {group.members.length > 3 && (
                <View style={[
                  styles.membersContainer, 
                  styles.secondRowContainer,
                  group.members.length === 4 && styles.singleItemSecondRow
                ]}>
                  {group.members.slice(3).map((member, index) => (
                    <View 
                      key={`bottom-${index}`} 
                      style={[
                        styles.memberItem,
                        // Adjust width for second row based on number of members
                        group.members.length === 4 ? { width: CARD_WIDTH - 80 } : { width: (CARD_WIDTH - 40) / 2 }
                      ]}
                    >
                      <Image
                        source={{ uri: member.profilePic }}
                        style={styles.profilePic}
                        fadeDuration={0}
                      />
                      <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
                        {member.name}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {/* Cancel button placed right after members */}
          <View style={styles.cancelButtonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onCancelAttendance}
            >
              <Text style={styles.cancelButtonText}>Cancel on them</Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainCardContainer: {
    width: CARD_WIDTH,
    shadowColor: '#000',
    shadowOffset: {
      width: 8,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  cardHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerText: {
    fontSize: MIN_FONT_SIZE,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 10,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  phoneNumberContainer: {
    backgroundColor: '#4B2E83',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  phoneButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageIcon: {
    marginRight: 6,
  },
  phoneNumberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  videosContainer: {
    padding: 15,
    gap: 15,
    marginTop: 15,
  },
  videoWrapper: {
    width: '100%',
    height: VIDEO_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    marginBottom: 15,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
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
  membersSection: {
    marginTop: 10,
    marginBottom: 5,
  },
  membersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  memberItem: {
    alignItems: 'center',
    width: (CARD_WIDTH - 40) / 3,
    paddingHorizontal: PROFILE_PIC_MARGIN,
  },
  profilePic: {
    width: PROFILE_PIC_SIZE,
    height: PROFILE_PIC_SIZE,
    borderRadius: PROFILE_PIC_SIZE / 2,
    marginBottom: 10,
  },
  memberName: {
    fontSize: 16,
    color: '#4B2E83',
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelButtonContainer: {
    padding: 15,
    paddingBottom: 15,
    marginTop: 10,
    marginBottom: 0,
  },
  cancelButton: {
    backgroundColor: '#DC3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondRowContainer: {
    marginTop: 20,
  },
  singleItemSecondRow: {
    justifyContent: 'center',
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
}); 