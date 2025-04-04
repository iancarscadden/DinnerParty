import { Redirect } from 'expo-router';
import { useAuth } from '../services/auth';

export default function Index() {
  const { session, initialized } = useAuth();

  // Don't redirect until auth is initialized
  if (!initialized) return null;

  // No session = not logged in = start at welcome
  if (!session) {
    return <Redirect href="/onboarding/welcome" />;
  }

  // Has session = logged in = go to app
  return <Redirect href="/(tabs)/map" />;
} 