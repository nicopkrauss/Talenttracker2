#!/usr/bin/env node

/**
 * Fix All Database Permissions
 * This script provides comprehensive SQL to fix all database permissions issues
 */

console.log('🔧 Fix All Database Permissions')
console.log('===============================\n')

console.log('You\'re experiencing widespread "permission denied" errors across all tables.')
console.log('This indicates a fundamental RLS/permissions configuration issue.\n')

console.log('📋 COMPREHENSIVE FIX REQUIRED:')
console.log('Please copy and paste the following SQL into your Supabase SQL Editor:\n')

const sql = `-- COMPREHENSIVE DATABASE PERMISSIONS FIX
-- This fixes all permission issues for the Talent Tracker application

-- ============================================================================
-- STEP 1: Grant basic schema and role permissions
-- ============================================================================

-- Grant usage on public schema to all authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant all privileges on public schema to service_role
GRANT ALL ON SCHEMA public TO service_role;

-- ============================================================================
-- STEP 2: Grant table permissions to authenticated users
-- ============================================================================

-- Core tables that authenticated users need access to
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_assignments TO authenticated;
GRANT SELECT ON public.talent TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_project_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_status TO authenticated;
GRANT SELECT ON public.project_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timecards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
GRANT SELECT ON public.project_role_templates TO authenticated;
GRANT SELECT ON public.project_setup_checklist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_daily_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_daily_assignments TO authenticated;

-- Grant all privileges to service_role (for API operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- ============================================================================
-- STEP 3: Drop and recreate RLS policies for core tables
-- ============================================================================

-- PROFILES TABLE POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admin can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'in_house')
    )
  );

-- PROJECTS TABLE POLICIES
DROP POLICY IF EXISTS "Users can read assigned projects" ON projects;
DROP POLICY IF EXISTS "Admin can manage all projects" ON projects;
DROP POLICY IF EXISTS "Service role can manage all projects" ON projects;

CREATE POLICY "Users can read assigned projects" ON projects
  FOR SELECT USING (
    -- Admin and in_house can see all projects
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'in_house')
    )
    OR
    -- Other users can see projects they're assigned to
    id IN (
      SELECT project_id FROM team_assignments 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'in_house')
    )
  );

CREATE POLICY "Service role can manage all projects" ON projects
  FOR ALL USING (auth.role() = 'service_role');

-- TEAM ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Users can read relevant assignments" ON team_assignments;
DROP POLICY IF EXISTS "Users can manage own assignments" ON team_assignments;
DROP POLICY IF EXISTS "Service role can manage all assignments" ON team_assignments;

CREATE POLICY "Users can read relevant assignments" ON team_assignments
  FOR SELECT USING (
    -- Users can see their own assignments
    user_id = auth.uid()
    OR
    -- Admin/in_house can see all assignments
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'in_house')
    )
    OR
    -- Users can see assignments for projects they're assigned to
    project_id IN (
      SELECT project_id FROM team_assignments 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own assignments" ON team_assignments
  FOR ALL USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'in_house')
    )
  );

CREATE POLICY "Service role can manage all assignments" ON team_assignments
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- STEP 4: Create permissive policies for other tables
-- ============================================================================

-- For tables that need broad access, create permissive policies
DO $$
DECLARE
    table_name text;
    tables_to_fix text[] := ARRAY[
        'talent', 'talent_project_assignments', 'talent_status', 
        'project_locations', 'shifts', 'timecards', 'notifications',
        'user_favorites', 'project_role_templates', 'project_setup_checklist',
        'talent_groups', 'talent_daily_assignments', 'group_daily_assignments'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_fix
    LOOP
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can access %I" ON %I', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Service role can manage %I" ON %I', table_name, table_name);
        
        -- Create permissive policies for authenticated users
        EXECUTE format('CREATE POLICY "Authenticated users can access %I" ON %I FOR ALL USING (auth.role() = ''authenticated'')', table_name, table_name);
        
        -- Create service role policy
        EXECUTE format('CREATE POLICY "Service role can manage %I" ON %I FOR ALL USING (auth.role() = ''service_role'')', table_name, table_name);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Ensure RLS is enabled but not blocking
-- ============================================================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;

-- For development/testing, you might want to temporarily disable RLS on some tables
-- Uncomment these lines if you want to disable RLS for easier development:
-- ALTER TABLE talent DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE talent_project_assignments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE talent_status DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE project_locations DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Grant sequence permissions
-- ============================================================================

-- Grant usage on all sequences to authenticated users
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 7: Verify permissions
-- ============================================================================

-- This will show current policies (run separately to check)
-- SELECT tablename, policyname, cmd, permissive, roles, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;`

console.log('```sql')
console.log(sql)
console.log('```\n')

console.log('📝 Steps:')
console.log('1. Go to your Supabase Dashboard')
console.log('2. Navigate to SQL Editor')
console.log('3. Create a new query')
console.log('4. Copy and paste the SQL above')
console.log('5. Click "Run" to execute')
console.log('6. Try using the application again\n')

console.log('💡 What this fixes:')
console.log('- Grants proper schema access to all user roles')
console.log('- Creates comprehensive RLS policies for core tables')
console.log('- Ensures service role has full access for API operations')
console.log('- Sets up permissive policies for supporting tables')
console.log('- Grants sequence permissions for auto-incrementing IDs')
console.log('')
console.log('🔧 If you still have issues after this:')
console.log('- Check the browser console for specific error messages')
console.log('- Run the verification query at the bottom of the SQL')
console.log('- Consider temporarily disabling RLS on problematic tables')
console.log('')
console.log('✅ After running this SQL, all database access should work correctly.')

// Also save to file for easy access
const fs = require('fs')
const path = require('path')
const sqlFile = path.join(__dirname, '..', 'fix-all-database-permissions.sql')
fs.writeFileSync(sqlFile, sql)
console.log(`💾 SQL also saved to: ${sqlFile}`)
console.log('   You can copy this file content to the Supabase SQL Editor')