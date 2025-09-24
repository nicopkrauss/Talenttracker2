# Timecard Actions UI Reorganization

## Overview
Moved timecard action buttons from a separate "Actions" section to the top right of the Time Details header for better user experience and cleaner interface.

## Changes Made

### 1. Removed Separate Actions Section
- Eliminated the standalone "Actions" card that appeared at the bottom of the timecard details
- Removed redundant explanatory text and status messages

### 2. Integrated Actions into Time Details Header
- Moved all action buttons to the top right of the "Time Details" card header
- Maintained proper spacing and alignment with existing edit controls

### 3. Button Ordering (Right to Left)
As requested, buttons are ordered from right to left:
1. **Approve** (rightmost) - Green button for approving submitted timecards
2. **Reject** - Red destructive button for rejecting timecards  
3. **Edit & Return** (leftmost) - Outline button for editing and returning to draft

### 4. Preserved Functionality
- All existing permission checks remain intact
- Status-based button visibility unchanged
- Loading states and disabled states preserved
- Dialog workflows (approve, reject, edit reason) unchanged

## UI Behavior by Status

### Draft Timecards
- Shows "Edit Times" button for authorized users (timecard owner or approvers)
- When editing: Shows "Save" and "Cancel" buttons
- No approval actions visible

### Submitted Timecards  
- Shows all three action buttons (Approve, Reject, Edit & Return) for users with approval permissions
- Non-approvers see no action buttons

### Approved/Rejected Timecards
- No action buttons shown (read-only state)

## Technical Implementation

### Code Changes
- Updated `CardTitle` component in Time Details section to include action buttons
- Removed entire "Actions" `Card` component
- Maintained all existing event handlers and state management
- Preserved responsive design and accessibility

### Permission Logic
- `canApprove` check determines visibility of approval actions
- User ID comparison for draft editing permissions
- Status-based conditional rendering unchanged

## Benefits

1. **Cleaner Interface**: Eliminates redundant section, reduces page length
2. **Better UX**: Actions are contextually placed near the data they affect
3. **Consistent Layout**: Matches pattern used in other detail pages
4. **Mobile Friendly**: Buttons remain accessible on smaller screens
5. **Logical Flow**: Actions appear where users expect them (top right of relevant section)

## Testing

- Verified button ordering matches specification
- Confirmed all permission checks work correctly
- Tested responsive behavior on different screen sizes
- Validated that all existing functionality is preserved
- Checked loading states and error handling

The reorganization improves the user experience while maintaining all existing functionality and security measures.