-- Migration Step 1: Add status_change to audit_action_type enum
-- This must be run in a separate transaction and committed before using the new value

-- Disable RLS temporarily for migration
ALTER TABLE timecard_audit_log DISABLE ROW LEVEL SECURITY;

-- Add the 'status_change' action type to the existing enum if it doesn't exist
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

-- Re-enable RLS
ALTER TABLE timecard_audit_log ENABLE ROW LEVEL SECURITY;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Step 1 completed: status_change enum value added. COMMIT this transaction before proceeding to step 2.';
END $$;