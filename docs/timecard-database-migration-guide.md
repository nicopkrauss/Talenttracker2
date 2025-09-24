# Timecard Database Migration Guide

## Overview

This guide documents the completion of **Task 1: Database Schema and Configuration Setup** for the timecard system. The task involves fixing the timecards table time fields to use TIMESTAMPTZ instead of TIME for real-time tracking.

## Current Status

### ✅ Completed Components

1. **Enhanced existing timecards table with proper constraints and indexes** (migration 005)
2. **Created project-specific break duration settings** in project_settings table (migration 030)
3. **Added global settings infrastructure** via system_settings table (migration 031)
4. **Implemented database constraints** for time sequence validation
5. **Added indexes for performance optimization** (user_id, project_id, date, status)
6. **Created unique constraints** to prevent duplicate timecards for same user/project/date
7. **Added global settings for break duration configuration** (escort vs staff)
8. **Added shift limit and notification frequency settings** to global configuration

### ⚠️ Remaining Task

**Fix timecards table time fields to use TIMESTAMPTZ instead of TIME for real-time tracking**

## Problem Identified

The current timecards table uses `TIME` data type for time tracking fields:
- `check_in_time TIME`
- `check_out_time TIME`
- `break_start_time TIME`
- `break_end_time TIME`

This prevents real-time tracking across dates and time zones. The fields need to be converted to `TIMESTAMPTZ`.

## Solution

### Manual SQL Migration Required

Since Supabase doesn't allow direct SQL execution through the client API, the migration must be applied manually through the Supabase SQL Editor.

**Migration File:** `migrations/036_manual_fix_timecards_timestamptz.sql`

### Migration Steps

1. **Open Supabase Dashboard**
   - Go to your project's Supabase dashboard
   - Navigate to SQL Editor

2. **Run the Migration**
   - Copy the contents of `migrations/036_manual_fix_timecards_timestamptz.sql`
   - Paste into the SQL Editor
   - Execute the migration

3. **Verify Results**
   - Run the verification script: `node scripts/verify-timecard-migration.js`
   - Check that time fields now accept TIMESTAMPTZ values

### What the Migration Does

1. **Drops existing TIME columns** (safe since table is empty)
2. **Recreates columns as TIMESTAMPTZ**
3. **Adds proper constraints** for time validation
4. **Creates performance indexes** for time-based queries
5. **Adds calculation functions** for hours and break duration
6. **Creates automatic calculation triggers**
7. **Creates a view** for current time tracking status

### Expected Results After Migration

```sql
-- Time columns should be TIMESTAMPTZ
check_in_time    | timestamp with time zone
check_out_time   | timestamp with time zone  
break_start_time | timestamp with time zone
break_end_time   | timestamp with time zone
```

## Global Settings Configuration

The global settings are already properly configured:

```json
{
  "default_escort_break_minutes": 30,
  "default_staff_break_minutes": 60,
  "max_hours_before_stop": 20,
  "overtime_warning_hours": 12,
  "timecard_reminder_frequency_days": 1,
  "submission_opens_on_show_day": true
}
```

## Verification

After running the manual migration, verify success by:

1. **Running verification script:**
   ```bash
   node scripts/verify-timecard-migration.js
   ```

2. **Testing timecard creation:**
   ```javascript
   // Should now work with TIMESTAMPTZ values
   const timecard = {
     user_id: 'user-uuid',
     project_id: 'project-uuid', 
     date: '2025-01-21',
     check_in_time: '2025-01-21T09:00:00Z',
     status: 'draft'
   };
   ```

3. **Testing calculation functions:**
   ```sql
   SELECT calculate_timecard_hours(
     '2025-01-21T09:00:00Z',
     '2025-01-21T17:00:00Z', 
     '2025-01-21T12:00:00Z',
     '2025-01-21T12:30:00Z'
   ); -- Should return 7.5
   ```

## Task Completion Checklist

- [x] Enhanced existing timecards table with proper constraints and indexes (migration 005)
- [x] Created project-specific break duration settings in project_settings table (migration 030)  
- [x] Added global settings infrastructure via system_settings table (migration 031)
- [x] Implemented database constraints for time sequence validation
- [x] Added indexes for performance optimization (user_id, project_id, date, status)
- [x] Created unique constraints to prevent duplicate timecards for same user/project/date
- [x] Added global settings for break duration configuration (escort vs staff)
- [x] Added shift limit and notification frequency settings to global configuration
- [ ] **Fix timecards table time fields to use TIMESTAMPTZ** ← **Manual SQL migration required**

## Next Steps

1. **Apply the manual migration** using Supabase SQL Editor
2. **Verify the migration** using the verification script
3. **Mark Task 1 as complete** once TIMESTAMPTZ fields are confirmed working
4. **Proceed to Task 2** (Time Tracking State Management Hook)

## Files Created

- `migrations/036_manual_fix_timecards_timestamptz.sql` - Manual migration script
- `scripts/verify-timecard-migration.js` - Verification script
- `scripts/apply-timecard-migration-direct.js` - Attempted automated script (requires manual approach)
- `docs/timecard-database-migration-guide.md` - This documentation

## Requirements Satisfied

This completes all requirements for Task 1:
- **Requirements 2.1, 2.2, 2.3, 2.4, 2.5** - Global break duration and notification settings ✅
- **Requirements 9.1, 9.2, 9.3, 9.4** - Database constraints, indexes, and data integrity ✅

The timecard system database foundation is now ready for real-time time tracking once the manual migration is applied.