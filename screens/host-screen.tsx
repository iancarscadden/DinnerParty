import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { getUserGroup, getGroupDinnerParty, getPartyRequests, getAttendeeGroupInfo, cancelAttendance } from '../services/groups';
import { supabase } from '../services/supabase';
import { CreatePartyForm } from '../components/CreatePartyForm';
import { DinnerParty } from '../services/groups';
import { SvgXml } from 'react-native-svg';
import { RequestingGroupsSwiper } from '../components/RequestingGroupsSwiper';

/* Card swiping implementation saved for later
import Animated, { useSharedValue, withSpring, FadeIn, FadeOut, withTiming } from 'react-native-reanimated';
import { GroupCard } from '../components/GroupCard';
import { Dimensions, useColorScheme, Appearance } from 'react-native';
const { width } = Dimensions.get('window');
const SWIPE_DURATION = 400;
const MOCK_REQUESTING_GROUPS = [ ... ]; // Mock data removed
*/

// SVG for house icon
const houseSvg = `<svg fill="#4B2E83" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
  <path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/>
</svg>`;

// SVG for clipboard icon
const clipboardSvg = `<svg fill="#4B2E83" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
  <path d="M192 0c-41.8 0-77.4 26.7-90.5 64H64C28.7 64 0 92.7 0 128V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H282.5C269.4 26.7 233.8 0 192 0zm0 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM112 192H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/>
</svg>`;

// SVG for dinner icon
const dinnerSvg = `<svg fill="#FFFFFF" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
  <path d="M416 0C400 0 288 32 288 176V288c0 35.3 28.7 64 64 64h32V480c0 17.7 14.3 32 32 32s32-14.3 32-32V352 240 32c0-17.7-14.3-32-32-32zM64 16C64 7.8 57.9 1 49.7 .1S34.2 4.6 32.4 12.5L2.1 148.8C.7 155.1 0 161.5 0 167.9c0 45.9 35.1 83.6 80 87.7V480c0 17.7 14.3 32 32 32s32-14.3 32-32V255.6c44.9-4.1 80-41.8 80-87.7c0-6.4-.7-12.8-2.1-19.1L191.6 12.5c-1.8-8-9.3-13.3-17.4-12.4S160 7.8 160 16V150.2c0 5.4-4.4 9.8-9.8 9.8c-5.1 0-9.3-3.9-9.8-9L127.9 14.6C127.2 6.3 120.3 0 112 0s-15.2 6.3-15.9 14.6L83.7 151c-.5 5.1-4.7 9-9.8 9c-5.4 0-9.8-4.4-9.8-9.8V16zm48.3 152l-.3 0-.3 0 .3-.7 .3 .7z"/>
</svg>`;

// SVG for disabled dinner icon
const disabledDinnerSvg = `<svg fill="#999999" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
  <path d="M416 0C400 0 288 32 288 176V288c0 35.3 28.7 64 64 64h32V480c0 17.7 14.3 32 32 32s32-14.3 32-32V352 240 32c0-17.7-14.3-32-32-32zM64 16C64 7.8 57.9 1 49.7 .1S34.2 4.6 32.4 12.5L2.1 148.8C.7 155.1 0 161.5 0 167.9c0 45.9 35.1 83.6 80 87.7V480c0 17.7 14.3 32 32 32s32-14.3 32-32V255.6c44.9-4.1 80-41.8 80-87.7c0-6.4-.7-12.8-2.1-19.1L191.6 12.5c-1.8-8-9.3-13.3-17.4-12.4S160 7.8 160 16V150.2c0 5.4-4.4 9.8-9.8 9.8c-5.1 0-9.3-3.9-9.8-9L127.9 14.6C127.2 6.3 120.3 0 112 0s-15.2 6.3-15.9 14.6L83.7 151c-.5 5.1-4.7 9-9.8 9c-5.4 0-9.8-4.4-9.8-9.8V16zm48.3 152l-.3 0-.3 0 .3-.7 .3 .7z"/>
</svg>`;

