# Group Assignments View Fix Summary

## Problem
After fixing the group scheduling API to store dates in `talent_groups.scheduled_dates` instead of `group_daily_assignments`, the groups were not appearing in the daily assignments view.

## Root Cause
The assignments API (`GET /api/projects/[id]/assignments/[date]`) was only looking for groups in the `group_daily_assignments` table, but scheduled groups were now stored in the `talent_groups.scheduled_dates` field.

## Solution Implemented
Modified the assignments API to check both sources for group data:

### 1. Updated Group Data Fetching
- **Before**: Only queried `group_daily_assignments` table
- **After**: Queries both `group_daily_assignments` (for assigned groups) AND `talent_groups.scheduled_dates` (for scheduled but unassigned groups)

### 2. Enhanced Group Processing Logic
- Combines data from both sources
- Groups with escort assignments come from `group_daily_assignments`
- Groups scheduled but not assigned come from `talent_groups.scheduled_dates`
- Prevents duplicates by tracking which groups already have assignments

### 3. Updated POST Endpoint
- Modified to only insert into `group_daily_assignments` when escorts are actually assigned
- No longer tries to insert null `escort_id` values (which would fail due to constraint)
- Relies on `talent_groups.scheduled_dates` for scheduling without assignment

## Files Modified
- `app/api/projects/[id]/assignments/[date]/route.ts`
  - Added query for `talent_groups.scheduled_dates`
  - Enhanced group processing logic to handle both data sources
  - Updated POST logic to avoid constraint violations

## Technical Details

### New Query for Scheduled Groups
```typescript
const { data: scheduledGroups } = await supabase
  .from('talent_groups')
  .select(`id, group_name, display_order, scheduled_dates`)
  .eq('project_id', projectId)
  .contains('scheduled_dates', [dateStr])
```

### Combined Processing Logic
```typescript
// Create map from assigned groups
const groupAssignmentMap = new Map()
groupAssignments?.forEach(assignment => {
  // Add to map with escort info
})

// Add scheduled groups without assignments
const groupsWithAssignments = new Set(groupAssignmentMap.keys())
scheduledGroups?.forEach(group => {
  if (!groupsWithAssignments.has(group.id)) {
    groupAssignmentMap.set(group.id, []) // Empty escorts array
  }
})
```

## Testing Results
- ✅ Groups scheduled via `talent_groups.scheduled_dates` now appear in assignments view
- ✅ Groups with escort assignments still work correctly
- ✅ No constraint violations when creating assignments
- ✅ Proper display order and group information maintained

## Impact
- Groups now properly appear in the daily assignments view after being scheduled
- Users can assign escorts to scheduled groups
- Consistent behavior between individual talent and group talent
- No breaking changes to existing functionality

## Data Flow
1. **Scheduling**: Groups are scheduled → dates stored in `talent_groups.scheduled_dates`
2. **View**: Assignments view shows scheduled groups (from `scheduled_dates`) and assigned groups (from `group_daily_assignments`)
3. **Assignment**: When escorts are assigned → records created in `group_daily_assignments`
4. **Display**: Both scheduled and assigned groups appear in the assignments interface