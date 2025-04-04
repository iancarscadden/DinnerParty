import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const PADDING_HORIZONTAL = 20;
const TAB_WIDTH = (width - PADDING_HORIZONTAL * 2) / 3;

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

export type TabType = 'attend' | 'group' | 'host';

interface SocialSubTabsProps {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
}

export function SocialSubTabs({ activeTab, onTabPress }: SocialSubTabsProps) {
  const attendScale = useSharedValue(1);
  const groupScale = useSharedValue(1);
  const hostScale = useSharedValue(1);

  useEffect(() => {
    // Reset all scales to 1 with timing
    attendScale.value = withTiming(1, { duration: 200 });
    groupScale.value = withTiming(1, { duration: 200 });
    hostScale.value = withTiming(1, { duration: 200 });

    // Animate the active tab scale
    switch (activeTab) {
      case 'attend':
        attendScale.value = withSpring(1.2, SPRING_CONFIG);
        break;
      case 'group':
        groupScale.value = withSpring(1.2, SPRING_CONFIG);
        break;
      case 'host':
        hostScale.value = withSpring(1.2, SPRING_CONFIG);
        break;
    }
  }, [activeTab]);

  const attendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: attendScale.value }]
  }));

  const groupStyle = useAnimatedStyle(() => ({
    transform: [{ scale: groupScale.value }]
  }));

  const hostStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hostScale.value }]
  }));

  return (
    <View style={styles.tabContainer}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabPress('attend')}
        >
          <Animated.Text 
            style={[
              styles.tabText, 
              activeTab === 'attend' && styles.activeTabText,
              attendStyle
            ]}
          >
            Attend
          </Animated.Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabPress('group')}
        >
          <Animated.Text 
            style={[
              styles.tabText, 
              activeTab === 'group' && styles.activeTabText,
              groupStyle
            ]}
          >
            Group
          </Animated.Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabPress('host')}
        >
          <Animated.Text 
            style={[
              styles.tabText, 
              activeTab === 'host' && styles.activeTabText,
              hostStyle
            ]}
          >
            Host
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: PADDING_HORIZONTAL,
    paddingVertical: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#4B2E83',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
    height: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
}); 