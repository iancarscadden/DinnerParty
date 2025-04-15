import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Image, Dimensions, ScrollView, Animated as RNAnimated, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedScrollHandler,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeGlow } from './SwipeGlow';
import { ExpandableVideo } from './ExpandableVideo';
import { VideoVisibilityTracker } from './VideoVisibilityTracker';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const TAB_BAR_HEIGHT = 49;
const VIDEO_HEIGHT = width * 0.8;
const SWIPE_DURATION = 400;
const FADE_DURATION = 300;
const SPRING_CONFIG = {
  stiffness: 100,
  damping: 20,
};

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
  profilePic: string;
}

interface GroupCardProps {
  group: {
    members: GroupMember[];
    videoLinks: string[];
  };
  brightness: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isActive: boolean;
  glowOpacity: SharedValue<number>;
  translateX: SharedValue<number>;
}

const MIN_HEADER_HEIGHT = 70;
const MAX_HEADER_HEIGHT = 120;
const MIN_FONT_SIZE = 24;
const MAX_FONT_SIZE = 32;

export function GroupCard({ 
  group, 
  brightness, 
  onSwipeLeft, 
  onSwipeRight, 
  isActive,
  glowOpacity,
  translateX 
}: GroupCardProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [activeAudioIndex, setActiveAudioIndex] = useState(0);
  const [visibilityMap, setVisibilityMap] = useState<Record<number, number>>({});
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [currentScrollY, setCurrentScrollY] = useState(0);
  const scrollY = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isActive ? 1 : 0.9);
  const opacity = useSharedValue(isActive ? 1 : 0);
  const headerHeight = useSharedValue(MIN_HEADER_HEIGHT);
  const titleScale = useSharedValue(1);
  const insets = useSafeAreaInsets();
  const contextStartX = useSharedValue(0);
  const contextStartY = useSharedValue(0);
  
  const CARD_HEIGHT = height * 0.8 - (TAB_BAR_HEIGHT + insets.bottom);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1, SPRING_CONFIG);
      opacity.value = withSpring(1, { duration: FADE_DURATION });
    } else {
      scale.value = withSpring(0.9, SPRING_CONFIG);
      opacity.value = withSpring(0, { duration: FADE_DURATION });
    }
  }, [isActive]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextStartX.value = translateX.value;
      contextStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (!isScrolling) {
        translateX.value = contextStartX.value + event.translationX;
        translateY.value = contextStartY.value + event.translationY;
        if (Math.abs(event.translationX) > 0) {
          glowOpacity.value = withTiming(1, { 
            duration: 150,
          });
        } else {
          glowOpacity.value = withTiming(0, { 
            duration: 200,
          });
        }
      }
    })
    .onEnd((event) => {
      if (!isScrolling) {
        if (Math.abs(event.velocityX) > 120) {
          if (event.velocityX > 0) {
            // Move card to position showing intent to accept
            translateX.value = withSpring(width * 0.7, {
              ...SPRING_CONFIG,
              velocity: event.velocityX,
            });
            translateY.value = withSpring(0, {  // Reset Y position when showing intent
              ...SPRING_CONFIG,
              velocity: 0,
            });
            runOnJS(onSwipeRight)();
          } else {
            // Left swipe - proceed as before
            translateX.value = withSpring(Math.sign(event.velocityX) * width * 1.5, {
              ...SPRING_CONFIG,
              velocity: event.velocityX,
            });
            translateY.value = withSpring(0, {  // Reset Y position when exiting
              ...SPRING_CONFIG,
              velocity: 0,
            });
            opacity.value = withSpring(0, { duration: FADE_DURATION });
            glowOpacity.value = withTiming(0, { duration: 200 });
            runOnJS(onSwipeLeft)();
          }
        } else {
          // Return to center
          translateX.value = withSpring(0, {
            ...SPRING_CONFIG,
            velocity: -event.velocityX,  // Use opposite velocity for natural return
          });
          translateY.value = withSpring(0, {
            ...SPRING_CONFIG,
            velocity: -event.velocityY,  // Use opposite velocity for natural return
          });
          glowOpacity.value = withTiming(0, { duration: 200 });
        }
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, 
      [-width/2, 0, width/2],
      [-30, 0, 30]
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      runOnJS(setCurrentScrollY)(event.contentOffset.y);
    },
  });

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

  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [-100, 0],
      [MAX_HEADER_HEIGHT, MIN_HEADER_HEIGHT],
      'clamp'
    );

    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.4, 1],
      'clamp'
    );

    return {
      height,
      transform: [{ scale }],
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const fontSize = interpolate(
      scrollY.value,
      [-100, 0],
      [MAX_FONT_SIZE, MIN_FONT_SIZE],
      'clamp'
    );

    return {
      fontSize,
      transform: [{ 
        scale: 1
      }],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.mainCardContainer, cardStyle, { height: CARD_HEIGHT }]}>
        <View style={styles.card}>
          <Animated.ScrollView
            style={styles.cardScroll}
            showsVerticalScrollIndicator={true}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => setIsScrolling(true)}
            onScrollEndDrag={() => setIsScrolling(false)}
            onMomentumScrollEnd={() => setIsScrolling(false)}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setScrollViewHeight(height);
            }}
          >
            <Animated.View style={[styles.cardHeader, headerStyle]}>
              <Animated.Text 
                style={[styles.cardTitle, titleStyle]}
                allowFontScaling={false}
              >
                {group.members[0].name}'s Group
              </Animated.Text>
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
                    isAudioEnabled={index === activeAudioIndex && isActive}
                    brightness={brightness}
                    shouldPlay={isActive}
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

            {/* Member profiles section with adaptive layout based on count */}
            {group.members.length > 0 && (
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
            )}
          </Animated.ScrollView>
          <SwipeGlow translateX={translateX} glowOpacity={glowOpacity} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  mainCardContainer: {
    position: 'absolute',
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
    position: 'relative',
  },
  cardHeader: {
    height: MIN_HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: MIN_FONT_SIZE,
    fontWeight: '600',
    color: '#4B2E83',
    textAlign: 'center',
  },
  cardScroll: {
    flex: 1,
  },
  videosContainer: {
    padding: 15,
    paddingTop: 5,
    gap: 15,
  },
  membersSection: {
    marginTop: 10,
    marginBottom: 30,
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