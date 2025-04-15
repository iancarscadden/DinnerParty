import { supabase } from './supabase';
import type { UserProfile } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
const CACHE_KEYS = {
  PROFILE_PICTURE: 'user_profile_picture',
  DISPLAY_NAME: 'user_display_name',
  EMAIL: 'user_email'
} as const;

export async function createUserProfile(
  userId: string,
  display_name: string,
  profilePictureUrl: string,
  phone_num?: string
): Promise<UserProfile> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          display_name,
          profile_picture_url: profilePictureUrl,
          phone_num,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'created_at'>>
): Promise<UserProfile> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

interface CachedUserProfile {
  profilePictureUrl: string;
  displayName: string;
  email: string;
}

export async function getCachedUserProfile(): Promise<CachedUserProfile | null> {
  try {
    // Try to get data from AsyncStorage first
    const [profilePicture, displayName, email] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEYS.PROFILE_PICTURE),
      AsyncStorage.getItem(CACHE_KEYS.DISPLAY_NAME),
      AsyncStorage.getItem(CACHE_KEYS.EMAIL)
    ]);

    // If all cached data exists, return it
    if (profilePicture && displayName && email) {
      return {
        profilePictureUrl: profilePicture,
        displayName,
        email
      };
    }

    // If not in cache, fetch from database
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const profile = await getUserProfile(user.id);
    if (!profile) return null;

    // Create cache object
    const cachedProfile: CachedUserProfile = {
      profilePictureUrl: profile.profile_picture_url,
      displayName: profile.display_name,
      email: user.email || ''
    };

    // Save to AsyncStorage
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEYS.PROFILE_PICTURE, cachedProfile.profilePictureUrl),
      AsyncStorage.setItem(CACHE_KEYS.DISPLAY_NAME, cachedProfile.displayName),
      AsyncStorage.setItem(CACHE_KEYS.EMAIL, cachedProfile.email)
    ]);

    return cachedProfile;
  } catch (error) {
    console.error('Error getting cached user profile:', error);
    return null;
  }
}

export async function clearUserProfileCache(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(CACHE_KEYS.PROFILE_PICTURE),
      AsyncStorage.removeItem(CACHE_KEYS.DISPLAY_NAME),
      AsyncStorage.removeItem(CACHE_KEYS.EMAIL)
    ]);
  } catch (error) {
    console.error('Error clearing user profile cache:', error);
  }
}

export async function updateCachedUserProfile(profile: CachedUserProfile): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEYS.PROFILE_PICTURE, profile.profilePictureUrl),
      AsyncStorage.setItem(CACHE_KEYS.DISPLAY_NAME, profile.displayName),
      AsyncStorage.setItem(CACHE_KEYS.EMAIL, profile.email)
    ]);
  } catch (error) {
    console.error('Error updating cached user profile:', error);
  }
} 