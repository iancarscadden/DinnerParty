import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { supabase } from '../../services/supabase';
import { 
  getCachedUserProfile, 
  clearUserProfileCache, 
  updateCachedUserProfile,
  updateUserProfile 
} from '../../services/users';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { FontAwesome } from '@expo/vector-icons';
import PrivacyPolicyModal from '../../components/PrivacyPolicyModal';
import TermsOfServiceModal from '../../components/TermsOfServiceModal';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function ProfileScreen() {
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    profilePicture: any;
  }>({
    name: '',
    email: '',
    profilePicture: require('../../assets/images/profile-pic.jpg'),
  });
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastIsError, setToastIsError] = useState(false);
  const fadeAnim = useSharedValue(1);
  
  // Modal visibility states
  const [privacyPolicyVisible, setPrivacyPolicyVisible] = useState(false);
  const [termsOfServiceVisible, setTermsOfServiceVisible] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Effect to animate toast
  useEffect(() => {
    if (toastVisible) {
      fadeAnim.value = withTiming(1, { duration: 300 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 300 });
    }
  }, [toastVisible]);

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

  const handleChangeProfilePicture = async () => {
    try {
      // Request permission to access media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        showToast('Please grant media library access to change your profile picture', true);
        return;
      }
      
      // Launch image picker with specific settings
      console.log('Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      
      console.log('Image picker result received');
      
      if (result.canceled) {
        console.log('Image picking canceled by user');
        return;
      }
      
      const selectedImage = result.assets[0];
      if (!selectedImage.base64) {
        console.error('No base64 data received from image picker');
        showToast('Failed to process the selected image', true);
        return;
      }
      
      // Create base64 data URL
      const base64Image = `data:image/jpeg;base64,${selectedImage.base64}`;
      console.log('Image selected with base64 data');
      
      // Upload the image
      await uploadProfilePicture(base64Image);
    } catch (error) {
      console.error('Error changing profile picture:', error);
      showToast('Failed to change profile picture', true);
    }
  };

  const uploadProfilePicture = async (base64Image: string) => {
    try {
      setUploading(true);
      
      // Get user ID from session
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      console.log('Processing image for upload...');
      
      // Extract base64 data
      const base64Data = base64Image.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid image data');
      }
      
      // Define the path: {userId}/profile.jpg
      const filePath = `${userId}/profile.jpg`;
      
      console.log('Uploading profile picture to:', filePath);
      
      // Upload to Supabase storage - overwrite existing file if it exists
      let uploadAttempts = 0;
      const maxUploadAttempts = 3;
      let uploadError = null;
      
      // Retry upload a few times in case of network issues
      while (uploadAttempts < maxUploadAttempts) {
        uploadAttempts++;
        try {
          console.log(`Upload attempt ${uploadAttempts}/${maxUploadAttempts}...`);
          
          const { error } = await supabase.storage
            .from('profiles')
            .upload(filePath, decode(base64Data), {
              contentType: 'image/jpeg',
              upsert: true,
            });
          
          if (!error) {
            console.log('Upload successful on attempt', uploadAttempts);
            uploadError = null;
            break; // Success, exit the retry loop
          }
          
          uploadError = error;
          console.error(`Upload error on attempt ${uploadAttempts}:`, error);
          
          if (uploadAttempts < maxUploadAttempts) {
            // Wait before retrying (exponential backoff)
            const delayMs = 1000 * Math.pow(2, uploadAttempts - 1);
            console.log(`Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (e) {
          uploadError = e;
          console.error(`Upload exception on attempt ${uploadAttempts}:`, e);
        }
      }
      
      if (uploadError) {
        console.error('All upload attempts failed:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL of the uploaded image with a cache busting parameter
      const timestamp = new Date().getTime();
      const { data: publicUrlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(`${filePath}?t=${timestamp}`);
      
      const newProfileImageUrl = publicUrlData.publicUrl;
      console.log('Profile picture URL:', newProfileImageUrl);
      
      // Update user record in the database with the new profile picture URL
      console.log('Updating user record in database...');
      try {
        await updateUserProfile(userId, {
          profile_picture_url: newProfileImageUrl
        });
        console.log('User record updated successfully in database');
        
        // Reload the user profile to ensure we have the latest data
        await loadUserProfile();
      } catch (dbError) {
        console.error('Failed to update user record in database:', dbError);
        throw new Error('Failed to update profile in database');
      }
      
      // Update user profile with new image URL
      setProfileData(prev => ({
        ...prev,
        profilePicture: { uri: newProfileImageUrl }
      }));
      
      // Update the cached profile
      const cachedProfile = await getCachedUserProfile();
      if (cachedProfile) {
        await updateCachedUserProfile({
          ...cachedProfile,
          profilePictureUrl: newProfileImageUrl
        });
      }
      
      // Also update in AsyncStorage to persist
      try {
        await AsyncStorage.setItem('profileImageUrl', newProfileImageUrl);
        console.log('Profile image URL saved to AsyncStorage');
      } catch (storageError) {
        console.error('Failed to save profile image URL to AsyncStorage:', storageError);
      }
      
      showToast('Profile picture updated successfully');
      
      return newProfileImageUrl;
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      showToast('Failed to update profile picture', true);
      throw error;
    } finally {
      setUploading(false);
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
              showToast('Successfully signed out');
            } catch (error: any) {
              showToast(`Error signing out: ${error.message}`, true);
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
          onPress: async () => {
            try {
              setDeleting(true);
              
              // Get the current session for authentication
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData.session?.access_token;
              
              if (!token) {
                showToast('You must be logged in to delete your account', true);
                setDeleting(false);
                return;
              }
              
              console.log('Calling delete-user endpoint...');
              
              // Call the edge function
              const response = await fetch(
                'https://wnwvguldjsqmynxdrfij.supabase.co/functions/v1/delete-user',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({})
                }
              );
              
              const result = await response.json();
              
              if (!response.ok) {
                const errorMessage = result.error || result.details || 'Failed to delete account';
                throw new Error(errorMessage);
              }
              
              console.log('Account deleted successfully:', result);
              
              // Clear local cache and storage
              await clearUserProfileCache();
              await AsyncStorage.clear();
              
              // Show success message
              showToast('Your account has been deleted successfully');
              
              // Wait a moment for the toast to be visible before redirecting
              setTimeout(async () => {
                try {
                  // Force sign out and navigate to onboarding
                  await supabase.auth.signOut();
                  router.replace('/onboarding/welcome');
                } catch (signOutError) {
                  console.error('Error signing out after account deletion:', signOutError);
                  // If sign out fails, try to redirect anyway
                  router.replace('/onboarding/welcome');
                }
              }, 1500);
              
            } catch (error: any) {
              console.error('Error deleting account:', error);
              let errorMessage = 'Failed to delete account';
              
              if (error.message) {
                errorMessage = error.message;
              }
              
              // For network errors
              if (error instanceof TypeError && error.message.includes('network')) {
                errorMessage = 'Network error: Please check your internet connection';
              }
              
              showToast(`Error: ${errorMessage}`, true);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleReportBug = async () => {
    const url = 'https://docs.google.com/forms/d/e/1FAIpQLSenYZlweMXH4ojncwwiVaUCmv-lWN3O9SNTlixbY0XE-pwXag/viewform?usp=header';
    
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      showToast('Cannot open the bug report form', true);
    }
  };

  const handleLeaveFeedback = async () => {
    const url = 'https://docs.google.com/forms/d/e/1FAIpQLSeGucJM9g-h88469IN-05GzziStJYW6e-aKrhsk-ye8NIWlYQ/viewform?usp=header';
    
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      showToast('Cannot open the feedback form', true);
    }
  };

  // Handle opening privacy policy modal
  const handleOpenPrivacyPolicy = () => {
    setPrivacyPolicyVisible(true);
  };

  // Handle opening terms of service modal
  const handleOpenTermsOfService = () => {
    setTermsOfServiceVisible(true);
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

  // Toast notification function
  const showToast = (message: string, isError = false) => {
    setToastMessage(message);
    setToastIsError(isError);
    setToastVisible(true);
    
    // Hide the toast after 3 seconds
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  // Alert Toast component
  const AlertToast = () => {
    if (!toastVisible) return null;
    
    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: fadeAnim.value,
        transform: [{ translateY: interpolate(fadeAnim.value, [0, 1], [20, 0]) }]
      };
    });
    
    return (
      <Animated.View 
        style={[
          styles.toast, 
          toastIsError ? styles.errorToast : styles.successToast,
          animatedStyle
        ]}
      >
        {toastIsError ? (
          <Ionicons name="alert-circle" size={22} color="#F44336" style={styles.toastIcon} />
        ) : (
          <Ionicons name="checkmark-circle" size={22} color="#4CAF50" style={styles.toastIcon} />
        )}
        <Text style={[
          styles.toastText,
          toastIsError ? styles.errorText : styles.successText
        ]}>
          {toastMessage}
        </Text>
      </Animated.View>
    );
  };

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
      
      {deleting && (
        <View style={styles.deletingOverlay}>
          <View style={styles.deletingContainer}>
            <ActivityIndicator size="large" color="#4B2E83" />
            <Text style={styles.deletingText}>Deleting account...</Text>
          </View>
        </View>
      )}
      
      <SafeAreaView style={styles.container}>
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
        >
          <View style={styles.header}>
            <View style={styles.profilePictureContainer}>
              <AnimatedImage
                source={profileData.profilePicture}
                style={[styles.profilePicture, imageStyle]}
              />
              <TouchableOpacity 
                style={styles.editProfileButton} 
                onPress={handleChangeProfilePicture}
                disabled={uploading}
              >
                <Ionicons name="pencil" size={18} color="#fff" />
              </TouchableOpacity>
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#4B2E83" />
                </View>
              )}
            </View>
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
            
            <TouchableOpacity style={styles.button} onPress={handleLeaveFeedback}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#4B2E83" />
              <Text style={styles.buttonText}>Leave Feedback</Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleOpenPrivacyPolicy}>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>•</Text>
          <TouchableOpacity onPress={handleOpenTermsOfService}>
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      
      <AlertToast />
      
      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        visible={privacyPolicyVisible} 
        onClose={() => setPrivacyPolicyVisible(false)} 
      />
      
      {/* Terms of Service Modal */}
      <TermsOfServiceModal 
        visible={termsOfServiceVisible} 
        onClose={() => setTermsOfServiceVisible(false)} 
      />
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
  header: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profilePicture: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#4B2E83',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#e1e1e1',
    backgroundColor: '#fff',
  },
  link: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  separator: {
    color: '#666',
    marginHorizontal: 8,
    fontSize: 14,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 75,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  toastText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  successToast: {
    backgroundColor: '#E7F3EB',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  errorToast: {
    backgroundColor: '#FDECEA',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  toastIcon: {
    marginRight: 10,
  },
  errorText: {
    color: '#F44336',
  },
  successText: {
    color: '#4CAF50',
  },
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },
  deletingContainer: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 200,
  },
  deletingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B2E83',
    marginTop: 16,
    textAlign: 'center',
  },
}); 