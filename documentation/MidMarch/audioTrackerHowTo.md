# Video Audio Tracking Implementation Guide

This document explains how the smart audio switching system works in our application and provides instructions for implementing it in other components.

## Overview

The system enables a "smart audio" experience where only the most visible video in a scrollable list plays audio, while others remain muted. As users scroll through content, the audio automatically switches to the video that is most visible on screen.

## Core Components

### 1. VideoVisibilityTracker

This component wraps around the `ExpandableVideo` component and tracks the visibility of individual videos as users scroll.

**Key Features:**
- Calculates what percentage of the video is currently visible on screen
- Reports visibility changes to the parent component
- Controls audio state (muted/unmuted) based on parent instructions
- Logs audio state changes for debugging purposes

### 2. MapGroupCard (Parent Component)

This component manages the collection of videos and decides which one should play audio.

**Key Features:**
- Maintains a visibility map of all videos
- Tracks the current scroll position
- Determines which video has the highest visibility percentage
- Enables audio only for the most visible video (above 25% threshold)
- Handles scroll events efficiently with throttling

## Implementation Steps

To implement this system in another component:

1. **Set up state variables in your parent component:**
   ```typescript
   const [activeAudioIndex, setActiveAudioIndex] = useState(0);
   const [visibilityMap, setVisibilityMap] = useState<Record<number, number>>({});
   const [scrollViewHeight, setScrollViewHeight] = useState(0);
   const [currentScrollY, setCurrentScrollY] = useState(0);
   ```

2. **Add scroll position tracking:**
   ```typescript
   const scrollHandler = useAnimatedScrollHandler({
     onScroll: (event) => {
       setCurrentScrollY(event.contentOffset.y);
     },
   });
   ```

3. **Implement visibility change handler:**
   ```typescript
   const handleVisibilityChange = useCallback((index: number, visibilityPercentage: number) => {
     setVisibilityMap(prev => {
       // Only update if there's a significant change
       if (Math.abs((prev[index] || 0) - visibilityPercentage) > 5) {
         return {
           ...prev,
           [index]: visibilityPercentage
         };
       }
       return prev;
     });
   }, []);
   ```

4. **Add logic to determine the most visible video:**
   ```typescript
   useEffect(() => {
     if (Object.keys(visibilityMap).length === 0) return;
   
     // Find the video with the highest visibility
     let maxVisibility = 0;
     let maxVisibilityIndex = 0;
   
     Object.entries(visibilityMap).forEach(([indexStr, visibility]) => {
       const index = parseInt(indexStr, 10);
       if (visibility > maxVisibility) {
         maxVisibility = visibility;
         maxVisibilityIndex = index;
       }
     });
   
     // Only switch active audio if visibility is significant
     if (maxVisibility > 25) {
       setActiveAudioIndex(maxVisibilityIndex);
       console.log(`Audio switched to video ${maxVisibilityIndex}`);
     }
   }, [visibilityMap]);
   ```

5. **Set up the ScrollView with proper event handling:**
   ```typescript
   <Animated.ScrollView
     onScroll={scrollHandler}
     scrollEventThrottle={16}
     onLayout={(event) => {
       const { height } = event.nativeEvent.layout;
       setScrollViewHeight(height);
     }}
   >
     {/* Video content here */}
   </Animated.ScrollView>
   ```

6. **Render videos using VideoVisibilityTracker:**
   ```typescript
   {videos.map((videoUrl, index) => (
     <VideoVisibilityTracker
       key={index}
       videoUrl={videoUrl}
       index={index}
       scrollY={currentScrollY}
       scrollViewHeight={scrollViewHeight}
       onVisibilityChange={handleVisibilityChange}
       isAudioEnabled={index === activeAudioIndex}
       brightness={1}
       shouldPlay={true}
       isLooping={true}
     />
   ))}
   ```

## How It Works

1. As the user scrolls through the content, the scroll position is tracked and passed to each `VideoVisibilityTracker`.
2. Each `VideoVisibilityTracker` calculates what percentage of itself is visible within the viewport.
3. When a visibility change occurs, the tracker reports it to the parent component.
4. The parent component determines which video has the highest visibility percentage.
5. If the highest visibility is above the threshold (25%), that video's audio is enabled while all others remain muted.
6. When a user expands a video to fullscreen, the audio for that video is unmuted regardless of its previous state.

## Performance Considerations

1. **Throttling**: Use throttling with scroll events to prevent excessive calculations
2. **Threshold for updates**: Only update the visibility map when changes exceed 5% to reduce rerenders
3. **Visibility threshold**: Only switch audio when a video is at least 25% visible for stability

## Troubleshooting

- If audio switching happens too frequently, increase the visibility threshold
- If no audio plays, check console logs to ensure visibility is being calculated correctly
- Verify that `isAudioEnabled` prop is correctly passed to each video component

## Extending the System

This system can be extended to support additional features:

- Pause videos that are completely out of view to save resources
- Add user controls to globally mute/unmute videos
- Implement priority for certain videos that should play audio regardless of visibility 