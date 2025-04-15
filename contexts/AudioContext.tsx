import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSegments } from 'expo-router';

// Define the type for different tabs in the app
type TabName = 'map' | 'social' | 'profile' | string;

// Define the context interface
interface AudioContextType {
  activeTab: TabName;
  isAudioEnabled: (tabName: TabName) => boolean;
}

// Create the context with default values
const AudioContext = createContext<AudioContextType>({
  activeTab: 'map',
  isAudioEnabled: () => false,
});

// Custom hook to access the audio context
export const useAudio = () => useContext(AudioContext);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const segments = useSegments();
  const [activeTab, setActiveTab] = useState<TabName>('map');

  // Update the active tab based on the current route
  useEffect(() => {
    // Cast segments to string array and check if it contains the tab path
    const segmentsArray = segments as string[];
    
    if (segmentsArray.length >= 2 && segmentsArray[0] === '(tabs)') {
      const tabSegment = segmentsArray[1];
      if (tabSegment) {
        setActiveTab(tabSegment);
        console.log(`Audio context: Active tab changed to ${tabSegment}`);
      }
    }
  }, [segments]);

  // Function to check if audio should be enabled for a specific tab
  const isAudioEnabled = (tabName: TabName): boolean => {
    const enabled = tabName === activeTab;
    // Only log when the state changes to reduce console clutter
    if (tabName === activeTab && !previousTabEnabled.current.has(tabName)) {
      console.log(`Audio enabled for tab: ${tabName}`);
      previousTabEnabled.current.add(tabName);
    } else if (tabName !== activeTab && previousTabEnabled.current.has(tabName)) {
      console.log(`Audio disabled for tab: ${tabName}`);
      previousTabEnabled.current.delete(tabName);
    }
    return enabled;
  };

  // Use a ref to track which tabs have been previously enabled
  const previousTabEnabled = React.useRef(new Set<TabName>());

  return (
    <AudioContext.Provider value={{ activeTab, isAudioEnabled }}>
      {children}
    </AudioContext.Provider>
  );
}; 