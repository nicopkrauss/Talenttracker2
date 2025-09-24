# Minimal Timecard Ordering Fix

## Problem
Timecards were jumping around as they loaded due to inconsistent ordering from the database.

## Root Cause
The original queries only sorted by a single column (`date` or `submitted_at`), which can result in non-deterministic ordering when multiple records have the same value in that column.

## Solution Applied
Added a secondary sort column (`created_at`) to ensure consistent, deterministic ordering:

### Before
```typescript
// Main timecards - single column sort
.order("date", { ascending: false })

// Pending timecards - single column sort  
.order("submitted_at", { ascending: true })
```

### After
```typescript
// Main timecards - dual column sort for consistency
.order("date", { ascending: false })
.order("created_at", { ascending: false })

// Pending timecards - dual column sort for consistency
.order("submitted_at", { ascending: true })
.order("created_at", { ascending: true })
```

## Why This Works
- **Primary sort**: Orders by the main field (date/submitted_at)
- **Secondary sort**: Provides a stable tiebreaker using created_at timestamp
- **Deterministic results**: Same query always returns items in the same order
- **No performance impact**: Minimal overhead, no complex logic
- **Database-level fix**: Solved at the source, not in JavaScript

## Benefits
✅ **Consistent ordering**: Timecards appear in the same order every time  
✅ **No jumping**: Items maintain their positions during loading  
✅ **Minimal change**: Only 2 lines added, no complex refactoring  
✅ **Performance safe**: No additional queries or heavy processing  
✅ **Future-proof**: Works regardless of data volume or timing  

## Files Modified
- `app/(app)/timecards/page.tsx` - Added secondary sort columns

This minimal fix addresses the core ordering issue without introducing complexity or performance risks.