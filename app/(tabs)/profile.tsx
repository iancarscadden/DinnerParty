import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withSpring,
} from 'react-native-reanimated';
import { supabase } from '../../services/supabase';
import { getCachedUserProfile, clearUserProfileCache } from '../../services/users';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function ProfileScreen() {
  const scrollY = useSharedValue(0);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    profilePicture: any;
  }>({
    name: '',
    email: '',
    profilePicture: require('../../assets/images/profile-pic.jpg'),
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const cachedProfile = await getCachedUserProfile();
      
      if (cachedProfile) {
        setProfileData({
          name: cachedProfile.displayName,
          email: cachedProfile.email,
          profilePicture: { uri: cachedProfile.profilePictureUrl }
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearUserProfileCache(); // Clear the cache before signing out
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            console.log('Delete account pressed');
          }
        }
      ]
    );
  };

  const handleReportBug = () => {
    console.log('Report bug pressed');
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const imageStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.3, 1],
      { extrapolateRight: 'clamp' }
    );

    return {
      transform: [{ scale }],
    };
  });

  const nameStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.2, 1],
      { extrapolateRight: 'clamp' }
    );

    return {
      transform: [{ scale }],
      opacity: interpolate(
        scrollY.value,
        [-50, 0],
        [1.2, 1],
        { extrapolateRight: 'clamp' }
      ),
    };
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings" size={28} color="#4B2E83" />
        </TouchableOpacity>
        
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
        >
          <View style={styles.header}>
            <AnimatedImage
              source={profileData.profilePicture}
              style={[styles.profilePicture, imageStyle]}
            />
            <Animated.Text style={[styles.name, nameStyle]}>{profileData.name}</Animated.Text>
            <Text style={styles.email}>{profileData.email}</Text>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.button} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color="#4B2E83" />
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={24} color="#4B2E83" />
              <Text style={styles.buttonText}>Delete Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleReportBug}>
              <Ionicons name="bug-outline" size={24} color="#4B2E83" />
              <Text style={styles.buttonText}>Report a Bug</Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 8,
  },
  email: {
    fontSize: 18,
    color: '#666',
  },
  section: {
    padding: 20,
    paddingTop: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginBottom: 15,
  },
  buttonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4B2E83',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    backgroundColor: '#fff',
  },
  link: {
    color: '#4B2E83',
    textDecorationLine: 'underline',
  },
}); 