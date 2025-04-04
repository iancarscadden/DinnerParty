import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    if (params.email) {
      setEmail(params.email as string);
    }
  }, [params]);

  const handleVerify = async () => {
    if (loading) return;
    
    if (!code) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email address is missing');
      return;
    }

    setLoading(true);
    try {
      // First verify the OTP
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });

      if (verifyError) throw verifyError;

      // Check if we have a valid session after verification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        throw new Error('Verification successful but no session created');
      }

      // Navigate to profile setup
      router.push('/onboarding/profile-setup');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>
          Enter the verification code sent to{'\n'}{email || 'your email'}
        </Text>

        <View style={styles.form}>
          <TouchableOpacity 
            style={styles.codeInputContainer}
            activeOpacity={0.9}
            onPress={() => {
              // Ensure keyboard is shown when container is tapped
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
          >
            <TextInput
              ref={inputRef}
              style={styles.codeInput}
              value={code}
              onChangeText={(text) => {
                // Only allow numbers and limit to 6 digits
                const cleanText = text.replace(/[^0-9]/g, '').slice(0, 6);
                setCode(cleanText);
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.digitBoxes}>
              {[...Array(6)].map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.digitBox,
                    index < code.length && styles.digitBoxFilled
                  ]}
                >
                  {index < code.length && (
                    <Text style={styles.digit}>{code[index]}</Text>
                  )}
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[
            styles.button, 
            loading && styles.buttonDisabled,
            code.length !== 6 && styles.buttonDisabled
          ]}
          onPress={handleVerify}
          disabled={loading || code.length !== 6}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Verifying...' : 'Continue'}
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    lineHeight: 24,
  },
  form: {
    alignItems: 'center',
    marginBottom: 30,
  },
  codeInputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  codeInput: {
    position: 'absolute',
    width: '100%',
    height: 60,
    opacity: 0,
    zIndex: 1,
  },
  digitBoxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  digitBox: {
    width: 45,
    height: 60,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxFilled: {
    borderColor: '#4B2E83',
    backgroundColor: '#f8f8f8',
  },
  digit: {
    fontSize: 24,
    color: '#4B2E83',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4B2E83',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 