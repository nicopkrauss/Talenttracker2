-- Temporarily disable RLS on timecard_audit_log to test if this fixes the issue
-- This makes the table "unrestricted" like the other tables

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'timecard_audit_log';

-- Disable RLS temporarily
ALTER TABLE public.timecard_audit_log DISABLE ROW LEVEL SECURITY;

-- Test access after disabling RLS
SELECT 'Test after disabling RLS:' as info, COUNT(*) as audit_log_count 
FROM public.timecard_audit_log 
WHERE timecard_id = '50e3ac1d-fd71-4efb-b417-929e41dbeab3';

-- Show final status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'timecard_audit_log';