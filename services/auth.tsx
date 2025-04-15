import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRouter } from 'expo-router';
import { getUserProfile } from './users';

export interface AuthContextProps {
  signOut: () => Promise<void>;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setProfileComplete: (isComplete: boolean) => Promise<void>;
  profileComplete: boolean;
}

export const AuthContext = createContext<AuthContextProps>({
  signOut: async () => {},
  user: null,
  session: null,
  isLoading: true,
  setProfileComplete: async () => {},
  profileComplete: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profileComplete, setProfileCompleteState] = useState(false);

  // Set profile complete status in Supabase metadata
  const setProfileComplete = async (isComplete: boolean) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { profile_complete: isComplete }
      });
      
      if (error) {
        throw error;
      }
      
      setProfileCompleteState(isComplete);
      console.log(`Profile status set to: ${isComplete ? 'complete' : 'incomplete'}`);
    } catch (error) {
      console.error('Error updating profile complete status:', error);
    }
  };

  // Check if user's profile is complete
  const checkProfileComplete = async (user: User) => {
    try {
      console.log('Checking profile completion for user:', user.id);
      
      // First, check if we have the flag in metadata
      const metadataComplete = user.user_metadata?.profile_complete === true;
      console.log('Metadata profile_complete flag:', metadataComplete);
      
      // If the flag is true, user is definitely complete
      if (metadataComplete) {
        console.log('Profile complete based on metadata flag');
        setProfileCompleteState(true);
        return true;
      }
      
      // If no flag, check if there's a user profile in the database
      console.log('Checking database for user profile');
      const userProfile = await getUserProfile(user.id);
      console.log('Database user profile:', userProfile);
      
      // Check if user has required profile fields
      const isProfileComplete = !!(
        userProfile && 
        userProfile.display_name && 
        userProfile.profile_picture_url
      );
      
      console.log('Is profile complete based on database:', isProfileComplete);
      
      // If the profile exists in the database but the metadata flag is missing,
      // set the flag to maintain consistency
      if (isProfileComplete && !metadataComplete) {
        console.log('Setting missing metadata flag for completed profile');
        await supabase.auth.updateUser({
          data: { profile_complete: true }
        });
      }
      
      setProfileCompleteState(isProfileComplete);
      return isProfileComplete;
    } catch (error) {
      console.error('Error checking profile complete status:', error);
      setProfileCompleteState(false);
      return false;
    }
  };

  useEffect(() => {
    // Get current session
    const initialize = async () => {
      try {
        setIsLoading(true);
        console.log('Initializing auth context');
        
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          console.log('Session found for user:', currentSession.user.id);
          setUser(currentSession.user);
          
          // Check profile completion status when session is loaded
          // Wait for this check to complete before finishing initialization
          await checkProfileComplete(currentSession.user);
          console.log('Profile check complete, initialization finished');
        } else {
          console.log('No session found');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        console.log('Auth state changed, event:', _event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          console.log('User authenticated:', currentSession.user.id);
          // Check profile completion status when auth state changes
          await checkProfileComplete(currentSession.user);
        } else {
          console.log('User not authenticated');
          setProfileCompleteState(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/onboarding/welcome');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    signOut,
    user,
    session,
    isLoading,
    setProfileComplete,
    profileComplete,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 