import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Modal, 
  Dimensions, 
  StatusBar,
  TouchableWithoutFeedback 
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, AVPlaybackStatusSuccess, Audio } from 'expo-av';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { useAudio } from '../contexts/AudioContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define a more specific type for video natural size
interface VideoNaturalSize {
  width: number;
  height: number;
  orientation?: string;
}

// Helper to check if a status is loaded and has natural size
function isLoadedVideoWithSize(status: AVPlaybackStatus): status is AVPlaybackStatusSuccess & { naturalSize: VideoNaturalSize } {
  return status.isLoaded && 'naturalSize' in status;
}

interface ExpandableVideoProps {
  videoUrl: string;
  brightness?: number;
  shouldPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  unmutedInExpanded?: boolean;
  useNativeControls?: boolean;
  resizeMode?: ResizeMode;
  videoHeight?: number;
  tabName?: string;
}

export function ExpandableVideo({
  videoUrl,
  brightness = 1,
  shouldPlay = false,
  isLooping = true,
  isMuted = false,
  unmutedInExpanded = false,
  useNativeControls = false,
  resizeMode = ResizeMode.COVER,
  videoHeight,
  tabName = 'social',
}: ExpandableVideoProps) {
  const [expanded, setExpanded] = useState(false);
  const [videoNaturalSize, setVideoNaturalSize] = useState({ width: 16, height: 9 });
  const [videoRef, setVideoRef] = useState<Video | null>(null);
  const [expandedVideoPlaying, setExpandedVideoPlaying] = useState(false);
  const insets = useSafeAreaInsets();
  const { isAudioEnabled: isTabAudioEnabled } = useAudio();
  
  // Default video height calculation similar to the original implementation
  const defaultVideoHeight = Dimensions.get('window').width * 0.8;
  const actualVideoHeight = videoHeight || defaultVideoHeight;
  
  const expandOpacity = useSharedValue(0);
  const expandScale = useSharedValue(0.8);

  useEffect(() => {
    // Pause the card video when expanded
    if (videoRef && expanded) {
      videoRef.pauseAsync();
    }
  }, [expanded, videoRef]);

  useEffect(() => {
    if (expanded) {
      // Animate the expanded video in
      expandOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
      expandScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      setExpandedVideoPlaying(true);
    } else {
      expandOpacity.value = 0;
      expandScale.value = 0.8;
      setExpandedVideoPlaying(false);
    }
  }, [expanded]);

  // Set up audio mode to play in silent mode on iOS
  useEffect(() => {
    const setupAudio = async () => {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });
    };
    
    setupAudio();
  }, []);

  const handleVideoLoad = (status: AVPlaybackStatus) => {
    if (isLoadedVideoWithSize(status)) {
      setVideoNaturalSize(status.naturalSize);
    }
  };

  const handleExpand = () => {
    setExpanded(true);
  };

  const handleClose = () => {
    setExpanded(false);
  };

  const isLandscape = videoNaturalSize.width > videoNaturalSize.height;
  
  // Calculate expanded video dimensions to maintain aspect ratio
  const getExpandedVideoDimensions = () => {
    // Instead of conditional logic based on video orientation,
    // we'll make the expanded video fill the screen in portrait orientation
    return {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    };
  };

  const expandedDimensions = getExpandedVideoDimensions();
  
  const animatedExpandedStyle = useAnimatedStyle(() => {
    return {
      opacity: expandOpacity.value,
      transform: [{ scale: expandScale.value }],
    };
  });

  return (
    <>
      <TouchableOpacity 
        style={[
          styles.videoWrapper, 
          { 
            opacity: brightness,
            height: actualVideoHeight 
          }
        ]}
        onPress={handleExpand}
        activeOpacity={0.9}
      >
        <Video
          ref={setVideoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          shouldPlay={shouldPlay && !expanded}
          isLooping={isLooping}
          isMuted={isMuted || !isTabAudioEnabled(tabName)}
          useNativeControls={useNativeControls}
          resizeMode={resizeMode}
          onPlaybackStatusUpdate={handleVideoLoad}
        />
        <View 
          style={styles.expandButton}
          pointerEvents="none"
        >
          <Ionicons name="expand-outline" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={expanded}
        transparent={true}
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent={true}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalContainer}>
            <BlurView intensity={85} style={StyleSheet.absoluteFill} />
            
            <Animated.View 
              style={[
                styles.expandedVideoContainer,
                {
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT,
                },
                animatedExpandedStyle
              ]}
            >
              <Video
                source={{ uri: videoUrl }}
                style={styles.expandedVideo}
                shouldPlay={expandedVideoPlaying}
                isLooping={isLooping}
                isMuted={(unmutedInExpanded ? false : isMuted) || !isTabAudioEnabled(tabName)}
                useNativeControls={true}
                resizeMode={ResizeMode.CONTAIN}
              />
              
              <TouchableOpacity 
                style={[
                  styles.closeButton,
                  {
                    top: insets.top + 10,
                    right: 16,
                  }
                ]} 
                onPress={handleClose}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="close-circle" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  videoWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 12,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  expandButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'transparent',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedVideoContainer: {
    backgroundColor: '#000',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  expandedVideo: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    backgroundColor: 'transparent',
    zIndex: 20,
  },
}); 