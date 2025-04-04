import 'react-native-get-random-values';
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { GooglePlacesAutocomplete, GooglePlaceData, GooglePlaceDetail } from 'react-native-google-places-autocomplete';
// import { GOOGLE_API_KEY } from '@env'; // Temporarily comment out
import { createDinnerParty } from '../services/groups';
import { SvgXml } from 'react-native-svg';

// Temporarily hardcode the API key
const GOOGLE_API_KEY = 'AIzaSyDboCTH-xaF3fFoGUoAzOBgV0TYcvnpdPc';

const { width } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

// SVG for location pin
const mapPinSvg = `<?xml version="1.0" encoding="iso-8859-1"?>
<svg fill="#4B2E83" height="800px" width="800px" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
   viewBox="0 0 368.553 368.553">
<g>
  <path d="M184.277,0c-71.683,0-130,58.317-130,130c0,87.26,119.188,229.855,124.263,235.883c1.417,1.685,3.504,2.66,5.705,2.67
    c0.011,0,0.021,0,0.032,0c2.189,0,4.271-0.957,5.696-2.621c5.075-5.926,124.304-146.165,124.304-235.932
    C314.276,58.317,255.96,0,184.277,0z M184.277,190.837c-33.544,0-60.835-27.291-60.835-60.835c0-33.544,27.291-60.835,60.835-60.835
    c33.544,0,60.835,27.291,60.835,60.835C245.112,163.546,217.821,190.837,184.277,190.837z"/>
</g>
</svg>`;

interface CreatePartyFormProps {
  groupId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CreatePartyForm({ groupId, onCancel, onSuccess }: CreatePartyFormProps) {
  const [mainDish, setMainDish] = useState('');
  const [sideDish, setSideDish] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'dishes' | 'location'>('dishes');
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Check Google API key on mount
  useEffect(() => {
    const checkGoogleApiKey = async () => {
      try {
        // Make a simple request to the Places API to check if the key works
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4&key=${GOOGLE_API_KEY}`
        );
        const data = await response.json();
        
        if (data.error_message) {
          console.error('Google API Key Error:', data.error_message);
          Alert.alert(
            'API Key Issue',
            'There seems to be an issue with the Google Places API key. Please contact support.'
          );
        }
      } catch (error) {
        console.error('Failed to check Google API key:', error);
      }
    };
    
    checkGoogleApiKey();
  }, []);

  const animateToNextStep = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION / 2,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep('location');
      slideAnim.setValue(width);
      
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const animateToPrevStep = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION / 2,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep('dishes');
      slideAnim.setValue(-width);
      
      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleSubmit = async () => {
    if (!mainDish.trim() || !sideDish.trim() || !address || !latitude || !longitude) {
      Alert.alert('Missing Information', 'Please fill out all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const party = await createDinnerParty(groupId, {
        main_dish: mainDish.trim(),
        side: sideDish.trim(),
        address,
        latitude,
        longitude,
      });

      if (!party) throw new Error('Failed to create dinner party');
      onSuccess();
    } catch (error) {
      console.error('Error creating dinner party:', error);
      Alert.alert('Error', 'Failed to create dinner party. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDishesStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        { transform: [{ translateX: slideAnim }], opacity: opacityAnim }
      ]}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.title}>What's on the Menu?</Text>
        <Text style={styles.subtitle}>Let your guests know what you're cooking</Text>
      </View>
      
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Main Dish</Text>
          <TextInput
            style={styles.input}
            value={mainDish}
            onChangeText={setMainDish}
            placeholder="What's your main dish?"
            placeholderTextColor="#666"
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Side Dish</Text>
          <TextInput
            style={styles.input}
            value={sideDish}
            onChangeText={setSideDish}
            placeholder="What's your side dish?"
            placeholderTextColor="#666"
            returnKeyType="done"
          />
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.inactiveDot]} />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button, 
            styles.nextButton,
            (!mainDish.trim() || !sideDish.trim()) && styles.disabledButton
          ]}
          onPress={animateToNextStep}
          disabled={!mainDish.trim() || !sideDish.trim()}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderLocationStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        { transform: [{ translateX: slideAnim }], opacity: opacityAnim }
      ]}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Where's the Party?</Text>
        <Text style={styles.subtitle}>Enter your address for guests to find you</Text>
      </View>
      
      <View style={styles.locationWrapper}>
        <View style={styles.locationIconContainer}>
          <SvgXml xml={mapPinSvg} width={24} height={24} />
        </View>
        
        <View style={styles.locationContainer}>
          <GooglePlacesAutocomplete
            placeholder="Enter your address"
            onPress={(data: GooglePlaceData, details: GooglePlaceDetail | null = null) => {
              if (details?.geometry?.location) {
                setAddress(details.formatted_address);
                setLatitude(details.geometry.location.lat);
                setLongitude(details.geometry.location.lng);
              }
            }}
            query={{
              key: GOOGLE_API_KEY,
              language: 'en',
              components: 'country:us',
              location: '32.7757,-117.0719',
              radius: '5000',
            }}
            styles={{
              container: styles.autocompleteContainer,
              textInput: styles.locationInput,
              listView: [styles.listView, { zIndex: 9999 }],
              row: styles.locationRow,
              description: styles.locationDescription,
              separator: styles.separator,
              poweredContainer: { display: 'none' },
            }}
            enablePoweredByContainer={false}
            fetchDetails={true}
            nearbyPlacesAPI="GooglePlacesSearch"
            listViewDisplayed="auto"
            keyboardShouldPersistTaps="handled"
            debounce={300}
            minLength={2}
          />
        </View>
      </View>

      {address ? (
        <View style={styles.selectedLocationContainer}>
          <Text style={styles.selectedLocationTitle}>Selected Location:</Text>
          <Text style={styles.selectedLocationText}>{address}</Text>
        </View>
      ) : (
        <View style={styles.locationTipsContainer}>
          <Text style={styles.locationTipsTitle}>Tips:</Text>
          <Text style={styles.locationTipsText}>• Start typing your address</Text>
          <Text style={styles.locationTipsText}>• Select from the suggestions</Text>
          <Text style={styles.locationTipsText}>• Include your apartment/unit number</Text>
        </View>
      )}

      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.inactiveDot]} />
        <View style={styles.progressDot} />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={animateToPrevStep}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button, 
            styles.confirmButton, 
            (!address || isSubmitting) && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!address || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Create Party!</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {step === 'dishes' ? renderDishesStep() : renderLocationStep()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  locationIconContainer: {
    marginRight: 10,
    marginTop: 14,
  },
  locationContainer: {
    flex: 1,
  },
  autocompleteContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  listView: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginTop: 5,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 5,
    maxHeight: 200,
    overflow: 'scroll',
  },
  locationRow: {
    padding: 15,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  locationDescription: {
    fontSize: 14,
    color: '#333',
  },
  selectedLocationContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d0e8ff',
  },
  selectedLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B2E83',
    marginBottom: 5,
  },
  selectedLocationText: {
    fontSize: 14,
    color: '#333',
  },
  locationTipsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  locationTipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  locationTipsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4B2E83',
    marginHorizontal: 5,
  },
  inactiveDot: {
    backgroundColor: '#ddd',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  nextButton: {
    backgroundColor: '#4B2E83',
  },
  backButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#4B2E83',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 