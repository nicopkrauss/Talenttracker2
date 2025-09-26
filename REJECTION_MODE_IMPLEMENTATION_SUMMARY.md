# Rejection Mode Implementation Summary

## Overview
Successfully implemented "Rejection Mode" functionality from the project timecard approval page to the individual timecard details page. This allows admins to flag specific fields when rejecting submitted timecards.

## Key Changes Made

### 1. Timecard Details Page (`app/(app)/timecards/[id]/page.tsx`)

#### Added State Management:
- `isRejectionMode`: Boolean to track if rejection mode is active
- `selectedFields`: Array of field IDs that are flagged for issues
- `showReasonDialog`: Controls the rejection reason dialog
- `rejectionReason`: Stores the rejection reason text
- `loadingRejection`: Loading state for rejection submission

#### Added Functions:
- `enterRejectionMode()`: Activates rejection mode
- `exitRejectionMode()`: Deactivates rejection mode and clears selections
- `toggleFieldSelection(fieldId)`: Toggles field selection state
- `confirmRejection()`: Opens the rejection reason dialog
- `submitRejection()`: Submits the rejection with selected fields and reason
- `closeReasonDialog()`: Closes rejection dialog and clears reason
- `getFieldDisplayName(fieldId)`: Maps field IDs to human-readable names

#### Updated Action Buttons:
- **Normal Mode**: Shows "Edit & Return", "Reject", "Approve" buttons for submitted timecards
- **Rejection Mode**: Shows "Cancel" and "Confirm Rejection" buttons
- **Draft Mode**: Shows only "Edit Times" button (no rejection mode)

#### Added Rejection Dialog:
- Shows flagged fields as badges
- Requires rejection reason input
- Submits rejection with both reason and flagged fields

### 2. MultiDayTimecardDetail Component (`components/timecards/multi-day-timecard-detail.tsx`)

#### Updated Interface:
- Added `isRejectionMode?: boolean`
- Added `selectedFields?: string[]`
- Added `onFieldToggle?: (fieldId: string) => void`

#### Added Helper Functions:
- `getFieldId(fieldType, dayIndex?)`: Generates consistent field IDs
- `isFieldSelected(fieldId)`: Checks if field is selected for rejection
- `handleFieldClick(fieldId)`: Handles field clicks in rejection mode

#### Updated UI Elements:
- **Desktop Layout**: Already supported via DesktopTimecardGrid component
- **Mobile Layout**: 
  - Day headers become clickable to select/deselect all fields for that day
  - Individual time fields (Check In, Break Start, Break End, Check Out) become clickable
  - Visual feedback with red borders and backgrounds for selected fields
  - Hover effects and cursor changes in rejection mode
  - Instruction text appears when rejection mode is active

#### Visual States:
- **Normal**: Standard field appearance
- **Rejection Mode**: Fields show hover effects and cursor pointer
- **Selected**: Red border, red background, and enhanced hover effects
- **Missing Data**: Dashed borders maintained, but still clickable in rejection mode

### 3. DesktopTimecardGrid Component
- Already had rejection mode support from previous implementation
- Receives rejection mode props and handles field selection
- Supports day-level selection (clicking day header selects all fields for that day)

## User Experience Flow

### For Submitted Timecards:
1. Admin views timecard details page
2. Clicks "Reject" button to enter rejection mode
3. Instruction text appears: "(Click fields to flag issues)"
4. Admin clicks on problematic fields (they turn red)
5. Admin can click day headers to select all fields for that day
6. Admin clicks "Confirm Rejection" 
7. Dialog shows flagged fields as badges and requires reason
8. Admin enters rejection reason and submits
9. Timecard is rejected with specific field feedback

### For Draft Timecards:
- Only "Edit Times" button is shown
- No rejection mode available (as intended per requirements)

## Technical Implementation Details

### Field ID Generation:
- Single day: `'check_in_time'`, `'break_start_time'`, etc.
- Multi-day: `'check_in_time_day_0'`, `'break_start_time_day_1'`, etc.

### API Integration:
- Uses existing `/api/timecards/reject` endpoint
- Sends `rejectedFields` array along with `comments`
- Maintains compatibility with existing rejection system

### Responsive Design:
- Desktop: Uses existing DesktopTimecardGrid with rejection support
- Mobile: Custom implementation with clickable fields and day headers
- Consistent visual feedback across both layouts

### Accessibility:
- Maintains keyboard navigation
- Clear visual indicators for selected fields
- Descriptive field names in rejection dialog
- Proper ARIA labels and semantic HTML

## Status: ✅ Complete

The rejection mode functionality has been successfully implemented and integrated into the timecard details page, providing the same field-specific rejection capabilities that were available in the project timecard approval interface.