import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, Dimensions, useColorScheme, Appearance } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withSpring, FadeIn, FadeOut, withTiming } from 'react-native-reanimated';
import { GroupCard } from './GroupCard';
import { getPartyRequests, acceptPartyRequest, clearPartyRequests } from '../services/groups';
import { supabase } from '../services/supabase';
import { ActivityIndicator } from 'react-native';

const { width } = Dimensions.get('window');

// Animation constants
const SWIPE_DURATION = 400;

interface RequestingGroupsProps {
  hostGroupId: string;
  onRequestsCleared?: () => void;
  onRequestAccepted?: () => void;
}

export function RequestingGroupsSwiper({ hostGroupId, onRequestsCleared, onRequestAccepted }: RequestingGroupsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [requests, setRequests] = useState<Array<{
    request: { id: string };
    requestingGroup: {
      id: string;
      video_links: string[];
      leader: { display_name: string; profile_picture_url: string };
      members: Array<{ display_name: string; profile_picture_url: string }>;
    };
  }>>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const [brightness, setBrightness] = useState(1);
  const glowOpacity = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    loadRequests();
  }, [hostGroupId]);

  useEffect(() => {
    if (colorScheme === 'dark') {
      setBrightness(0.7);
    } else {
      setBrightness(1);
    }
  }, [colorScheme]);

  const loadRequests = async () => {
    try {
      console.log('[RequestingGroupsSwiper] Starting to load requests for hostGroupId:', hostGroupId);
      setLoading(true);
      const partyRequests = await getPartyRequests(hostGroupId);
      console.log('[RequestingGroupsSwiper] Loaded party requests:', { 
        count: partyRequests.length,
        requestIds: partyRequests.map(req => req.request.id),
        groupIds: partyRequests.map(req => req.requestingGroup.id)
      });
      
      setRequests(partyRequests);
      setIsFinished(partyRequests.length === 0);
      console.log('[RequestingGroupsSwiper] Requests state updated, isFinished:', partyRequests.length === 0);
    } catch (error) {
      console.error('[RequestingGroupsSwiper] Error loading party requests:', error);
      Alert.alert('Error', 'Failed to load party requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeLeft = () => {
    if (currentIndex < requests.length - 1) {
      translateX.value = withSpring(-width * 1.5, { 
        stiffness: 100, 
        damping: 20,
        velocity: -1
      });
      glowOpacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        translateX.value = 0;
      }, SWIPE_DURATION);
    } else {
      translateX.value = withSpring(-width * 1.5, { 
        stiffness: 100, 
        damping: 20,
        velocity: -1
      });
      glowOpacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => {
        setIsFinished(true);
      }, SWIPE_DURATION);
    }
  };

  const handleSwipeRight = async () => {
    const currentRequest = requests[currentIndex];
    console.log('[RequestingGroupsSwiper] handleSwipeRight called for request:', {
      requestId: currentRequest.request.id,
      requestingGroupId: currentRequest.requestingGroup.id,
      leaderName: currentRequest.requestingGroup.leader.display_name,
      currentIndex
    });
    
    Alert.alert(
      'Accept Group',
      'You can only accept one group to attend. Are you sure?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel', 
          onPress: () => {
            console.log('[RequestingGroupsSwiper] Accept dialog canceled');
            translateX.value = withSpring(0, { 
              stiffness: 100, 
              damping: 20,
              velocity: -1
            });
            glowOpacity.value = withTiming(0, { duration: 200 });
          }
        },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              console.log('[RequestingGroupsSwiper] Accepting request:', currentRequest.request.id);
              await acceptPartyRequest(currentRequest.request.id);
              console.log('[RequestingGroupsSwiper] Request accepted successfully, starting animations');
              
              translateX.value = withSpring(width * 1.5, { 
                stiffness: 100, 
                damping: 20,
                velocity: 1
              });
              glowOpacity.value = withTiming(0, { duration: 200 });
              
              setTimeout(() => {
                console.log('[RequestingGroupsSwiper] Animation timeout complete, updating UI state');
                setIsAccepted(true);
                console.log('[RequestingGroupsSwiper] Calling onRequestAccepted callback');
                onRequestAccepted?.();
              }, SWIPE_DURATION);
            } catch (error) {
              console.error('[RequestingGroupsSwiper] Error accepting party request:', error);
              Alert.alert('Error', 'Failed to accept party request. Please try again.');
              translateX.value = withSpring(0);
              glowOpacity.value = withTiming(0, { duration: 200 });
            }
          }
        },
      ]
    );
  };

  const handleClearRequests = async () => {
    try {
      const success = await clearPartyRequests(hostGroupId);
      if (success) {
        onRequestsCleared?.();
      } else {
        throw new Error('Failed to clear requests');
      }
    } catch (error) {
      console.error('Error clearing party requests:', error);
      Alert.alert('Error', 'Failed to clear requests. Please try again.');
    }
  };

  const resetState = () => {
    loadRequests();
    setCurrentIndex(0);
    setIsFinished(false);
    setIsAccepted(false);
    translateX.value = 0;
    glowOpacity.value = 0;
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  if (isAccepted) {
    const acceptedGroup = requests[currentIndex].requestingGroup;
    return (
      <Animated.View 
        style={styles.emptyContainer}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
      >
        <Text style={styles.emptyText}>Group accepted!</Text>
        <Text style={styles.subEmptyText}>
          {acceptedGroup.leader.display_name}'s group will be attending your dinner party.
        </Text>
      </Animated.View>
    );
  }

  if (isFinished) {
    return (
      <Animated.View 
        style={styles.emptyContainer}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
      >
        <Text style={styles.emptyText}>No more groups to see</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={resetState}>
            <Text style={styles.buttonText}>Replay Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.clearButton]} 
            onPress={handleClearRequests}
          >
            <Text style={[styles.buttonText, styles.clearButtonText]}>Clear Requests</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View 
        style={styles.cardContainer}
        entering={FadeIn.duration(200)}
      >
        {requests.map((request, index) => {
          const shouldRender = index === currentIndex || index === currentIndex + 1;
          if (!shouldRender) return null;
          
          return (
            <GroupCard
              key={request.requestingGroup.id}
              group={{
                members: request.requestingGroup.members.map(member => ({
                  name: member.display_name,
                  profilePic: member.profile_picture_url
                })),
                videoLinks: request.requestingGroup.video_links
              }}
              brightness={brightness}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              isActive={index === currentIndex}
              glowOpacity={glowOpacity}
              translateX={translateX}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 10,
    textAlign: 'center',
  },
  subEmptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
  button: {
    backgroundColor: '#4B2E83',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4B2E83',
  },
  clearButtonText: {
    color: '#4B2E83',
  },
}); 