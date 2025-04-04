import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const TAB_BAR_HEIGHT = 49;
const VIDEO_HEIGHT = width * 1.0;
const MIN_HEADER_HEIGHT = 120;
const MAX_HEADER_HEIGHT = 180;
const MIN_FONT_SIZE = 24;
const MAX_FONT_SIZE = 32;

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
    date: string;
    time: string;
    menu: {
      entree: string;    // From dinner_parties.main_dish
      sides: string[];   // From dinner_parties.side (will need to be split if multiple)
    };
  };
  brightness: number;
  onCancelAttendance: () => void;
}

export function AttendGroupCard({ 
  group,
  brightness,
  onCancelAttendance
}: AttendGroupCardProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollY = useSharedValue(0);
  const headerHeight = useSharedValue(MIN_HEADER_HEIGHT);
  const insets = useSafeAreaInsets();
  
  const CARD_HEIGHT = height * 0.8 - (TAB_BAR_HEIGHT + insets.bottom);

  const handlePhonePress = () => {
    Linking.openURL(`tel:${group.phoneNumber}`);
  };

  const formatPhoneNumber = (phone: string) => {
    return `(${phone.slice(0,3)})-${phone.slice(3,6)}-${phone.slice(6)}`;
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
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
      [22, 18],
      'clamp'
    );

    return {
      fontSize,
    };
  });

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
        >
          <Animated.View style={[styles.cardHeader, headerStyle]}>
            <Animated.Text 
              style={[styles.headerText, headerTextStyle]}
              allowFontScaling={false}
            >
              You're going!
            </Animated.Text>
            <Animated.Text style={[styles.subHeaderText, subHeaderTextStyle]}>
              {/* Will display hosting group's leader name from group.leader.display_name */}
              Message {group.hostName} at
            </Animated.Text>
            <TouchableOpacity 
              style={styles.phoneNumberContainer}
              onPress={handlePhonePress}
            >
              {/* Will display hosting group's leader phone from group.leader.phone_number */}
              <Text style={styles.phoneNumberText}>
                {formatPhoneNumber(group.phoneNumber)}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.videosContainer}>
            {/* Videos will be loaded from group_videos table, linked to the hosting group */}
            {/* Each video will be stored in Supabase storage and referenced by URL */}
            {/* Example structure in database:
                group_videos {
                  id: uuid
                  group_id: uuid (references groups.id)
                  video_url: string (Supabase storage URL)
                  created_at: timestamp
                }
            */}
          </View>

          <Text style={styles.dateTime}>
            {group.time} {group.date}
          </Text>

          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Menu</Text>
            {/* Menu items from dinner_parties table */}
            <Text style={styles.menuItem}>Entrée: {group.menu.entree}</Text>
            <Text style={styles.menuItem}>Sides: {group.menu.sides.join(', ')}</Text>
          </View>

          <View style={styles.membersContainer}>
            {/* Members will be loaded from group_members table of the hosting group */}
            {/* Profile pictures will be loaded from user.profile_picture_url */}
            {/* Example structure:
                group_members {
                  id: uuid
                  group_id: uuid (references groups.id)
                  user_id: uuid (references auth.users.id)
                  joined_at: timestamp
                }
            */}
            {group.members.map((member, index) => (
              <View key={index} style={styles.memberItem}>
                <Image
                  source={{ uri: member.profilePic }}
                  style={styles.profilePic}
                  fadeDuration={0}
                />
                <Text style={styles.memberName}>{member.name}</Text>
              </View>
            ))}
          </View>

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
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  phoneNumberContainer: {
    backgroundColor: '#4B2E83',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
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
  cancelButtonContainer: {
    padding: 15,
    paddingBottom: 30,
    marginTop: 20,
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
}); 