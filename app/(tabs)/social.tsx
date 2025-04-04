import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import AttendScreen from '../../screens/attend-screen';
import GroupScreen from '../../screens/group-screen';
import HostScreen from '../../screens/host-screen';
import { Stack } from 'expo-router';
import { SocialSubTabs, TabType } from '../../components/SocialSubTabs';

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 150,
  mass: 0.5,
}; // Less bouncy spring configuration

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('group');
  
  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'attend':
        return <AttendScreen />;
      case 'group':
        return <GroupScreen />;
      case 'host':
        return <HostScreen />;
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.tabWrapper}>
            <SocialSubTabs
              activeTab={activeTab}
              onTabPress={handleTabPress}
            />
          </View>
          <View style={styles.screenContainer}>
            {renderContent()}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  tabWrapper: {
    backgroundColor: '#fff',
    zIndex: 1,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 