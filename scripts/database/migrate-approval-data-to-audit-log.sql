-- Migration: Migrate existing approved_by and approved_at data to audit log entries
-- This migration creates audit log entries for existing approved timecards before removing the columns

-- IMPORTANT: This migration must be run in multiple steps due to PostgreSQL enum constraints
-- Step 1: Add enum value (must be committed before use)
-- Step 2: Insert data using the new enum value

-- Disable RLS temporarily for migration
ALTER TABLE timecard_audit_log DISABLE ROW LEVEL SECURITY;

-- First, add the 'status_change' action type to the existing enum if it doesn't exist
DO $$ 
BEGIN
    -- Check if 'status_change' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'status_change' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'audit_action_type'
        )
    ) THEN
        -- Add 'status_change' to the existing enum
        ALTER TYPE audit_action_type ADD VALUE 'status_change';
        RAISE NOTICE 'Added status_change to audit_action_type enum';
    ELSE
        RAISE NOTICE 'status_change already exists in audit_action_type enum';
    END IF;
END $$;

-- COMMIT the transaction here to make the enum value available
-- (This comment indicates where the transaction should be committed in practice)
-- Step 2: Insert audit log entries for existing approved timecards
-- This step should be run AFTER the enum value has been committed

INSERT INTO timecard_audit_log (
    id,
    timecard_id,
    change_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    changed_at,
    action_type,
    work_date
)
SELECT 
    gen_random_uuid() as id,
    th.id as timecard_id,
    gen_random_uuid() as change_id,
    NULL as field_name,  -- NULL for status changes
    'submitted' as old_value,  -- Assume previous status was submitted
    'approved' as new_value,
    th.approved_by as changed_by,
    th.approved_at as changed_at,
    'status_change'::audit_action_type as action_type,
    NULL as work_date  -- NULL for status changes
FROM timecard_headers th
WHERE th.approved_by IS NOT NULL 
  AND th.approved_at IS NOT NULL
  AND th.status = 'approved'
  -- Only migrate if audit log entry doesn't already exist
  AND NOT EXISTS (
    SELECT 1 FROM timecard_audit_log tal
    WHERE tal.timecard_id = th.id
      AND tal.action_type = 'status_change'
      AND tal.new_value = 'approved'
  );

-- Re-enable RLS after migration
ALTER TABLE timecard_audit_log ENABLE ROW LEVEL SECURITY;

-- Log the migration results
DO $$
DECLARE
    migrated_count INTEGER;
    audit_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM timecard_headers th
    WHERE th.approved_by IS NOT NULL 
      AND th.approved_at IS NOT NULL
      AND th.status = 'approved';
    
    SELECT COUNT(*) INTO audit_count
    FROM timecard_audit_log tal
    WHERE tal.action_type = 'status_change'
      AND tal.new_value = 'approved';
    
    RAISE NOTICE 'Migration completed: % approved timecards found, % audit log entries created', migrated_count, audit_count;
END $$;