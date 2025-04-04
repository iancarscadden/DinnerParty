import React from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
  withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface SwipeGlowProps {
  translateX: SharedValue<number>;
  glowOpacity: SharedValue<number>;
}

export function SwipeGlow({ translateX, glowOpacity }: SwipeGlowProps) {
  const leftGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, -CARD_WIDTH/4],
      [0, 1],
      'clamp'
    );

    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 40, 40, 0.5)',
      opacity: opacity * glowOpacity.value,
      zIndex: 999,
    };
  });

  const rightGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, CARD_WIDTH/4],
      [0, 1],
      'clamp'
    );

    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(50, 200, 50, 0.5)',
      opacity: opacity * glowOpacity.value,
      zIndex: 999,
    };
  });

  return (
    <>
      <Animated.View style={leftGlowStyle} pointerEvents="none" />
      <Animated.View style={rightGlowStyle} pointerEvents="none" />
    </>
  );
} 