import { useEffect, useState, useCallback } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Platform } from 'react-native';
import { AuthProvider, useAuth } from '../services/auth';
import { AudioProvider } from '../contexts/AudioContext';
import * as SplashScreen from 'expo-splash-screen';
import ReactSplashScreen from '../components/ReactSplashScreen';

// Keep the splash screen visible until hideAsync is called
SplashScreen.preventAutoHideAsync().catch(() => {
  console.log('Error preventing splash screen auto hide');
});

function RootLayoutNav() {
  const { session, isLoading, profileComplete } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  // Prepare app resources
  useEffect(() => {
    async function prepare() {
      try {
        console.log('Preparing app resources...');
        // Add any resource loading here if needed
      } catch (e) {
        console.warn('Error preparing app:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Handle splash screen transition
  const onAnimationComplete = useCallback(() => {
    // This is called when the React splash screen animation completes
    console.log('React splash animation complete');
  }, []);

  // Handle navigation once auth is ready
  useEffect(() => {
    if (isLoading || !appIsReady) return;

    async function hideAndNavigate() {
      try {
        // Hide the native splash screen
        await SplashScreen.hideAsync();
        
        // After resources are loaded and native splash is hidden,
        // we'll show our custom splash screen briefly
        // Give the custom splash time to display before starting to hide it
        setTimeout(() => {
          setShowSplashScreen(false);
        }, 1000);
        
        const inAuthGroup = segments[0] === 'onboarding';
        const inProtectedGroup = segments[0] === '(tabs)';
        
        // Handle routing based on auth state
        if (!session) {
          // Not logged in
          if (!inAuthGroup) {
            router.replace('/onboarding/welcome');
          }
        } else {
          // Logged in
          const segmentsArray = segments as string[];
          
          // If profile is not complete, force user to complete profile setup
          if (!profileComplete) {
            // If not already in profile setup, redirect there
            if (!(inAuthGroup && segmentsArray[1] === 'profile-setup')) {
              router.replace('/onboarding/profile-setup');
              return;
            }
            // Stay in profile setup screen
            return;
          }
          
          // Profile is complete, handle normal routing
          if (inAuthGroup && segmentsArray.length > 1) {
            // Only proceed if we have a second segment
            const currentScreen = segmentsArray[1];
            
            // If in verify, let them complete it
            if (currentScreen === 'verify') {
              return;
            }
            
            // If in profile-setup and profile is already complete, redirect to main app
            if (currentScreen === 'profile-setup' && profileComplete) {
              router.replace('/(tabs)/map');
              return;
            }
            
            // Otherwise, redirect to main app
            router.replace('/(tabs)/map');
          } else if (!inProtectedGroup) {
            // If not in protected group or valid onboarding, go to main app
            router.replace('/(tabs)/map');
          }
        }
      } catch (error) {
        console.error('Error handling navigation:', error);
      }
    }

    hideAndNavigate();
  }, [appIsReady, isLoading, session, profileComplete, segments, router]);

  // Return null during loading to maintain splash screen
  if (isLoading || !appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
      <ReactSplashScreen 
        isVisible={showSplashScreen} 
        onAnimationComplete={onAnimationComplete} 
      />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AudioProvider>
        <SafeAreaProvider>
          <RootLayoutNav />
        </SafeAreaProvider>
      </AudioProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
