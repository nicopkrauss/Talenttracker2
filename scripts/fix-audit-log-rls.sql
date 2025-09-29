-- Fix RLS policies for timecard_audit_log table
-- The current policies are too restrictive and blocking all access

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'timecard_audit_log';

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view own timecard audit logs" ON public.timecard_audit_log;
DROP POLICY IF EXISTS "Admins can view all timecard audit logs" ON public.timecard_audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.timecard_audit_log;
DROP POLICY IF EXISTS "Audit logs are immutable" ON public.timecard_audit_log;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON public.timecard_audit_log;

-- Create new, properly working RLS policies
-- Policy 1: Users can view audit logs for their own timecards
CREATE POLICY "Users can view own timecard audit logs" ON public.timecard_audit_log
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.timecard_headers 
            WHERE timecard_headers.id = timecard_audit_log.timecard_id 
            AND timecard_headers.user_id = auth.uid()
        )
    );

-- Policy 2: Admins and in_house users can view all audit logs
CREATE POLICY "Admins can view all timecard audit logs" ON public.timecard_audit_log
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'in_house')
        )
    );

-- Policy 3: Allow authenticated users to insert audit logs (for API operations)
CREATE POLICY "Authenticated users can insert audit logs" ON public.timecard_audit_log
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 4: Prevent updates (audit logs should be immutable)
CREATE POLICY "Audit logs are immutable" ON public.timecard_audit_log
    FOR UPDATE 
    USING (false);

-- Policy 5: Prevent deletes (audit logs should be permanent)
CREATE POLICY "Audit logs cannot be deleted" ON public.timecard_audit_log
    FOR DELETE 
    USING (false);

-- Ensure RLS is enabled
ALTER TABLE public.timecard_audit_log ENABLE ROW LEVEL SECURITY;

-- Test the policies by checking if we can now access the data
SELECT 'Policy test - should return count' as test_name, COUNT(*) as count 
FROM public.timecard_audit_log 
WHERE timecard_id = '50e3ac1d-fd71-4efb-b417-929e41dbeab3';

-- Show the final policies
SELECT 'Final policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'timecard_audit_log';