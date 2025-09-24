# Timecard Summary Cards Update

## Changes Implemented
Updated the timecard summary cards section to include a new draft card and reorder the existing cards as requested.

## New Card Order
The cards now appear in this specific order:

1. **Total Timecards** - Shows total count of all timecards
   - Icon: `FileText` (muted color)
   - Data: `timecards.length`

2. **Approved Timecards** - Shows count of approved timecards  
   - Icon: `FileText` (green color)
   - Data: `timecards.filter(tc => tc.status === 'approved').length`

3. **Submitted Timecards** - Shows count of submitted timecards
   - Icon: `FileText` (yellow color) 
   - Data: `pendingTimecards.length`

4. **Draft Timecards** - NEW! Shows count of draft timecards
   - Icon: `FileEdit` (gray color)
   - Data: `timecards.filter(tc => tc.status === 'draft').length`

5. **Total Pay** - Shows total payroll amount
   - Icon: `DollarSign` (muted color)
   - Data: `timecards.reduce((sum, tc) => sum + tc.total_pay, 0)`

## Removed
- **Total Hours** card - Removed as requested

## Technical Changes

### Icon Updates
```typescript
// Before
import { Clock, DollarSign, FileText, AlertCircle } from "lucide-react"

// After  
import { DollarSign, FileText, AlertCircle, FileEdit } from "lucide-react"
```

### New Draft Card Implementation
```typescript
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Draft Timecards</CardTitle>
    <FileEdit className="h-4 w-4 text-gray-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {timecards.filter(tc => tc.status === 'draft').length}
    </div>
  </CardContent>
</Card>
```

## Test Results
Based on current test data:
- **Total**: 20 timecards
- **Approved**: 1 timecard (5.0%)
- **Submitted**: 6 timecards (30.0%) 
- **Drafts**: 13 timecards (65.0%)
- **Total Pay**: $25,700.00

## Benefits
1. **Complete Status Overview**: Now shows all major timecard statuses at a glance
2. **Logical Order**: Flows from total → approval workflow → financial summary
3. **Visual Clarity**: Each status has distinct color coding for quick identification
4. **Streamlined Display**: Removed less critical "Total Hours" to focus on key metrics

## Files Modified
- `app/(app)/timecards/page.tsx` - Updated summary cards section and imports
- `scripts/test-timecard-summary-cards.js` - Test script to verify functionality

The timecard summary now provides administrators with a comprehensive overview of timecard statuses in a logical, easy-to-scan format.