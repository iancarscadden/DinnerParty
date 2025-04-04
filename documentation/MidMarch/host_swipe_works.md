# Host Swipe Implementation Documentation

## Overview
The host swipe feature allows group leaders to manage incoming party requests through an intuitive card-swiping interface. Leaders can view details about requesting groups and either accept or reject their requests to join the dinner party.

## Component Structure

### 1. Host Screen (`screens/host-screen.tsx`)
- Entry point for hosting functionality
- Manages states:
  - `loading`: Loading state for initial data fetch
  - `group`: Current group data
  - `isLeader`: Whether current user is group leader
  - `activeParty`: Current active dinner party
  - `hasRequests`: Whether there are pending requests
  - `showRequests`: Controls visibility of request swiper

### 2. RequestingGroupsSwiper (`components/RequestingGroupsSwiper.tsx`)
- Main component for swipe functionality
- Props:
  ```typescript
  interface RequestingGroupsProps {
    hostGroupId: string;
    onRequestsCleared?: () => void;
  }
  ```
- States:
  - `currentIndex`: Tracks current request being shown
  - `isFinished`: Whether all requests have been viewed
  - `isAccepted`: Whether a request has been accepted
  - `requests`: Array of party requests with group data
  - `loading`: Loading state for requests
  - `brightness`: UI brightness adjustment for dark mode

### 3. GroupCard (`components/GroupCard.tsx`)
- Displays individual group request cards
- Props:
  ```typescript
  interface GroupCardProps {
    group: {
      members: GroupMember[];
      videoLinks: string[];
    };
    brightness: number;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    isActive: boolean;
    glowOpacity: SharedValue<number>;
    translateX: SharedValue<number>;
  }
  ```

## Data Flow

### 1. Request Loading
```typescript
// In RequestingGroupsSwiper
const loadRequests = async () => {
  const partyRequests = await getPartyRequests(hostGroupId);
  setRequests(partyRequests);
  setIsFinished(partyRequests.length === 0);
};
```

### 2. Swipe Actions
- Left Swipe (Reject):
  - Animates card off screen
  - Moves to next request
  - No database changes
- Right Swipe (Accept):
  - Shows confirmation dialog
  - If confirmed, calls `acceptPartyRequest`
  - Updates both groups' statuses
  - Deletes all other requests

### 3. Database Operations (`services/groups.ts`)

#### Getting Party Requests
```typescript
export async function getPartyRequests(hostGroupId: string): Promise<Array<{
  request: PartyRequest;
  requestingGroup: {
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
}>>
```

#### Accepting a Request
```typescript
export async function acceptPartyRequest(requestId: string): Promise<boolean>
```
- Updates host group:
  - Sets `has_attendant` to true
  - Sets `accepted_attendee_group_id`
- Updates requesting group:
  - Sets `attending_host_group_id`
- Deletes all other requests for the host group

## UI/UX Features

### 1. Card Animations
- Smooth swipe transitions using `react-native-reanimated`
- Rotation based on swipe direction
- Scale and opacity animations for card stack effect
- Glow effect indicating swipe direction

### 2. Gesture Handling
- Pan gesture detection for swipes
- Velocity-based swipe completion
- Return-to-center animation for incomplete swipes
- Scroll handling within cards for group details

### 3. Visual Feedback
- Loading states with activity indicators
- Success/failure alerts for actions
- Empty state handling
- Replay and clear options after viewing all requests

## State Management

### Host Screen States
1. No Group
   - Shows message about needing a group
2. Incomplete Profile
   - Shows message about completing profile
3. Active Party with Requests
   - Shows RequestingGroupsSwiper
4. Active Party without Requests
   - Shows party details and waiting message
5. Ready to Host
   - Shows host party button (leader only)

### Request Swiper States
1. Loading
   - Shows loading indicator
2. Active Swiping
   - Shows current request card
3. Accepted
   - Shows success message
4. Finished
   - Shows replay/clear options

## Error Handling
- Database operation failures
- Network errors
- Invalid state transitions
- User permission checks
- Edge cases (e.g., group disbanding during request)

## Future Considerations
1. Performance Optimizations
   - Request pagination
   - Card preloading
   - Image caching
2. Feature Enhancements
   - Request expiration
   - Batch actions
   - Request notifications
3. UI Improvements
   - Custom animations
   - Haptic feedback
   - Advanced gestures

## Testing Scenarios
1. Basic Flow
   - Load requests
   - Swipe through cards
   - Accept/reject requests
2. Edge Cases
   - No requests
   - Network failures
   - Permission changes
3. State Management
   - Component mounting/unmounting
   - Navigation transitions
   - Data updates 