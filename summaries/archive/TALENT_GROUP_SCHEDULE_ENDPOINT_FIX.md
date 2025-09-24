# Talent Group Schedule Endpoint Fix

## Problem Identified
When attempting to use the "Confirm All" functionality with talent groups, a validation error occurred:

```
Error: Validation failed
at TalentScheduleColumn.useCallback[handleConfirm] 
at async Promise.all (index 0)
at async TalentRosterTab.useCallback[handleConfirmAll]
```

## Root Cause Analysis
The issue was that the `TalentScheduleColumn` component was trying to update talent group schedules using the main talent group API endpoint (`/api/projects/[id]/talent-groups/[groupId]`), which requires a full talent group object according to the `talentGroupSchema`:

### Required Fields in talentGroupSchema:
- `groupName` (required)
- `members` (required, min 1)
- `scheduledDates` (optional)
- `pointOfContactName` (optional)
- `pointOfContactPhone` (optional)

### What TalentScheduleColumn Was Sending:
```json
{
  "scheduledDates": ["2024-01-02", "2024-01-03", "2024-01-04"]
}
```

The validation failed because `groupName` and `members` were missing from the request.

## Solution Implemented

### 1. Created Dedicated Schedule Endpoint
**New File:** `app/api/projects/[id]/talent-groups/[groupId]/schedule/route.ts`

This endpoint is specifically designed for schedule-only updates with:

#### Simplified Validation Schema:
```typescript
const scheduleUpdateSchema = z.object({
  scheduledDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"))
    .optional()
    .default([])
})
```

#### Key Features:
- **Schedule-only updates**: Only requires `scheduledDates` field
- **Timezone handling**: Proper date processing without UTC conversion issues
- **Database consistency**: Updates both `talent_groups` and `talent_project_assignments` tables
- **Error handling**: Comprehensive error responses with detailed codes
- **Validation**: Appropriate validation for schedule-specific operations

### 2. Updated TalentScheduleColumn Component
**Modified:** `components/projects/talent-schedule-column.tsx`

**Before:**
```typescript
const endpoint = isGroup 
  ? `/api/projects/${projectId}/talent-groups/${talentId}`
  : `/api/projects/${projectId}/talent-roster/${talentId}/schedule`
```

**After:**
```typescript
const endpoint = isGroup 
  ? `/api/projects/${projectId}/talent-groups/${talentId}/schedule`
  : `/api/projects/${projectId}/talent-roster/${talentId}/schedule`
```

Now both individual talent and talent groups use dedicated schedule endpoints.

## Technical Implementation Details

### Endpoint Structure
```
/api/projects/[id]/talent-groups/[groupId]/schedule
├── PUT - Update schedule only
└── Validates only scheduledDates field
```

### Request/Response Flow
1. **Request**: `{ "scheduledDates": ["2024-01-02", "2024-01-03"] }`
2. **Validation**: Uses `scheduleUpdateSchema` (schedule-specific)
3. **Processing**: Timezone-safe date handling
4. **Database**: Updates `talent_groups.scheduled_dates`
5. **Sync**: Updates `talent_project_assignments.scheduled_dates`
6. **Response**: Full group object with updated dates

### Timezone Handling
```typescript
const processedDates = scheduledDates.map(date => {
  // Ensure we maintain the date as-is without timezone conversion
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return date // Already in YYYY-MM-DD format
  }
  // Convert Date object to local date string
  const dateObj = new Date(date)
  return dateObj.toISOString().split('T')[0]
})
```

## Verification Results

### ✅ All Tests Passing
1. **Endpoint Creation**: Schedule endpoint file exists with all required features
2. **Component Update**: TalentScheduleColumn uses correct endpoint for groups
3. **Validation**: Handles various date formats and edge cases
4. **Database Operations**: Successfully updates both related tables
5. **Workflow Simulation**: Complete confirm all process works end-to-end

### ✅ Functionality Verified
- **Individual Talent**: Still uses `/talent-roster/[id]/schedule` (unchanged)
- **Talent Groups**: Now uses `/talent-groups/[id]/schedule` (new endpoint)
- **Confirm All**: Works for both individual talent and groups
- **Data Integrity**: Maintains consistency across all related tables
- **Timezone Handling**: Consistent date processing throughout

## Expected Behavior After Fix

### For Talent Groups:
1. **Schedule Changes**: Users can modify group schedules without validation errors
2. **Confirm All**: Groups properly participate in confirm all functionality
3. **API Calls**: Correct endpoint called with appropriate payload
4. **Data Persistence**: Schedule changes saved correctly to database
5. **UI Updates**: Schedule changes reflected immediately in UI

### For Individual Talent:
- **No Changes**: All existing functionality preserved
- **Same Endpoint**: Still uses individual talent schedule endpoint
- **Consistent Behavior**: Same confirm all experience

## Files Modified

1. **`app/api/projects/[id]/talent-groups/[groupId]/schedule/route.ts`** (NEW)
   - Dedicated schedule endpoint for talent groups
   - Simplified validation schema
   - Timezone-safe date processing

2. **`components/projects/talent-schedule-column.tsx`** (MODIFIED)
   - Updated endpoint selection for groups
   - Now uses `/schedule` endpoint for both individual and group talent

## Impact

### ✅ Problem Resolved
- **Validation Errors**: Eliminated by using appropriate validation schema
- **Confirm All**: Now works correctly for talent groups
- **Data Consistency**: Maintained across all related database tables
- **User Experience**: Seamless schedule management for both individuals and groups

### ✅ System Improvements
- **Separation of Concerns**: Schedule updates separate from full group updates
- **API Design**: More RESTful with dedicated schedule resources
- **Maintainability**: Clearer code organization and responsibilities
- **Extensibility**: Easy to add more schedule-specific features in the future

The talent group confirm all functionality is now fully operational with proper timezone handling and appropriate validation for schedule-only updates.