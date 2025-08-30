# Database Migrations

This directory contains SQL migration scripts for the talent info enhancement feature.

## Files

- `001_talent_info_enhancement.sql` - Main migration script
- `001_talent_info_enhancement_rollback.sql` - Rollback script
- `run_migration.js` - Node.js script to run migrations

## Migration Details

### 001_talent_info_enhancement.sql

This migration performs the following changes:

1. **Archive Emergency Contact Data**: Creates an archive table and preserves existing emergency contact information before removal
2. **Add Representative Fields**: Adds `rep_name`, `rep_email`, and `rep_phone` columns to `talent_profiles` table
3. **Remove Emergency Contact Fields**: Removes `emergency_contact_name`, `emergency_contact_phone`, and `emergency_contact_relationship` columns
4. **Create Talent-Project Assignments Table**: Creates `talent_project_assignments` table for many-to-many relationships
5. **Add Indexes**: Creates performance indexes on the new table
6. **Add Constraints**: Adds data validation constraints for email and phone formats
7. **Create Triggers**: Adds trigger for automatic `updated_at` timestamp updates
8. **Migrate Existing Data**: Migrates existing project assignments if `project_id` column exists

### Database Schema Changes

#### talent_profiles table changes:
- **Added**: `rep_name VARCHAR(100) NOT NULL`
- **Added**: `rep_email VARCHAR(255) NOT NULL`
- **Added**: `rep_phone VARCHAR(20) NOT NULL`
- **Removed**: `emergency_contact_name`
- **Removed**: `emergency_contact_phone`
- **Removed**: `emergency_contact_relationship`
- **Removed**: `project_id` (if exists, migrated to new table)

#### New table: talent_project_assignments
```sql
CREATE TABLE talent_project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  escort_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(talent_id, project_id, status)
);
```

#### New archive table: talent_emergency_contacts_archive
```sql
CREATE TABLE talent_emergency_contacts_archive (
  id UUID,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(50),
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);
```

## Running Migrations

### Using Supabase CLI (Recommended)
If you have Supabase CLI installed:

```bash
# Apply migration
supabase db reset
# or
supabase migration up

# Rollback migration
psql -h your-host -U your-user -d your-database -f migrations/001_talent_info_enhancement_rollback.sql
```

### Using psql directly
```bash
# Apply migration
psql -h your-host -U your-user -d your-database -f migrations/001_talent_info_enhancement.sql

# Rollback migration
psql -h your-host -U your-user -d your-database -f migrations/001_talent_info_enhancement_rollback.sql
```

### Using Node.js script
```bash
node migrations/run_migration.js
```

## Validation

After running the migration, verify:

1. **talent_profiles table structure**:
   ```sql
   \d talent_profiles
   ```

2. **talent_project_assignments table exists**:
   ```sql
   \d talent_project_assignments
   ```

3. **Archive table contains data** (if emergency contacts existed):
   ```sql
   SELECT COUNT(*) FROM talent_emergency_contacts_archive;
   ```

4. **Constraints are in place**:
   ```sql
   SELECT conname, contype FROM pg_constraint WHERE conrelid = 'talent_profiles'::regclass;
   ```

5. **Indexes are created**:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'talent_project_assignments';
   ```

## Rollback Considerations

The rollback migration will:
- Restore the `project_id` column to `talent_profiles`
- Migrate only the first active assignment per talent back to the single project model
- Restore emergency contact fields from the archive
- Remove all representative information fields
- Drop the `talent_project_assignments` table

**Note**: Rolling back will result in data loss for:
- Multiple project assignments per talent (only first assignment is preserved)
- Representative information
- Assignment history and metadata

## Requirements Satisfied

This migration satisfies the following requirements:
- **1.1**: Adds required representative fields (rep_name, rep_email, rep_phone)
- **7.3**: Removes emergency contact fields while preserving data in archive format