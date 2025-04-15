import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, StatusBar, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReactSplashScreenProps {
  onAnimationComplete?: () => void;
  isVisible: boolean;
}

const ReactSplashScreen: React.FC<ReactSplashScreenProps> = ({ 
  onAnimationComplete, 
  isVisible 
}) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Pulsing animation for the logo while visible
  useEffect(() => {
    if (isVisible) {
      const pulseAnimation = Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ]);

      // Create a loop
      Animated.loop(pulseAnimation).start();
    } else {
      // Stop the animation when we're going to hide the splash
      scaleAnim.stopAnimation();
    }
  }, [isVisible, scaleAnim]);

  // Fade out animation when it's time to hide
  useEffect(() => {
    if (!isVisible) {
      // Fade out animation when we're ready to hide the splash
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Callback after animation completes
        setIsAnimationComplete(true);
        onAnimationComplete?.();
      });
    }
  }, [isVisible, fadeAnim, onAnimationComplete]);

  if (!isVisible && isAnimationComplete) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar hidden={isVisible} />
      <View style={styles.imageContainer}>
        <Animated.Image
          source={require('../assets/images/DP_splash.png')}
          style={[
            styles.image, 
            { transform: [{ scale: scaleAnim }] }
          ]}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 999,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  }
});

export default ReactSplashScreen; 