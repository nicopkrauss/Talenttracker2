# Approve Tab Implementation

## Changes Implemented
Added a new "Approve" tab to the timecards page and renamed the existing "All Timecards" tab to "Breakdown" as requested.

## Tab Structure Updates

### New Tab Order
1. **Breakdown** (formerly "All Timecards") - Shows all timecards with filtering
2. **Approve** (NEW!) - Shows submitted timecards for approval workflow  
3. **Summary** - Shows payroll summary and statistics

### Tab Visibility
- **Non-Admin Users**: Only see "My Timecards" (no tab changes for them)
- **Admin Users**: See all three tabs: Breakdown → Approve → Summary

## Approve Tab Features

### UI Design
The Approve tab replicates the exact UI from the timecard detail page (`/timecards/[id]`) including:

- **Header Section**: User name, project name, date, and "X of Y" counter
- **Time Summary Card**: Total hours, break duration, pay rate, total pay
- **Time Details Card**: Check-in, break start/end, check-out times with proper formatting
- **Navigation Controls**: Previous and Next arrows with Approve button in the middle

### Navigation Controls
```
[← Previous]  [✅ Approve]  [Next →]
```

- **Previous Button**: Disabled when at first timecard
- **Next Button**: Disabled when at last timecard  
- **Approve Button**: Always enabled, shows loading spinner during approval

### Data Flow
1. **Fetch Submitted Timecards**: Queries timecards with `status = 'submitted'`
2. **Display Current Timecard**: Shows timecard at current index (starts at 0)
3. **Navigation**: Previous/Next buttons change the current index
4. **Approval Process**: 
   - Calls `/api/timecards/approve` endpoint
   - Refreshes all data after successful approval
   - Automatically navigates to next timecard (or previous if last)

### Empty State
When no submitted timecards exist:
- Shows friendly message: "No Timecards to Approve"
- Explains that new submissions will appear here
- Hides navigation controls

## Technical Implementation

### New State Variables
```typescript
const [currentApprovalIndex, setCurrentApprovalIndex] = useState(0)
const [submittedTimecards, setSubmittedTimecards] = useState<Timecard[]>([])
const [loadingApproval, setLoadingApproval] = useState(false)
```

### New Functions
- `fetchSubmittedTimecards()`: Fetches timecards with submitted status
- `goToPreviousTimecard()`: Decrements current index
- `goToNextTimecard()`: Increments current index  
- `approveCurrentTimecard()`: Approves current timecard and refreshes data

### Icon Updates
Added new icons for navigation:
```typescript
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
```

## User Experience

### Admin Workflow
1. **Access**: Click "Approve" tab (only visible to admins)
2. **Review**: See detailed timecard information in familiar format
3. **Navigate**: Use Previous/Next arrows to review multiple timecards
4. **Approve**: Click green "Approve" button to approve current timecard
5. **Continue**: System automatically moves to next timecard
6. **Complete**: Process all submitted timecards efficiently

### Benefits
- **Familiar Interface**: Uses same UI as individual timecard pages
- **Efficient Workflow**: Navigate through multiple timecards without page changes
- **Clear Status**: Always know which timecard you're reviewing (X of Y)
- **Streamlined Process**: One-click approval with automatic navigation
- **Responsive Design**: Works on both desktop and mobile devices

## Test Results
Based on current test data:
- **6 submitted timecards** ready for approval
- **Navigation working**: Previous disabled at start, Next enabled
- **Data formatting**: Proper date/time display and currency formatting
- **Workflow ready**: All timecards can be approved through the interface

## Files Modified
- `app/(app)/timecards/page.tsx` - Added Approve tab and renamed Breakdown tab
- `scripts/test-approve-tab-functionality.js` - Test script for verification

The Approve tab provides administrators with an efficient, streamlined interface for processing timecard approvals while maintaining the familiar UI patterns from the existing timecard detail pages.