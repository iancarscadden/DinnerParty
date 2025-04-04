# Next Steps for DinnerParty App (March 11th)

This document outlines remaining issues and recommendations for the DinnerParty app, specifically focusing on the Host Swipe and Map Request features.

## Remaining Issues

### 1. Inconsistent Error Handling in MapGroupCard

**Issue**: The client-side validation in `MapGroupCard` and `map.tsx` does not fully integrate with server-side validation, leading to potential inconsistencies in error messages.

**Recommendation**: Standardize error handling by creating a centralized error handling utility that can translate server-side errors into user-friendly messages. This would ensure consistent messaging across the application.

```typescript
// Example implementation
export function handleRequestError(error: any): string {
  // Known error types
  const errorMap: Record<string, string> = {
    'group_already_attending': 'Your group is already attending another dinner party.',
    'host_has_attendant': 'This group already has an attendant.',
    'request_exists': 'You have already requested to attend this dinner party.',
    'own_party': 'You cannot request to attend your own dinner party.'
  };

  // Extract message from error
  const message = error?.message || '';
  
  // Check for known error types
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.includes(key)) {
      return value;
    }
  }
  
  // Default message
  return 'Failed to send request. Please try again.';
}
```

### 2. No Mechanism to Cancel Attendance

**Issue**: Once a group has accepted an attendee, there's no way to cancel this arrangement. This could be problematic if plans change.

**Recommendation**: Implement a function to cancel attendance:

```typescript
export async function cancelAttendance(hostGroupId: string): Promise<boolean> {
  try {
    // Get the attendee group ID
    const { data: hostGroup, error: hostError } = await supabase
      .from('groups')
      .select('accepted_attendee_group_id')
      .eq('id', hostGroupId)
      .single();
      
    if (hostError) throw hostError;
    if (!hostGroup?.accepted_attendee_group_id) return true; // Nothing to cancel
    
    const attendeeGroupId = hostGroup.accepted_attendee_group_id;
    
    // Update host group
    const { error: hostUpdateError } = await supabase
      .from('groups')
      .update({
        has_attendant: false,
        accepted_attendee_group_id: null
      })
      .eq('id', hostGroupId);
      
    if (hostUpdateError) throw hostUpdateError;
    
    // Update attendee group
    const { error: attendeeUpdateError } = await supabase
      .from('groups')
      .update({
        attending_host_group_id: null
      })
      .eq('id', attendeeGroupId);
      
    if (attendeeUpdateError) throw attendeeUpdateError;
    
    return true;
  } catch (error) {
    console.error('Error canceling attendance:', error);
    return false;
  }
}
```

### 3. No Notification for Requesting Group

**Issue**: When a host group accepts a request, the requesting group isn't notified. They would only discover they've been accepted if they manually check their group status.

**Recommendation**: Implement a notification system or at least update the UI for the requesting group. This would require:

1. Adding a function to check if the group's request has been accepted
2. Periodically checking this status in the map screen
3. Showing a notification when the status changes

```typescript
// Example implementation for checking status
export async function checkRequestStatus(groupId: string): Promise<{
  isAttending: boolean;
  hostGroupId: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('attending_host_group_id')
      .eq('id', groupId)
      .single();
      
    if (error) throw error;
    
    return {
      isAttending: !!data?.attending_host_group_id,
      hostGroupId: data?.attending_host_group_id || null
    };
  } catch (error) {
    console.error('Error checking request status:', error);
    return { isAttending: false, hostGroupId: null };
  }
}
```

## General Recommendations for Improvement

1. **Add Request Status Tracking**: Add a status field to the `party_requests` table (e.g., "pending", "accepted", "rejected") to better track request states.

2. **Implement Request Expiration**: Add an expiration mechanism for requests to automatically clean up old requests.

3. **Add Real-time Updates**: Use Supabase's real-time subscription features to update the UI when requests are created or accepted without requiring manual refresh.

4. **Improve Type Safety**: Replace `any` types with proper interfaces, especially in the `Group` interface's `dinnerparty_details` field.

5. **Add Unit Tests**: Implement unit tests for the critical functions like `createPartyRequest` and `acceptPartyRequest` to ensure they work correctly.

6. **Implement Request Pagination**: For groups with many requests, implement pagination to improve performance.

7. **Add Request History**: Keep a history of past requests and acceptances for reference.

## Implementation Priority

1. **High Priority**:
   - Add notification for requesting group when their request is accepted
   - Implement mechanism to cancel attendance

2. **Medium Priority**:
   - Improve error handling consistency
   - Add request status tracking
   - Implement real-time updates

3. **Low Priority**:
   - Add request expiration
   - Implement request history
   - Add pagination for requests 