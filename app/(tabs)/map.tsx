import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Animated, Alert, Image } from 'react-native';
import MapView, { Marker, MapStyleElement, Region, Callout } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Entypo } from '@expo/vector-icons';
import { useColorScheme, Appearance } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MapGroupCard } from '../../components/MapGroupCard';
import { getActiveDinnerParties, getUserGroup, createPartyRequest } from '../../services/groups';
import { useAuth } from '../../hooks/useAuth';

// Import the custom map pin image
import MapPinImage from '../../assets/images/DP_map_pin.png';

// Create a reusable map pin component that will be shared across all markers
const MapPin = React.memo(() => (
  <View style={styles.markerContainer}>
    <Image 
      source={MapPinImage} 
      style={styles.mapPinImage}
      resizeMode="contain"
      fadeDuration={0}
    />
  </View>
));

// Theme color for the app
const PRIMARY_COLOR = '#4B2E83'; // Purple color

// SDSU coordinates and campus size - Slightly zoomed out to show more area
const SDSU_REGION = {
  latitude: 32.7757,
  longitude: -117.0719,
  latitudeDelta: 0.025,    // Increased from 0.015 to show more area
  longitudeDelta: 0.025,   // Increased from 0.015 to show more area
};

// Define the actual campus boundaries (moderately expanded from SDSU campus)
const CAMPUS_BOUNDS = {
  north: 32.7907,  // Further expanded north
  south: 32.7607,  // Further expanded south
  east: -117.0569, // Further expanded east
  west: -117.0869  // Further expanded west
};

// Constants for pin displacement
const MAX_DISPLACEMENT = 0.0004; // Decreased from 0.0005 (~40 meters instead of ~50 meters)

// Define the type for profile pics to match the modal's expectations
type ProfilePicType = 'ian' | 'eli' | 'adam';

// Update mock data with proper typing
const MOCK_GROUP_DATA = {
  hostName: 'Ian',
  members: [
    { name: 'Ian', profilePic: 'ian' as ProfilePicType },
    { name: 'Eli', profilePic: 'eli' as ProfilePicType },
    { name: 'Adam', profilePic: 'adam' as ProfilePicType },
  ],
  date: 'Friday, 2/25/2025',
  time: '7:00pm',
  menu: {
    entree: 'Steak',
    sides: ['Avocado', 'Grilled Vegetables'],
  },
};

// Custom map style to hide POIs and unnecessary features
const mapStyle: MapStyleElement[] = [
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'transit',
    elementType: 'all',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'landscape',
    elementType: 'all',
    stylers: [{ color: '#f5f5f5' }]
  }
];

// Viewport state tracking
interface ViewportState {
  isAnimating: boolean;
  lastUpdate: number;
  isWithinCampus: boolean;
}

interface DinnerPartyWithGroup {
  party: {
    id: string;
    latitude: number;
    longitude: number;
    main_dish: string;
    side: string;
    address: string;
    created_at: string;
  };
  group: {
    id: string;
    video_links: string[];
    leader: {
      display_name: string;
      profile_picture_url: string;
    };
    members: Array<{
      display_name: string;
      profile_picture_url: string;
    }>;
  };
}

// Interface for a party with its original coordinates
interface PartyWithDisplayCoords extends DinnerPartyWithGroup {
  displayCoordinates: {
    latitude: number;
    longitude: number;
  };
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [selectedParty, setSelectedParty] = useState<DinnerPartyWithGroup | null>(null);
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const viewportState = useRef<ViewportState>({
    isAnimating: false,
    lastUpdate: Date.now(),
    isWithinCampus: true
  });
  const [dinnerParties, setDinnerParties] = useState<PartyWithDisplayCoords[]>([]);
  const [userGroup, setUserGroup] = useState<{ group: { id: string; leader_id: string; } | null; isLeader: boolean }>({
    group: null,
    isLeader: false
  });
  const { user } = useAuth();
  const hasLoadedParties = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Function to add random displacement to coordinates
  const addDisplacement = (latitude: number, longitude: number) => {
    // Generate random displacement between -MAX_DISPLACEMENT and +MAX_DISPLACEMENT
    const latDisplacement = (Math.random() * 2 - 1) * MAX_DISPLACEMENT;
    const lngDisplacement = (Math.random() * 2 - 1) * MAX_DISPLACEMENT;
    
    return {
      latitude: latitude + latDisplacement,
      longitude: longitude + lngDisplacement
    };
  };

  // Function to fetch dinner parties
  const fetchDinnerParties = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('Fetching dinner parties...');
      const parties = await getActiveDinnerParties();
      
      // Add random displacement to each party's coordinates
      const partiesWithDisplacement = parties.map(party => ({
        ...party,
        displayCoordinates: addDisplacement(
          party.party.latitude,
          party.party.longitude
        )
      }));
      
