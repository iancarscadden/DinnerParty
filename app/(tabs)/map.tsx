import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Animated, Alert } from 'react-native';
import MapView, { Marker, MapStyleElement, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { useColorScheme, Appearance } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MapGroupCard } from '../../components/MapGroupCard';
import { getActiveDinnerParties, getUserGroup, createPartyRequest } from '../../services/groups';
import { useAuth } from '../../hooks/useAuth';

// Define the SVG content directly as a string
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

// SDSU coordinates and campus size
const SDSU_REGION = {
  latitude: 32.7757,
  longitude: -117.0719,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Define the actual campus boundaries (roughly matching SDSU campus)
const CAMPUS_BOUNDS = {
  north: 32.7807,  // North edge of campus
  south: 32.7707,  // South edge of campus
  east: -117.0669, // East edge of campus
  west: -117.0769  // West edge of campus
};

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
  const [dinnerParties, setDinnerParties] = useState<DinnerPartyWithGroup[]>([]);
  const [userGroup, setUserGroup] = useState<{ group: { id: string; leader_id: string; } | null; isLeader: boolean }>({
    group: null,
    isLeader: false
  });
  const { user } = useAuth();

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

  // Fetch dinner parties when tab is focused
  useFocusEffect(
    useCallback(() => {
      async function fetchDinnerParties() {
        if (!user?.id) return;
        try {
          const parties = await getActiveDinnerParties();
          setDinnerParties(parties);
        } catch (error) {
          console.error('Failed to fetch dinner parties:', error);
        }
      }

      fetchDinnerParties();
    }, [user?.id])
  );

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
    // If zoomed out beyond 2x the initial zoom level
    return region.latitudeDelta > SDSU_REGION.latitudeDelta * 2;
  };

  // Check if we're centered on campus
  const isCenteredOnCampus = (region: Region): boolean => {
    const latDiff = Math.abs(region.latitude - SDSU_REGION.latitude);
    const lngDiff = Math.abs(region.longitude - SDSU_REGION.longitude);
    
    return (
      latDiff < 0.005 && // About 500m
      lngDiff < 0.005 && 
      region.latitudeDelta <= SDSU_REGION.latitudeDelta * 1.5
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
          [{ text: "OK" }]
        );
        return;
      }

      if (!userGroup.isLeader) {
        Alert.alert(
          "Not Group Leader",
          "Only the group leader can request to attend dinner parties.",
          [{ text: "OK" }]
        );
        return;
      }

      // Create the party request
      await createPartyRequest(userGroup.group.id, hostGroupId);
      
      Alert.alert(
        "Request Sent",
        "Your request to join this dinner party has been sent!",
        [{ text: "OK", onPress: () => setSelectedParty(null) }]
      );
    } catch (error: any) {
      // Handle specific error messages
      const errorMessage = error.message || 'Failed to send request. Please try again.';
      Alert.alert("Error", errorMessage);
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
        >
          {dinnerParties.map((partyData) => (
            <Marker
              key={partyData.party.id}
              coordinate={{
                latitude: partyData.party.latitude,
                longitude: partyData.party.longitude,
              }}
              onPress={() => setSelectedParty(partyData)}
            >
              <SvgXml xml={mapPinSvg} width={35} height={35} />
            </Marker>
          ))}
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
                [{ text: "OK", onPress: () => setSelectedParty(null) }]
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
  returnButtonContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 'auto',
  },
  returnButton: {
    backgroundColor: '#4B2E83',
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
}); 