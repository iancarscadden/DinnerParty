import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Image, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpandableVideo } from './ExpandableVideo';
import { VideoVisibilityTracker } from './VideoVisibilityTracker';
import throttle from 'lodash.throttle';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const VIDEO_HEIGHT = width * 0.8;
const TAB_BAR_HEIGHT = 49;

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

interface GroupMember {
  name: string;
  profilePic: keyof typeof PROFILE_PICS | string;
}

interface MapGroupCardProps {
  group: {
    hostName: string;
    members: GroupMember[];
    menu: {
      entree: string;
      sides: string[];
    };
    videoLinks?: string[];
  };
  brightness: number;
  onClose: () => void;
  onRequestAttend: () => void;
  userGroup: {
    group: {
      id: string;
      leader_id: string;
    } | null;
    isLeader: boolean;
  };
}

export function MapGroupCard({ 
  group,
  brightness,
  onClose,
  onRequestAttend,
  userGroup
}: MapGroupCardProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [activeAudioIndex, setActiveAudioIndex] = useState(0);
  const [visibilityMap, setVisibilityMap] = useState<Record<number, number>>({});
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [currentScrollY, setCurrentScrollY] = useState(0);
  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();

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

  // Cleanup effect for animations
  useEffect(() => {
    return () => {
      translateX.value = 0;
      cardOpacity.value = 1;
    };
  }, []);

  // Reset card animation state
  const resetCard = () => {
    translateX.value = withSpring(0);
    cardOpacity.value = withSpring(1);
  };

  // Handle scroll events
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      runOnJS(setCurrentScrollY)(event.contentOffset.y);
    },
  });

  const handleRequestAttend = () => {
    // Proceed with request confirmation
    Alert.alert(
      'Request to Attend',
      'Are you sure you want to apply to this dinner party?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => {
            resetCard(); // Use the new resetCard function
          }
        },
        {
          text: 'Yes',
          onPress: () => {
            // Animate the card away
            translateX.value = withTiming(width, { duration: 300 });
            cardOpacity.value = withTiming(0, { duration: 300 }, () => {
              runOnJS(onRequestAttend)();
            });
          }
        }
      ]
    );
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isScrolling) {
        translateX.value = event.translationX;
        const progress = Math.min(Math.abs(event.translationX) / (width / 2), 1);
        cardOpacity.value = 1 - progress * 0.5;
      }
    })
    .onEnd((event) => {
      if (!isScrolling) {
        if (event.translationX < -width * 0.3) {
          // Swipe left to close
          translateX.value = withTiming(-width, { duration: 300 });
          cardOpacity.value = withTiming(0, { duration: 300 }, () => {
            runOnJS(onClose)();
          });
        } else if (event.translationX > width * 0.3) {
          // Swipe right to request
          runOnJS(handleRequestAttend)();
        } else {
          // Return to center
          translateX.value = withSpring(0);
          cardOpacity.value = withSpring(1);
        }
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width/2, 0, width/2],
      [-30, 0, 30]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` }
      ],
      opacity: cardOpacity.value,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        style={[
          styles.mainCardContainer, 
          cardStyle, 
          {
            height: height - TAB_BAR_HEIGHT - insets.bottom - (insets.top + 60),
            top: insets.top + 20,
          }
        ]}
      >
        <View style={styles.card}>
          <Animated.ScrollView
            style={styles.cardScroll}
            showsVerticalScrollIndicator={true}
            onScrollBeginDrag={() => setIsScrolling(true)}
            onScrollEndDrag={() => setIsScrolling(false)}
            onMomentumScrollEnd={() => setIsScrolling(false)}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setScrollViewHeight(height);
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.headerText}>Dinner Party</Text>
              <Text style={styles.reportText}>Report</Text>
            </View>

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
                    tabName="map"
                  />
                ))
              ) : (
                <View style={styles.noVideosContainer}>
                  <Text style={styles.noVideosText}>No videos available</Text>
                </View>
              )}
            </View>

            <View style={styles.menuContainer}>
              <Text style={styles.menuTitle}>Menu</Text>
              <Text style={styles.menuItem}>Entrée: {group.menu.entree}</Text>
              <Text style={styles.menuItem}>Sides: {group.menu.sides.join(', ')}</Text>
            </View>

            {/* Member profiles section with adaptive layout based on count */}
            {group.members.length > 0 && (
              <View style={styles.membersSection}>
                <View style={styles.membersContainer}>
                  {/* For any group size, show first 3 members (or fewer) in top row */}
                  {group.members.slice(0, Math.min(3, group.members.length)).map((member, index) => (
                    <View key={`top-${index}`} style={styles.memberItem}>
                      <Image
                        source={
                          typeof member.profilePic === 'string' && !Object.keys(PROFILE_PICS).includes(member.profilePic)
                            ? { uri: member.profilePic }
                            : PROFILE_PICS[member.profilePic as keyof typeof PROFILE_PICS]
                        }
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
                          source={
                            typeof member.profilePic === 'string' && !Object.keys(PROFILE_PICS).includes(member.profilePic)
                              ? { uri: member.profilePic }
                              : PROFILE_PICS[member.profilePic as keyof typeof PROFILE_PICS]
                          }
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
            )}
          </Animated.ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>← Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.requestButton} onPress={onRequestAttend}>
              <Text style={styles.requestButtonText}>Request to Attend →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  mainCardContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
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
  cardHeader: {
    padding: 20,
    paddingBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 4,
  },
  reportText: {
    position: 'absolute',
    top: 12,
    right: 15,
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  dateTime: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 5,
  },
  videosContainer: {
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 15,
    gap: 15,
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
    paddingTop: 0,
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
    marginBottom: 90,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 10,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    gap: 10,
  },
  closeButton: {
    flex: 1,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  requestButton: {
    flex: 1,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#4B2E83',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noVideosContainer: {
    height: VIDEO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  noVideosText: {
    fontSize: 16,
    color: '#666',
  },
  secondRowContainer: {
    marginTop: 20,
    paddingBottom: 0,
  },
  singleItemSecondRow: {
    justifyContent: 'center',
  },
}); 