      setDinnerParties(partiesWithDisplacement);
      hasLoadedParties.current = true;
      console.log(`Loaded ${partiesWithDisplacement.length} dinner parties`);
    } catch (error) {
      console.error('Failed to fetch dinner parties:', error);
    }
  }, [user?.id]);

  // Fetch user's group info when tab is focused
  useFocusEffect(
    useCallback(() => {
      async function fetchUserGroup() {
        if (!user?.id) return;
        try {
          const groupInfo = await getUserGroup(user.id);
          setUserGroup({
            group: groupInfo.group ? { id: groupInfo.group.id, leader_id: groupInfo.group.leader_id } : null,
            isLeader: groupInfo.isLeader
          });
        } catch (error) {
          console.error('Failed to fetch user group:', error);
        }
      }

      fetchUserGroup();
    }, [user?.id])
  );

  // Pre-load the map pin image
  useEffect(() => {
    // Force image caching by creating a dummy image and loading it
    Image.prefetch(Image.resolveAssetSource(MapPinImage).uri);
  }, []);

  // Fetch dinner parties only once when the component mounts
  useEffect(() => {
    if (!user?.id || hasLoadedParties.current) return;
    fetchDinnerParties();
  }, [user?.id, fetchDinnerParties]);

  // Always reload dinner parties when the tab is focused
  useFocusEffect(
    useCallback(() => {
      // When the tab is focused, fetch the latest dinner parties
      if (user?.id) {
        console.log('Tab focused, fetching dinner parties...');
        fetchDinnerParties();
      }
      
      // When the tab loses focus, clear the dinner parties
      return () => {
        console.log('Tab unfocused, clearing dinner parties...');
        setDinnerParties([]);
        setSelectedParty(null); // Clear selected party to prevent stale data
      };
    }, [user?.id, fetchDinnerParties])
  );

  // Add a check to ensure parties are loaded when map is ready
  useEffect(() => {
    if (isMapReady && user?.id && dinnerParties.length === 0 && !hasLoadedParties.current) {
      console.log('Map is ready but no parties loaded. Attempting to fetch parties...');
      fetchDinnerParties();
    }
  }, [isMapReady, user?.id, dinnerParties.length, fetchDinnerParties]);

  // Use memo to prevent unnecessary re-rendering of markers
  const memoizedMarkers = useMemo(() => {
    return dinnerParties.map((partyData) => (
      <Marker
        key={partyData.party.id}
        coordinate={partyData.displayCoordinates}
        onPress={() => setSelectedParty(partyData)}
        tracksViewChanges={false}
        anchor={{ x: 0.5, y: 1.0 }}
      >
        <MapPin />
      </Marker>
    ));
  }, [dinnerParties]);

  useEffect(() => {
    const updateBrightness = () => {
      const isDark = Appearance.getColorScheme() === 'dark';
      setBrightness(isDark ? 0.7 : 1);
    };

    updateBrightness();
    const subscription = Appearance.addChangeListener(updateBrightness);

    return () => {
      subscription.remove();
    };
  }, []);

  // Calculate if the current viewport includes the campus
  const isViewportIncludingCampus = (region: Region): boolean => {
    const viewportNorth = region.latitude + (region.latitudeDelta / 2);
    const viewportSouth = region.latitude - (region.latitudeDelta / 2);
    const viewportEast = region.longitude + (region.longitudeDelta / 2);
    const viewportWest = region.longitude - (region.longitudeDelta / 2);

    return (
      viewportNorth >= CAMPUS_BOUNDS.south &&
      viewportSouth <= CAMPUS_BOUNDS.north &&
      viewportEast >= CAMPUS_BOUNDS.west &&
      viewportWest <= CAMPUS_BOUNDS.east
    );
  };

  // Check if we're zoomed too far out
  const isZoomTooFarOut = (region: Region): boolean => {
    // If zoomed out beyond 3x the initial zoom level (increased from 2x)
    return region.latitudeDelta > SDSU_REGION.latitudeDelta * 3;
  };

  // Check if we're centered on campus
  const isCenteredOnCampus = (region: Region): boolean => {
    const latDiff = Math.abs(region.latitude - SDSU_REGION.latitude);
    const lngDiff = Math.abs(region.longitude - SDSU_REGION.longitude);
    
    return (
      latDiff < 0.008 && // Increased from 0.005 (~800m instead of ~500m)
      lngDiff < 0.008 && // Increased from 0.005
      region.latitudeDelta <= SDSU_REGION.latitudeDelta * 2 // Increased from 1.5
    );
  };

  const handleRegionChange = (region: Region) => {
    const now = Date.now();
    
    if (now - viewportState.current.lastUpdate < 100) {
      return;
    }
    
    viewportState.current.lastUpdate = now;

    const shouldShowButton = 
      isZoomTooFarOut(region) ||
      !isViewportIncludingCampus(region) ||
      !isCenteredOnCampus(region);

    if (shouldShowButton !== showReturnButton) {
      setShowReturnButton(shouldShowButton);
      // Trigger fade animation
      Animated.timing(fadeAnim, {
        toValue: shouldShowButton ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleReturnToSDSU = () => {
    viewportState.current.isAnimating = true;
    
    // Start fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    mapRef.current?.animateToRegion(SDSU_REGION, 500);
    
    setTimeout(() => {
      viewportState.current.isAnimating = false;
      setShowReturnButton(false);
    }, 600);
  };

  const handleRequestAttend = async (hostGroupId: string) => {
    try {
      if (!userGroup.group) {
        Alert.alert(
          "No Group",
          "You need to be in a group to request to attend a dinner party.",
          [{ 
            text: "OK",
            onPress: () => {
              // Add delay to ensure animations have time to reset
              setTimeout(() => {
                setSelectedParty(null);
              }, 100);
            }
          }]
        );
        return;
      }

      if (!userGroup.isLeader) {
        Alert.alert(
          "Not Group Leader",
          "Only the group leader can request to attend dinner parties.",
          [{ 
            text: "OK",
            onPress: () => {
              // Add delay to ensure animations have time to reset
              setTimeout(() => {
                setSelectedParty(null);
              }, 100);
            } 
          }]
        );
        return;
      }

      // Create the party request
      await createPartyRequest(userGroup.group.id, hostGroupId);
      
      Alert.alert(
        "Request Sent",
        "Your request to join this dinner party has been sent!",
        [{ 
          text: "OK", 
          onPress: () => {
            // Add delay to ensure animations have time to reset
            setTimeout(() => {
              setSelectedParty(null);
            }, 100);
          } 
        }]
      );
    } catch (error: any) {
      // Handle specific error messages
      let errorMessage = error.message || 'Failed to send request. Please try again.';
      let errorTitle = "Error";
      
      // Provide more user-friendly messages for common errors
      if (errorMessage.includes('needs to be finalized')) {
        errorTitle = "Incomplete Group Profile";
        errorMessage = "Your group profile needs to be completed before joining dinner parties. Please make sure your group has at least 3 members and has uploaded videos.";
      }
      
      Alert.alert(
        errorTitle, 
        errorMessage,
        [{ 
          text: "OK",
          onPress: () => {
            // Add delay to ensure animations have time to reset
            setTimeout(() => {
              setSelectedParty(null);
            }, 100);
          } 
        }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={SDSU_REGION}
          customMapStyle={mapStyle}
          showsPointsOfInterest={false}
          showsBuildings={false}
          showsTraffic={false}
          showsIndoors={false}
          showsCompass={false}
          onRegionChangeComplete={handleRegionChange}
          onMapReady={() => setIsMapReady(true)}
        >
          {memoizedMarkers}
        </MapView>

        <Animated.View 
          style={[
            styles.returnButtonContainer,
            {
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })
              }]
            }
          ]}
          pointerEvents={showReturnButton ? 'auto' : 'none'}
        >
          <TouchableOpacity 
            style={styles.returnButton}
            onPress={handleReturnToSDSU}
          >
            <Text style={styles.returnButtonText}>Back to Campus</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {selectedParty && (
        <MapGroupCard
          group={{
            hostName: selectedParty.group.leader.display_name,
            members: selectedParty.group.members.map(member => ({
              name: member.display_name,
              profilePic: member.profile_picture_url,
            })),
            menu: {
              entree: selectedParty.party.main_dish,
              sides: [selectedParty.party.side],
            },
            videoLinks: selectedParty.group.video_links
          }}
          brightness={brightness}
          onClose={() => setSelectedParty(null)}
          onRequestAttend={() => {
            // Check if user is trying to join their own group's party
            if (userGroup.group && userGroup.group.id === selectedParty.group.id) {
              Alert.alert(
                "Can't Join Own Party",
                "This is your group's dinner party!",
                [{ 
                  text: "OK", 
                  onPress: () => {
                    // Add delay to ensure animations have time to reset
                    setTimeout(() => {
                      setSelectedParty(null);
                    }, 100);
                  } 
                }]
              );
              return;
            }
            
            handleRequestAttend(selectedParty.group.id);
          }}
          userGroup={userGroup}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnButtonContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 'auto',
  },
  returnButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 39,
    height: 39,
  },
  mapPinImage: {
    width: 39,
    height: 39,
  },
}); 