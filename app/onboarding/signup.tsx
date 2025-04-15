import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { SvgXml } from 'react-native-svg';

// Import SDSU logo SVG
const sdsuLogoXml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" height="293.22" viewBox="0 0 350.8093 244.3475" width="421.0" version="1.1" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <g transform="matrix(1.25 0 0 -1.25 -337.2 576.26)">
    <g>
      <!-- Outline path now transparent -->
      <path d="m98.174 2.2227l3.326 46.802-60.775-0.031 12.951 55.206c-1.773 0.2-3.317 0.65-4.633 1.34-2-1.02-4.437-1.57-7.082-1.57-2.985 0-5.817 0.68-8.059 1.94-0.201-0.03-1.056-0.28-1.056-0.28-5.382-1.2-16.459-0.77-16.942-0.77h-0.045c-4.04 0.02-8.6081 0.04-11.572 3.16-4.1186 4.33-2.0062 12.36-1.6737 13.5 0.9636 3.37 3.2825 10.43 9.5097 10.68h0.002c0.189 0.01 0.914-0.01 0.959-0.01 0.24-0.02 5.85-0.48 10.496-0.48 2.308 0 5.291 0.41 5.969 0.41 1.114 0 2.549-0.2 4.113-0.94 2.339 1.16 4.715 1.32 5.621 1.33 0.019 0 11.605 0.01 15.313 0l-13.871 61.35 62.645-0.05-4.831 43.01-0.541 4.91-0.084 0.69h121.96l-0.05-0.66-0.29-4.71-3.5-50.2c6.65-2.02 12.86-4.44 18.52-7.27 10.4-5.19 18.9-11.68 25.26-19.28 6.81-8.12 11.13-17.49 12.89-27.86l4 0.02 7.19 5.98 11.51 1.7 3.37-1.55 3.04 1.19 14.65-3.59 2.5-1.7 2.46 0.12s9.66-4.69 12.05-5.99c2.05-1.11 4.98-2.72 7.23-4.09 1.12-0.69 8.15-4.13 7.88-6.5-0.14-2.23-7.13-5.27-8.33-5.94-1.86-1.03-4.43-2.35-7.63-3.94-5.39-2.66-10.85-5.19-10.91-5.21-0.59-0.28-3.48 0.1-3.48 0.1l-2.22-1.83-14.64-3.468-3.32 1.453-3.04-1.209-12.05 2-5.69 6.304-5.58-0.05c-2.34-8.979-6.84-17.179-13.4-24.422-6.65-7.347-15.37-13.667-25.93-18.785-5.77-2.794-12.01-5.191-18.66-7.187l5.87-53.623-121.4-0.0003zm54.686 34.785h19.33v12.172c-2.04-0.072-4.09-0.121-6.15-0.121l-13.18-0.006v-12.045zm12.31 44.455c1.72 0 3.34 0.029 4.93 0.064l-12.62 12.909h51.99l0.35-3.229c3.36 2.439 6.04 5.346 8.1 8.813 3.32 5.62 5.02 12.8 5.02 21.36 0 5-0.59 9.6-1.77 13.66-1.08 3.71-2.67 7.09-4.73 10.02-0.93 1.32-1.95 2.55-3.06 3.72l-3.35-48.01-57.17 0.01v-19.28c3.89-0.011 11.62-0.037 12.31-0.037zm-61.36 0.183l4.12 57.994h66.03v23.52c-6.49 0.53-13.16 0.66-19.72 0.66h-5.39l15.62-12.09h-56.38l-1.36 12.09h-10.251l4.111-42c0.03-0.3 0.03-0.6 0-0.89l-4.059-39.262s5.969-0.017 7.279-0.022zm70.15 111.94v13.56h-28.96v-13.38l21.04-0.02c2.66 0 5.3-0.06 7.92-0.16z" transform="matrix(.8 0 0 -.8 269.76 461)" fill="none"/>
      
      <!-- Main content paths with the main color -->
      <path d="m103.56 7.2637l2.7 41.8 41.56-0.019v-17.084h29.41l0.01 49.463-7.78 7.969h35.5l8.99-82.129-110.39-0.0003zm44.26 74.375l-39.11 0.019 3.88 52.882v0.06h66.41v28.05c7.52-0.9 14.7-2.45 21.08-5.11 3.28-1.38 6.18-2.97 8.71-4.8l-3.44-46.89-57.53-0.03v-24.181zm-35.23 75.131l-9.03 80.61h110.94l-3.23-48.92c-10.43 2.61-21.4 4.18-32.27 4.85v18.88h-39.03l-0.02-47.85 9.78-7.57h-37.14z" transform="matrix(.8 0 0 -.8 269.76 461)" fill="#4B2E83"/>
      <path d="m525.64 375.42-2.872-2.93-0.517 0.183-0.531 3.904-10.863 2.669-2.377-4.284-0.709 0.036-2.002 4.053-7.74-1.254-4.906-5.307-8.872-0.018c-3.982 20.601-22.206 33.589-43.917 40.256l-2.263-20.663c8.138-5.151 13.622-13.791 13.622-28.165 0-35.869-35.103-37.521-58.534-37.521h-7.402l0.006-16.8h16.837c37.781 0 76.808 13.639 81.917 46.755 0 0 0.156 0.967 0.318 2.317l7.798-0.047 5.218-4.923 8.231-1.21 1.72 4.079 0.61 0.084 2.799-3.878 10.843 2.757 0.312 4.048 0.672 0.221 3.034-2.984c0.814 0.195 16.947 8.51 16.895 9.526-0.063 1.105-17.327 9.096-17.327 9.096zm-178.96-11.52-3.659 35.342 64.486 0.032 0.005 18.958-100.71-0.039 10.426-44.178c-0.913 0.102-1.773 0.175-2.539 0.175-2.523 0-4.921-1.17-5.49-1.819-0.078-0.084-0.359 0.041-0.75 0.307-1.152 1.007-3.007 1.582-5.119 1.582-1.913 0-3.743-0.466-5.03-1.29-0.49-0.177-0.943-0.26-1.398-0.26-0.578 0-1.866 0.367-1.866 0.367l-0.015 0.003c-0.708 0.213-1.522 0.456-2.45 0.456 0 0-1.866 0.029-2.825 0.06h-0.011s-5.092 0.052-5.676-0.005c-0.319-0.037-6.584 0.266-8.284-1.46-0.818-0.839-1.146-2.192-1.032-4.097 0.074-1.282 0.334-2.551 0.532-3.251 1.392-4.803 3.149-5.903 4.389-5.97 0.626-0.105 5.202 0.292 8.961 0.398 1.762 0.05 3.081-0.075 3.925-0.221 0.198-0.052 0.479-0.11 0.85-0.11 0.813 0 2.048 0.276 3.346 1.565l0.042-0.006c1.376-1.741 3.951-1.866 4.462-1.871h0.005c0.626-0.003 2.378-0.005 4.947-0.005 3.701 0 8.315 0.005 11.713 0.018l-11.113-49.002h46.054l1.892 16.8h-11.739l3.67 37.521" fill="#4B2E83"/>
    </g>
  </g>
