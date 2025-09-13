# Daily Assignment Tables Migration (027)

## Overview

This migration implements the new day-specific escort assignment architecture to replace the flawed single-escort system. It addresses critical architectural problems in the current talent assignment system.

## Problems Addressed

### Current Issues
1. **Individual Talent Assignments**: `talent_project_assignments.escort_id` + `scheduled_dates[]` cannot associate specific escorts with specific dates
2. **Talent Group Assignments**: `talent_groups` has redundant escort fields that conflict with each other
3. **No Date-Specific Relationships**: Cannot assign different escorts to the same talent on different days
4. **Clear Day Dysfunction**: Clears entire assignments instead of date-specific assignments

### Solution
- **New Tables**: `talent_daily_assignments` and `group_daily_assignments` create explicit date-escort-talent relationships
- **Automatic Maintenance**: Database triggers keep `scheduled_dates` arrays synchronized
- **Data Integrity**: Validation constraints prevent invalid date ranges and duplicates
- **Multi-Escort Support**: Groups can have multiple escorts per date

## Migration Components

### 1. New Tables

#### talent_daily_assignments
```sql
CREATE TABLE talent_daily_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES talent(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  escort_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(talent_id, project_id, assignment_date, escort_id)
);
```

#### group_daily_assignments
```sql
CREATE TABLE group_daily_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES talent_groups(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  escort_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(group_id, project_id, assignment_date, escort_id)
);
```

### 2. Performance Indexes
- `(project_id, assignment_date)` - Fast date-based queries
- `(escort_id, assignment_date)` - Escort availability checking
- `(talent_id, project_id)` / `(group_id, project_id)` - Individual lookups

### 3. Database Triggers
- **Automatic scheduled_dates Maintenance**: Updates arrays when assignments change
- **Data Consistency**: Ensures `scheduled_dates` always reflects actual assignments
- **Cleanup**: Removes dates from arrays when no assignments remain

### 4. Validation Constraints
- **Date Range Validation**: Assignment dates must fall within project date range
- **Duplicate Prevention**: Unique constraints prevent double-booking
- **Referential Integrity**: Foreign key constraints ensure data consistency

### 5. Row Level Security
- **Project-Based Access**: Users can only see assignments for their assigned projects
- **Admin Override**: Admin and in_house roles have full access
- **Secure by Default**: All operations respect user permissions

## Requirements Addressed

This migration addresses the following requirements from the spec:

- **1.1**: Assign different escorts to same talent on different days ✅
- **1.2**: Store escort-talent-date relationships independently ✅
- **4.1**: Maintain data integrity with scheduled_dates arrays ✅
- **4.2**: Validate assignment dates within project ranges ✅
- **4.3**: Clean up orphaned data relationships ✅

## Installation Instructions

### Method 1: Automated (Recommended)
```bash
# Show the migration SQL
node scripts/show-daily-assignment-migration.js

# Copy the SQL output and run it in Supabase SQL Editor
```

### Method 2: Manual
1. Open `migrations/027_create_daily_assignment_tables.sql`
2. Copy the entire contents
3. Open your Supabase SQL Editor
4. Paste and execute the SQL
5. Verify with the validation queries

## Validation

After running the migration, validate it worked correctly:

```bash
# Install dependencies if needed
npm install dotenv

# Run validation script
node scripts/validate-daily-assignment-migration.js
```

### Manual Verification Queries
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('talent_daily_assignments', 'group_daily_assignments');

-- Check indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN ('talent_daily_assignments', 'group_daily_assignments');

-- Check triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers 
WHERE event_object_table IN ('talent_daily_assignments', 'group_daily_assignments');

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('talent_daily_assignments', 'group_daily_assignments');
```

## Next Steps

After this migration is complete:

1. **Task 2**: Create TypeScript types and interfaces
2. **Task 3**: Update GET assignments/[date] API endpoint
3. **Task 4**: Implement POST assignments/[date] API endpoint
4. **Task 5**: Create data migration scripts for existing assignments
5. **Task 6**: Update Clear Day functionality
6. **Task 7**: Update assignment management UI components
7. **Task 8**: Implement multi-escort support in UI
8. **Task 9**: Remove redundant escort fields
9. **Task 10**: Create comprehensive tests
10. **Task 11**: Update existing assignment-related functionality

## Rollback

If you need to rollback this migration:

```sql
-- Drop tables (this will cascade to triggers and policies)
DROP TABLE IF EXISTS talent_daily_assignments CASCADE;
DROP TABLE IF EXISTS group_daily_assignments CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_talent_scheduled_dates() CASCADE;
DROP FUNCTION IF EXISTS update_group_scheduled_dates() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

**⚠️ Warning**: Rollback will permanently delete all data in the new tables. Only rollback if no production data has been migrated yet.

## Files Created

- `migrations/027_create_daily_assignment_tables.sql` - Main migration file
- `scripts/show-daily-assignment-migration.js` - Display migration SQL
- `scripts/validate-daily-assignment-migration.js` - Validation script
- `migrations/027_README.md` - This documentation

## Support

If you encounter issues:

1. Check the validation script output for specific errors
2. Verify your Supabase environment variables are correct
3. Ensure you have the necessary database permissions
4. Review the Supabase logs for detailed error messages