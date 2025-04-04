import React, { useState } from 'react';
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
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const VIDEO_HEIGHT = width * 0.8;
const TAB_BAR_HEIGHT = 49;

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
  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const insets = useSafeAreaInsets();

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
            translateX.value = withSpring(0);
            cardOpacity.value = withSpring(1);
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
          >
            <View style={styles.cardHeader}>
              <Text style={styles.headerText}>Dinner Party</Text>
            </View>

            <View style={styles.videosContainer}>
              {group.videoLinks && group.videoLinks.length > 0 ? (
                group.videoLinks.map((videoUrl, index) => (
                  <View key={index} style={styles.videoWrapper}>
                    <View style={[styles.videoContainer, { opacity: brightness }]}>
                      <Video
                        source={{ uri: videoUrl }}
                        style={styles.video}
                        shouldPlay={true}
                        isLooping={true}
                        isMuted={true}
                        useNativeControls={false}
                        resizeMode={ResizeMode.COVER}
                      />
                    </View>
                  </View>
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

            <View style={styles.membersContainer}>
              {group.members.map((member, index) => (
                <View key={index} style={styles.memberItem}>
                  <Image
                    source={
                      typeof member.profilePic === 'string' && !Object.keys(PROFILE_PICS).includes(member.profilePic)
                        ? { uri: member.profilePic }
                        : PROFILE_PICS[member.profilePic as keyof typeof PROFILE_PICS]
                    }
                    style={styles.profilePic}
                    fadeDuration={0}
                  />
                  <Text style={styles.memberName}>{member.name}</Text>
                </View>
              ))}
            </View>
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
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 8,
  },
  dateTime: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 5,
  },
  videosContainer: {
    padding: 15,
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
  membersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    marginTop: 10,
    marginBottom: 90,
  },
  memberItem: {
    alignItems: 'center',
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
  },
  memberName: {
    fontSize: 17,
    color: '#4B2E83',
    fontWeight: '500',
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
}); 