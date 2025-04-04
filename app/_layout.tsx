import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../services/auth';

function RootLayoutNav() {
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === 'onboarding';
    const inProtectedGroup = segments[0] === '(tabs)';
    
    // Handle routing based on auth state
    if (!session) {
      // Not logged in
      if (!inAuthGroup) {
        // If not in onboarding, redirect to welcome
        router.replace('/onboarding/welcome');
      }
    } else {
      // Logged in
      const segmentsArray = segments as string[];
      if (inAuthGroup && segmentsArray.length > 1) {
        // Only proceed if we have a second segment
        const currentScreen = segmentsArray[1];
        // If in verify or profile-setup, let them complete it
        if (currentScreen === 'verify' || currentScreen === 'profile-setup') {
          return;
        }
        // Otherwise, redirect to main app
        router.replace('/(tabs)/map');
      } else if (!inProtectedGroup) {
        // If not in protected group or valid onboarding, go to main app
        router.replace('/(tabs)/map');
      }
    }
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <RootLayoutNav />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
