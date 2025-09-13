# Assignment Migration Scripts

This directory contains scripts to migrate existing escort assignments from the old single-field format to the new day-specific assignment tables.

## Overview

The migration addresses the architectural problem where:
- `talent_project_assignments.escort_id` stores one escort for all scheduled dates
- `talent_groups` has redundant escort fields that don't support date-specific assignments
- No way to assign different escorts to the same talent on different days

The new system uses dedicated tables:
- `talent_daily_assignments` - Individual talent escort assignments by date
- `group_daily_assignments` - Group escort assignments by date (supports multiple escorts)

## Migration Scripts

### 1. `run-assignment-migration.js` (Main Script)
**Purpose**: Primary migration runner with user confirmation and error handling.

```bash
node scripts/run-assignment-migration.js
```

**Features**:
- Checks current migration status
- Shows summary of data to be migrated
- Requires user confirmation
- Runs complete migration process
- Provides detailed progress and error reporting

### 2. `migrate-existing-assignments.js` (Core Migration)
**Purpose**: Core migration logic that converts old format to new tables.

```bash
node scripts/migrate-existing-assignments.js
```

**What it migrates**:
- `talent_project_assignments.escort_id` → `talent_daily_assignments`
- `talent_groups.assigned_escort_id` → `group_daily_assignments`
- `talent_groups.assigned_escort_ids[]` → `group_daily_assignments`

**Features**:
- Creates one daily assignment record per date per escort
- Uses upsert to handle duplicates gracefully
- Maintains creation timestamps
- Provides detailed statistics

### 3. `validate-assignment-migration.js` (Validation)
**Purpose**: Comprehensive validation of migration results.

```bash
node scripts/validate-assignment-migration.js
```

**Validates**:
- All original assignments were migrated correctly
- Scheduled dates arrays are updated properly
- No missing or extra assignments
- Data integrity constraints are maintained
- No orphaned or duplicate records

### 4. `rollback-assignment-migration.js` (Rollback)
**Purpose**: Rollback migration and restore original state.

```bash
node scripts/rollback-assignment-migration.js
```

**Features**:
- Creates backup before rollback
- Clears all daily assignment tables
- Resets scheduled_dates arrays (via triggers)
- Validates rollback completion
- Requires explicit user confirmation

### 5. `test-assignment-migration.js` (Testing)
**Purpose**: Comprehensive test suite for the migration process.

```bash
node scripts/test-assignment-migration.js
```

**Tests**:
- Creates test data in old format
- Runs migration process
- Validates results
- Tests rollback functionality
- Cleans up test data

## Prerequisites

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Requirements
- Daily assignment tables must exist (created by migration 027)
- Database triggers must be in place for scheduled_dates maintenance
- Row Level Security policies must be configured

## Migration Workflow

### Step 1: Pre-Migration Check
```bash
# Check what data will be migrated
node scripts/run-assignment-migration.js
```

### Step 2: Run Migration
```bash
# Follow prompts to confirm and run migration
node scripts/run-assignment-migration.js
```

### Step 3: Validate Results
```bash
# Verify migration completed correctly
node scripts/validate-assignment-migration.js
```

### Step 4: Test Application
Test your application to ensure the new assignment system works correctly.

### Step 5: Clean Up (Optional)
Once confirmed working, you can remove the old escort fields:
- `talent_project_assignments.escort_id`
- `talent_groups.assigned_escort_id`
- `talent_groups.assigned_escort_ids`
- `talent_groups.escort_dropdown_count`

## Rollback Process

If you need to rollback the migration:

```bash
# This will clear daily assignment tables and restore original state
node scripts/rollback-assignment-migration.js
```

**Warning**: Rollback permanently deletes all daily assignment data. A backup is created automatically.

## Testing

### Run Full Test Suite
```bash
node scripts/test-assignment-migration.js
```

### Manual Testing
1. Create test assignments in old format
2. Run migration
3. Verify new daily assignment records
4. Test rollback
5. Clean up test data

## Data Mapping

### Talent Assignments
**Before**:
```sql
talent_project_assignments {
  escort_id: "escort-123",
  scheduled_dates: ["2024-01-01", "2024-01-02", "2024-01-03"]
}
```

**After**:
```sql
talent_daily_assignments [
  { assignment_date: "2024-01-01", escort_id: "escort-123" },
  { assignment_date: "2024-01-02", escort_id: "escort-123" },
  { assignment_date: "2024-01-03", escort_id: "escort-123" }
]
```

### Talent Groups
**Before**:
```sql
talent_groups {
  assigned_escort_ids: ["escort-123", "escort-456"],
  scheduled_dates: ["2024-01-01", "2024-01-02"]
}
```

**After**:
```sql
group_daily_assignments [
  { assignment_date: "2024-01-01", escort_id: "escort-123" },
  { assignment_date: "2024-01-01", escort_id: "escort-456" },
  { assignment_date: "2024-01-02", escort_id: "escort-123" },
  { assignment_date: "2024-01-02", escort_id: "escort-456" }
]
```

## Error Handling

### Common Issues

1. **Missing Environment Variables**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

2. **Permission Errors**
   - Service role key must have full database access
   - RLS policies must allow service role access

3. **Data Integrity Errors**
   - Assignment dates outside project date ranges
   - References to non-existent escorts or talents
   - Duplicate assignments

4. **Migration Already Run**
   - Check existing daily assignment data
   - Use rollback if you need to re-run migration

### Recovery

If migration fails partway through:
1. Check error messages for specific issues
2. Fix underlying data problems
3. Run rollback to restore original state
4. Re-run migration after fixes

## Monitoring

### Check Migration Status
```bash
# See current state of daily assignment tables
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('talent_daily_assignments').select('id', { count: 'exact', head: true }).then(r => console.log('Talent daily:', r.data));
supabase.from('group_daily_assignments').select('id', { count: 'exact', head: true }).then(r => console.log('Group daily:', r.data));
"
```

### Check Original Data
```bash
# See how much data needs migration
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('talent_project_assignments').select('id', { count: 'exact', head: true }).not('escort_id', 'is', null).then(r => console.log('Talent with escorts:', r.data));
supabase.from('talent_groups').select('id', { count: 'exact', head: true }).or('assigned_escort_id.not.is.null,assigned_escort_ids.not.eq.{}').then(r => console.log('Groups with escorts:', r.data));
"
```

## Support

If you encounter issues:
1. Check the error messages carefully
2. Verify environment variables are set correctly
3. Ensure database permissions are correct
4. Run the test suite to isolate problems
5. Use rollback to restore original state if needed

The migration is designed to be safe and reversible, but always backup your data before running in production.