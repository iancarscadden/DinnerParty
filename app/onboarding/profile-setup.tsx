import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../services/supabase';
import { createUserProfile, getUserProfile } from '../../services/users';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '../../services/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const { setProfileComplete, user } = useAuth();
  const [name, setName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Check if user already has a profile
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return;
      
      try {
        console.log('Checking for existing profile for user:', user.id);
        const userProfile = await getUserProfile(user.id);
        
        if (userProfile && userProfile.display_name && userProfile.profile_picture_url) {
          console.log('Existing profile found, redirecting to main app');
          // Profile exists, set profile complete flag and redirect
          await setProfileComplete(true);
          router.replace('/(tabs)/map');
        } else {
          console.log('No existing profile found, showing setup form');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking existing profile:', error);
        setLoading(false);
      }
    };
    
    checkExistingProfile();
  }, [user]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setProfilePicture(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Format the phone number as user types (XXX) XXX-XXXX
  const formatPhoneNumber = (text: string) => {
    // Strip all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Limit to 10 digits
    const digits = cleaned.substring(0, 10);
    
    // Format the phone number
    let formatted = '';
    if (digits.length > 0) {
      formatted += digits.substring(0, 3);
      if (digits.length > 3) {
        formatted += '-' + digits.substring(3, 6);
        if (digits.length > 6) {
          formatted += '-' + digits.substring(6, 10);
        }
      }
    }
    
    setPhoneNumber(formatted);
  };

  const handleComplete = async () => {
    if (loading) return;
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!profilePicture) {
      Alert.alert('Error', 'Please add your face card');
      return;
    }

    // Check phone number
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Extract base64 data
      const base64Data = profilePicture.split(',')[1];
      if (!base64Data) throw new Error('Invalid image data');

      // Create the file path in the format userId/profile.jpg
      const filePath = `${user.id}/profile.jpg`;

      // Upload the image
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('profiles')
        .upload(filePath, decode(base64Data), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Create user profile
      await createUserProfile(
        user.id,
        name.trim(),
        publicUrl,
        cleanedPhone
      );

      // Set profile complete flag
      await setProfileComplete(true);
      console.log('Profile completed successfully!');

      // Navigate to main app
      router.replace('/(tabs)/map');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // If still checking for existing profile, show loading spinner
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
        <Text style={styles.loadingText}>Loading profile information...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Complete Profile</Text>
            <Text style={styles.subtitle}>
              Add your name, face card, and phone number
            </Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Your First Name"
                value={name}
                onChangeText={setName}
                maxLength={50}
              />

              <TextInput
                style={styles.input}
                placeholder="Phone Number (XXX-XXX-XXXX)"
                value={phoneNumber}
                onChangeText={formatPhoneNumber}
                keyboardType="phone-pad"
                maxLength={12} // XXX-XXX-XXXX format has 12 characters
              />
              <Text style={styles.privacyText}>
                Only shared to those you accept.
              </Text>

              <TouchableOpacity 
                style={styles.imageButton}
                onPress={pickImage}
                disabled={loading}
              >
                {profilePicture ? (
                  <Image 
                    source={{ uri: profilePicture }} 
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>
                      Add your face card
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[
                styles.button, 
                (loading || !name.trim() || !profilePicture || phoneNumber.replace(/\D/g, '').length !== 10) && styles.buttonDisabled
              ]}
              onPress={handleComplete}
              disabled={loading || !name.trim() || !profilePicture || phoneNumber.replace(/\D/g, '').length !== 10}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={[styles.buttonText, styles.loadingText]}>
                    Creating Profile...
                  </Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Complete Setup</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  form: {
    gap: 20,
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
  },
  imageButton: {
    marginTop: 10,
    alignSelf: 'center',
  },
  profileImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  imagePlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 10,
  },
  button: {
    backgroundColor: '#4B2E83',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B2E83',
  },
  privacyText: {
    fontSize: 14,
    color: '#999',
    marginTop: -15,
    marginLeft: 5,
  },
}); 