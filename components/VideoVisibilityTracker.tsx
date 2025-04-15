import React, { useEffect, useState, useRef } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { ExpandableVideo } from './ExpandableVideo';
import { useAudio } from '../contexts/AudioContext';

interface VideoVisibilityTrackerProps {
  videoUrl: string;
  index: number;
  scrollY: number;
  scrollViewHeight: number;
  onVisibilityChange: (index: number, visibilityPercentage: number) => void;
  isAudioEnabled: boolean;
  brightness: number;
  shouldPlay: boolean;
  isLooping: boolean;
  videoHeight?: number;
  unmutedInExpanded?: boolean;
  tabName?: string;
}

export function VideoVisibilityTracker({
  videoUrl,
  index,
  scrollY,
  scrollViewHeight,
  onVisibilityChange,
  isAudioEnabled,
  brightness,
  shouldPlay,
  isLooping,
  videoHeight,
  unmutedInExpanded = true,
  tabName = 'social',
}: VideoVisibilityTrackerProps) {
  const [layout, setLayout] = useState({ y: 0, height: 0 });
  const previousVisibility = useRef(0);
  const { isAudioEnabled: isTabAudioEnabled } = useAudio();
  
  // Handle layout changes to get position information
  const handleLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setLayout({ y, height });
  };

  // Calculate visibility whenever scroll position or layout changes
  useEffect(() => {
    if (layout.height === 0) return; // Skip if layout not measured yet
    
    // Calculate visibility percentage based on overlap with viewport
    const scrollPosition = scrollY;
    const videoTop = layout.y;
    const videoBottom = layout.y + layout.height;
    const viewportTop = scrollPosition;
    const viewportBottom = scrollPosition + scrollViewHeight;
    
    // Calculate the visible portion of the video
    const visibleTop = Math.max(videoTop, viewportTop);
    const visibleBottom = Math.min(videoBottom, viewportBottom);
    
    let visibilityPercentage = 0;
    if (visibleBottom > visibleTop) {
      const visibleHeight = visibleBottom - visibleTop;
      visibilityPercentage = (visibleHeight / layout.height) * 100;
    }
    
    // Only report significant changes to reduce unnecessary updates
    if (Math.abs(visibilityPercentage - previousVisibility.current) > 5) {
      previousVisibility.current = visibilityPercentage;
      onVisibilityChange(index, visibilityPercentage);
    }
  }, [layout, scrollY, scrollViewHeight, index, onVisibilityChange]);

  // Log when audio state changes
  useEffect(() => {
    // Only log when audio is turned ON to reduce console bloat
    if (isAudioEnabled) {
      console.log(`Video ${index} audio enabled`);
    }
  }, [isAudioEnabled, index]);

  // Combine component-level audio state with tab-level audio state
  const finalAudioEnabled = isAudioEnabled && isTabAudioEnabled(tabName);

  return (
    <View onLayout={handleLayout}>
      <ExpandableVideo
        videoUrl={videoUrl}
        brightness={brightness}
        shouldPlay={shouldPlay}
        isLooping={isLooping}
        isMuted={!finalAudioEnabled}
        videoHeight={videoHeight}
        unmutedInExpanded={unmutedInExpanded}
        tabName={tabName}
      />
    </View>
  );
} 