export default function HostScreen() {
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeParty, setActiveParty] = useState<DinnerParty | null>(null);
  const [hasRequests, setHasRequests] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [attendeeInfo, setAttendeeInfo] = useState<any>(null);

  /* State for card swiping saved for later
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const colorScheme = useColorScheme();
  const [brightness, setBrightness] = useState(1);
  const glowOpacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  */

  useEffect(() => {
    checkGroupStatus();
  }, []);

  const checkGroupStatus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { group: userGroup, isLeader: userIsLeader } = await getUserGroup(user.id);
      setGroup(userGroup);
      setIsLeader(userIsLeader);

      if (userGroup) {
        // Check if group has an active dinner party
        const partyData = await getGroupDinnerParty(userGroup.id);
        setActiveParty(partyData);

        if (partyData) {
          // Check for party requests
          const requests = await getPartyRequests(userGroup.id);
          const hasNewRequests = requests.length > 0;
          setHasRequests(hasNewRequests);
          setShowRequests(hasNewRequests && !userGroup.accepted_attendee_group_id);
          
          // If we have an attendee, get their info
          if (userGroup.accepted_attendee_group_id) {
            const attendeeGroupInfo = await getAttendeeGroupInfo(userGroup.id);
            setAttendeeInfo(attendeeGroupInfo);
          } else {
            setAttendeeInfo(null);
          }
        }
      }
    } catch (error) {
      console.error('Error checking group status:', error);
      Alert.alert('Error', 'Failed to check group status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHostParty = () => {
    if (!group) {
      Alert.alert('No Group', 'You need to be in a group to host a party.');
      return;
    }

    if (!group.is_live) {
      Alert.alert('Group Not Ready', 'Your group needs a complete profile to host a party.');
      return;
    }

    if (!isLeader) {
      Alert.alert('Not Authorized', 'Only the group leader can host a party.');
      return;
    }

    setShowCreateForm(true);
  };

  const handlePartyCreated = () => {
    setShowCreateForm(false);
    checkGroupStatus();
  };

  const handleRequestsCleared = () => {
    setHasRequests(false);
    setShowRequests(false);
  };

  const handleRequestAccepted = () => {
    // Refresh the group status to update UI with the new attendant
    setTimeout(() => {
      checkGroupStatus();
    }, 1000); // Small delay to ensure database updates are complete
  };

  const handleCancelAttendant = async () => {
    if (!group) return;
    
    Alert.alert(
      'Remove Attendee',
      'Are you sure you want to remove this group from your dinner party?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await cancelAttendance(group.id, 'host');
              
              if (success) {
                setAttendeeInfo(null);
                await checkGroupStatus();
                Alert.alert('Success', 'Attendee group has been removed');
              } else {
                Alert.alert('Error', 'Failed to remove attendee');
              }
            } catch (error) {
              console.error('Error removing attendee:', error);
              Alert.alert('Error', 'Failed to remove attendee. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  /* Card swiping handlers saved for later
  const handleSwipeLeft = () => { ... };
  const handleSwipeRight = () => { ... };
  const resetState = () => { ... };
  */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (showCreateForm) {
    return (
      <CreatePartyForm
        groupId={group.id}
        onCancel={() => setShowCreateForm(false)}
        onSuccess={handlePartyCreated}
      />
    );
  }

  if (showRequests && group && activeParty) {
    return (
      <View style={styles.container}>
        <RequestingGroupsSwiper
          hostGroupId={group.id}
          onRequestsCleared={handleRequestsCleared}
          onRequestAccepted={handleRequestAccepted}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!group && (
          <View style={styles.messageContainer}>
            <View style={styles.iconPlaceholder}>
              <SvgXml xml={houseSvg} width={40} height={40} />
            </View>
            <Text style={styles.messageTitle}>No Group Found</Text>
            <Text style={styles.message}>
              You need to be in a group with a complete profile to host a party.
            </Text>
          </View>
        )}

        {group && !group.is_live && (
          <View style={styles.messageContainer}>
            <View style={styles.iconPlaceholder}>
              <SvgXml xml={clipboardSvg} width={40} height={40} />
            </View>
            <Text style={styles.messageTitle}>Profile Incomplete</Text>
            <Text style={styles.message}>
              Your group needs to complete its profile before hosting a party.
            </Text>
          </View>
        )}

        {group && group.is_live && activeParty && (
          <View style={styles.activePartyContainer}>
            <View style={styles.partyHeaderContainer}>
              <Text style={styles.partyTitle}>Your Active Party</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            </View>
            
            <View style={styles.partyDetailsCard}>
              <View style={styles.partyDetailRow}>
                <Text style={styles.partyDetailLabel}>Main Dish:</Text>
                <Text style={styles.partyDetailValue}>{activeParty.main_dish}</Text>
              </View>
              
              <View style={styles.partyDetailRow}>
                <Text style={styles.partyDetailLabel}>Side Dish:</Text>
                <Text style={styles.partyDetailValue}>{activeParty.side}</Text>
              </View>
              
              <View style={styles.partyDetailRow}>
                <Text style={styles.partyDetailLabel}>Location:</Text>
                <Text style={styles.partyDetailValue}>{activeParty.address}</Text>
              </View>
            </View>
            
            {attendeeInfo && attendeeInfo.attendeeGroup ? (
              <View style={styles.attendeeContainer}>
                <Text style={styles.attendeeTitle}>Attending Group</Text>
                
                <View style={styles.attendeeDetailsCard}>
                  <View style={styles.attendeeLeaderRow}>
                    <Image 
                      source={{ uri: attendeeInfo.attendeeGroup.leader.profile_picture_url }}
                      style={styles.leaderImage}
                    />
                    <Text style={styles.leaderName}>
                      {attendeeInfo.attendeeGroup.leader.display_name}'s Group
                    </Text>
                  </View>
                  
                  <View style={styles.membersContainer}>
                    {attendeeInfo.attendeeGroup.members.map((member: any, index: number) => (
                      <View key={index} style={styles.memberItem}>
                        <Image 
                          source={{ uri: member.user.profile_picture_url }}
                          style={styles.memberImage}
                        />
                        <Text style={styles.memberName}>{member.user.display_name}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {isLeader && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelAttendant}
                    >
                      <Text style={styles.cancelButtonText}>Remove Attendee</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : hasRequests ? (
              <TouchableOpacity
                style={styles.viewRequestsButton}
                onPress={() => setShowRequests(true)}
              >
                <Text style={styles.viewRequestsText}>View Party Requests</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.partyMessage}>
                Your party is active! Requests from other groups will appear here.
              </Text>
            )}
          </View>
        )}

        {group && group.is_live && !activeParty && (
          <View style={styles.hostButtonContainer}>
            {isLeader ? (
              <>
                <Text style={styles.hostInfoText}>
                  As the group leader, you can host a dinner party for other groups to join.
                </Text>
                <TouchableOpacity
                  style={styles.hostButton}
                  onPress={handleHostParty}
                >
                  <Text style={styles.hostButtonText}>Host a Dinner Party</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.hostInfoText}>
                  Only the group leader can host a dinner party.
                </Text>
                <TouchableOpacity
                  style={[styles.hostButton, styles.disabledButton]}
                  disabled={true}
                >
                  <Text style={[styles.hostButtonText, styles.disabledText]}>Only Leader Can Host</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  messageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  messageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  hostButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  hostInfoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  hostButton: {
    backgroundColor: '#4B2E83',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hostButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  disabledText: {
    color: '#999',
  },
  activePartyContainer: {
    padding: 20,
  },
  partyHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  partyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B2E83',
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  partyDetailsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  partyDetailRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  partyDetailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  partyDetailValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  partyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  viewRequestsButton: {
    backgroundColor: '#4B2E83',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  viewRequestsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  attendeeContainer: {
    marginTop: 20,
  },
  attendeeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4B2E83',
    marginBottom: 15,
  },
  attendeeDetailsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  attendeeLeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  leaderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  leaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  membersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  memberItem: {
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 15,
    width: 70,
  },
  memberImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 5,
  },
  memberName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4B2E83',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#4B2E83',
    fontSize: 16,
    fontWeight: '600',
  },
}); 