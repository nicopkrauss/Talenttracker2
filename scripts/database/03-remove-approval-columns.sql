-- Migration Step 3: Remove approved_by and approved_at columns from timecard_headers table
-- This migration should be run AFTER steps 1 and 2 have been completed and committed

-- First, verify that the data has been migrated
DO $$
DECLARE
    unmigrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmigrated_count
    FROM timecard_headers th
    WHERE th.approved_by IS NOT NULL 
      AND th.approved_at IS NOT NULL
      AND th.status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM timecard_audit_log tal
        WHERE tal.timecard_id = th.id
          AND tal.action_type = 'status_change'
          AND tal.new_value = 'approved'
      );
    
    IF unmigrated_count > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % approved timecards have not been migrated to audit log. Run steps 1 and 2 first.', unmigrated_count;
    END IF;
    
    RAISE NOTICE 'Data migration verification passed. Proceeding with column removal.';
END $$;

-- Drop the foreign key constraint first
ALTER TABLE timecard_headers 
DROP CONSTRAINT IF EXISTS timecard_headers_approved_by_fkey;

-- Remove the approved_by column
ALTER TABLE timecard_headers 
DROP COLUMN IF EXISTS approved_by;

-- Remove the approved_at column  
ALTER TABLE timecard_headers 
DROP COLUMN IF EXISTS approved_at;

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Step 3 completed: Successfully removed approved_by and approved_at columns from timecard_headers table';
END $$;