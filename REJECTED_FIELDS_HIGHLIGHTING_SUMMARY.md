# Rejected Fields Highlighting Implementation Summary

## Overview
Successfully implemented highlighting of rejected fields and display of rejection comments for rejected timecards in both the breakdown tab (project timecard lists) and individual timecard details pages.

## Key Changes Made

### 1. Database Schema Updates

#### Added `rejected_fields` to Timecard Interface (`lib/types.ts`)
```typescript
export interface Timecard {
  // ... existing fields
  rejection_reason?: string
  rejected_fields?: string[]
  // ... rest of fields
}
```

#### Updated API Endpoints to Include `rejected_fields`
- **`app/api/timecards/[id]/route.ts`**: Single timecard fetch (uses `*` selector which includes rejected_fields)
- **`app/api/timecards-v2/route.ts`**: Bulk timecard fetch for project lists
  - Added `rejected_fields` to select query
  - Added `rejected_fields` to processed timecard output

### 2. Visual Field Highlighting

#### Orange Border Styling for Rejected Fields
- **Color Scheme**: `border-orange-500 bg-orange-50 dark:bg-orange-950/20`
- **Differentiation**: 
  - Red = Currently selected for rejection (rejection mode)
  - Orange = Previously rejected fields (display mode)

#### Components Updated:

**MultiDayTimecardDetail Component:**
- Added `showRejectedFields` prop
- Added `isFieldRejected()` helper function
- Updated all time field styling (Check In, Break Start, Break End, Check Out)
- Supports both single-day and multi-day timecards
- Passes `showRejectedFields` to DesktopTimecardGrid

**DesktopTimecardGrid Component:**
- Added `showRejectedFields` prop
- Added `isFieldRejected()` helper function
- Updated all time event rows with orange highlighting for rejected fields
- Maintains existing rejection mode (red) functionality

**MultiDayTimecardDisplay Component:**
- Added `showRejectedFields` prop
- Added `isFieldRejected()` helper function
- Updated mobile layout fields for both first day and additional days
- Uses correct field IDs for multi-day timecards (`fieldName_day_N`)

### 3. Rejection Comments Display

#### MultiDayTimecardDetail Component (Timecard Details Page)
Added comprehensive rejection comments section:
```typescript
{timecard.status === 'rejected' && timecard.rejection_reason && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
        Rejection Reason
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
          {timecard.rejection_reason}
        </p>
        {/* Flagged fields display */}
      </div>
    </CardContent>
  </Card>
)}
```

#### MultiDayTimecardDisplay Component (Breakdown Tab)
Added inline rejection comments section:
```typescript
{timecard.status === 'rejected' && timecard.rejection_reason && (
  <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
    <div className="flex items-start gap-2 mb-2">
      <FileText className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
      <p className="text-sm font-medium text-red-800 dark:text-red-200">
        Rejection Reason:
      </p>
    </div>
    <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap mb-3">
      {timecard.rejection_reason}
    </p>
    {/* Flagged fields badges */}
  </div>
)}
```

### 4. Field Display Logic

#### Consistent Field Naming
Both components use the same field display logic:
```typescript
const fieldMap: Record<string, string> = {
  'check_in_time': 'Check In',
  'break_start_time': 'Break Start', 
  'break_end_time': 'Break End',
  'check_out_time': 'Check Out'
}

// Multi-day field handling
if (fieldId.includes('_day_')) {
  const parts = fieldId.split('_day_')
  const baseField = parts[0]
  const dayIndex = parseInt(parts[1])
  
  if (!isNaN(dayIndex) && timecard?.daily_entries && timecard.daily_entries[dayIndex]) {
    const entry = timecard.daily_entries[dayIndex]
    const date = new Date(entry.work_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    return `${date} - ${fieldMap[baseField] || baseField}`
  }
}
```

### 5. Component Integration

#### Updated Component Calls
**Timecard Details Page:**
```typescript
<MultiDayTimecardDetail 
  // ... existing props
  showRejectedFields={timecard.status === 'rejected'}
/>
```

**Breakdown Tab (TimecardList):**
```typescript
<MultiDayTimecardDisplay 
  // ... existing props
  showRejectedFields={timecard.status === 'rejected'}
/>
```

**Enhanced Timecard List:**
```typescript
<MultiDayTimecardDisplay 
  // ... existing props
  showRejectedFields={timecard.status === 'rejected'}
/>
```

## User Experience

### For Rejected Timecards:
1. **Visual Feedback**: Rejected fields are highlighted with orange borders and backgrounds
2. **Rejection Comments**: Clear display of why the timecard was rejected
3. **Flagged Fields**: Badges showing exactly which fields need correction
4. **Consistent Experience**: Same highlighting and comments across breakdown tab and details page

### Field ID Mapping:
- **Single Day**: `check_in_time`, `break_start_time`, etc.
- **Multi-Day**: `check_in_time_day_0`, `break_start_time_day_1`, etc.
- **Display Names**: "Check In", "Jan 15 - Break Start", etc.

## Technical Details

### Responsive Design:
- **Desktop**: Uses DesktopTimecardGrid with orange field highlighting
- **Mobile**: Custom mobile layouts with consistent orange highlighting
- **Multi-Day**: Proper field ID generation for each day

### Performance:
- Minimal impact - only adds conditional styling and helper functions
- No additional API calls - uses existing timecard data
- Efficient field lookup with simple array includes check

### Accessibility:
- Clear visual distinction between normal, rejected, and selected fields
- Semantic HTML structure maintained
- Proper color contrast for orange highlighting

## Status: ✅ Complete

The rejected fields highlighting and rejection comments display has been successfully implemented across both the breakdown tab and timecard details page, providing clear visual feedback and detailed information about why timecards were rejected and which specific fields need correction.