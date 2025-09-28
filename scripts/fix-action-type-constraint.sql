-- Fix action_type constraint on timecard_audit_log table
-- This script updates the constraint to allow all three valid action types

-- Drop the existing constraint
ALTER TABLE public.timecard_audit_log 
DROP CONSTRAINT IF EXISTS timecard_audit_log_action_type_check;

-- Add the updated constraint with all valid action types
ALTER TABLE public.timecard_audit_log 
ADD CONSTRAINT timecard_audit_log_action_type_check 
CHECK (action_type IN ('user_edit', 'admin_edit', 'rejection_edit'));

-- Verify the constraint was created
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.timecard_audit_log'::regclass 
AND conname = 'timecard_audit_log_action_type_check';