</svg>`;

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useRef(new Animated.Value(-100)).current;

  // Function to check if email is from SDSU
  const isSDSUEmail = (email: string): boolean => {
    return email.toLowerCase().endsWith('@sdsu.edu');
  };

  // Show toast message
  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    
    // Animate the toast in
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const handleSignup = async () => {
    if (loading) return;
    
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Check if the email is from SDSU before proceeding
    if (!isSDSUEmail(email)) {
      showToast('Currently only available to SDSU students, coming soon to other schools!');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'dinnerparty://onboarding/verify',
          data: {
            profile_complete: false
          }
        },
      });

      if (error) throw error;

      // Always navigate to verify screen after signup, regardless of session state
      router.push({
        pathname: '/onboarding/verify',
        params: { email }
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Toast notification - positioned below safe area */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toast,
            { 
              transform: [{ translateY: toastAnim }],
              top: insets.top // Position it right below the safe area
            }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Account</Text>
          <SvgXml xml={sdsuLogoXml} width={60} height={42} />
        </View>
        
        <Text style={styles.subtitle}>
          Enter your sdsu.edu email and create a password
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => router.push('/onboarding/login')}
        >
          <Text style={styles.linkText}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4B2E83',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
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
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#4B2E83',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#4B2E83',
    padding: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
}); 