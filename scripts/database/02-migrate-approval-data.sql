-- Migration Step 2: Migrate existing approved_by and approved_at data to audit log entries
-- This step should be run AFTER step 1 has been committed

-- Disable RLS temporarily for migration
ALTER TABLE timecard_audit_log DISABLE ROW LEVEL SECURITY;

-- Insert audit log entries for existing approved timecards
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
    
    RAISE NOTICE 'Step 2 completed: % approved timecards found, % audit log entries created', migrated_count, audit_count;
END $$;