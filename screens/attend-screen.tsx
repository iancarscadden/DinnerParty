import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { supabase } from '../services/supabase';
import { getUserGroup, getHostGroupInfo, cancelAttendance } from '../services/groups';
import { AttendGroupCard } from '../components/AttendGroupCard';

// SVG for house icon (reusing from host-screen)
const houseSvg = `<svg fill="#4B2E83" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
  <path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/>
</svg>`;

export default function AttendScreen() {
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [hostInfo, setHostInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAttendanceStatus();
  }, []);

  const checkAttendanceStatus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { group: userGroup, isLeader: userIsLeader } = await getUserGroup(user.id);
      setGroup(userGroup);
      setIsLeader(userIsLeader);

      if (userGroup) {
        // Check if group is attending a dinner party
        if (userGroup.attending_host_group_id) {
          const hostGroupInfo = await getHostGroupInfo(userGroup.id);
          setHostInfo(hostGroupInfo);
        } else {
          setHostInfo(null);
        }
      }
    } catch (error) {
      console.error('Error checking attendance status:', error);
      Alert.alert('Error', 'Failed to check attendance status. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelAttendance = async () => {
    if (!group) return;
    
    Alert.alert(
      'Cancel Attendance',
      'Are you sure you want to cancel your attendance to this dinner party?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Call the cancelAttendance function with 'attendee' instead of false
              const success = await cancelAttendance(group.id, 'attendee');
              
              if (success) {
                // Refresh the data
                setHostInfo(null);
                checkAttendanceStatus();
              } else {
                throw new Error('Failed to cancel attendance');
              }
            } catch (error) {
              console.error('Error canceling attendance:', error);
              Alert.alert('Error', 'Failed to cancel attendance. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If the group is attending a dinner party, show the attend card
  if (hostInfo && hostInfo.hostGroup && group) {
    const hostGroup = hostInfo.hostGroup;
    const dinnerParty = hostInfo.dinnerParty || {};
    const hostLeader = hostGroup.leader || {};
    
    // Prepare group data for the card
    const cardData = {
      hostName: hostLeader.display_name || 'Host',
      phoneNumber: hostLeader.phone_num || '0000000000', // Use leader's phone number if available
      members: (hostGroup.members || []).map((member: any) => ({
        name: member.user.display_name,
        profilePic: member.user.profile_picture_url || ''
      })),
      menu: {
        entree: dinnerParty.main_dish || 'TBD',
        sides: [dinnerParty.side || 'TBD']
      },
      videoLinks: hostGroup.video_links || [] // Add the video links from the host group
    };
    
    console.log('Attend card data:', JSON.stringify({
      ...cardData,
      members: cardData.members.length,
      hasVideos: (cardData.videoLinks || []).length > 0
    }));
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cardContainer}>
          <AttendGroupCard
            group={cardData}
            brightness={1}
            onCancelAttendance={isLeader ? handleCancelAttendance : () => {
              Alert.alert('Not Authorized', 'Only the group leader can cancel attendance.');
            }}
            screenContext="attend"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Default view if not attending a dinner party
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.messageContainer}>
          <View style={styles.iconPlaceholder}>
            <SvgXml xml={houseSvg} width={40} height={40} />
          </View>
          <Text style={styles.messageTitle}>No Dinner Plans Yet</Text>
          <Text style={styles.message}>
            When your group is accepted to attend a dinner party, the details will appear here.
          </Text>
        </View>
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
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
}); 