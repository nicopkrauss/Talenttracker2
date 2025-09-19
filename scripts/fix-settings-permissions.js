#!/usr/bin/env node

/**
 * Fix Settings Permissions
 * This script provides SQL to fix the RLS permissions for the settings tables
 */

console.log('🔧 Settings Permissions Fix')
console.log('===========================')
console.log('')
console.log('The tables were created but RLS policies need to be fixed.')
console.log('Run this SQL in your Supabase SQL Editor:')
console.log('')
console.log('--- PERMISSIONS FIX SQL ---')
console.log('')

const permissionsSql = `
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view project settings for accessible projects" ON project_settings;
DROP POLICY IF EXISTS "Users can update project settings for accessible projects" ON project_settings;
DROP POLICY IF EXISTS "Users can view audit log for accessible projects" ON project_audit_log;
DROP POLICY IF EXISTS "Users can insert audit log entries for accessible projects" ON project_audit_log;
DROP POLICY IF EXISTS "Users can view attachments for accessible projects" ON project_attachments;
DROP POLICY IF EXISTS "Users can manage attachments for accessible projects" ON project_attachments;

-- Create simplified policies that work with the existing project access patterns
-- Project settings policies
CREATE POLICY "project_settings_select_policy" ON project_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN team_assignments ta ON p.id = ta.project_id
      LEFT JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = project_id
      AND (
        pr.role IN ('admin', 'in_house')
        OR ta.user_id = auth.uid()
        OR p.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "project_settings_all_policy" ON project_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN team_assignments ta ON p.id = ta.project_id
      LEFT JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = project_id
      AND (
        pr.role IN ('admin', 'in_house')
        OR ta.user_id = auth.uid()
        OR p.created_by = auth.uid()
      )
    )
  );

-- Audit log policies
CREATE POLICY "project_audit_log_select_policy" ON project_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN team_assignments ta ON p.id = ta.project_id
      LEFT JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = project_id
      AND (
        pr.role IN ('admin', 'in_house')
        OR ta.user_id = auth.uid()
        OR p.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "project_audit_log_insert_policy" ON project_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN team_assignments ta ON p.id = ta.project_id
      LEFT JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = project_id
      AND (
        pr.role IN ('admin', 'in_house')
        OR ta.user_id = auth.uid()
        OR p.created_by = auth.uid()
      )
    )
  );

-- Attachments policies
CREATE POLICY "project_attachments_select_policy" ON project_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN team_assignments ta ON p.id = ta.project_id
      LEFT JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = project_id
      AND (
        pr.role IN ('admin', 'in_house')
        OR ta.user_id = auth.uid()
        OR p.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "project_attachments_all_policy" ON project_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN team_assignments ta ON p.id = ta.project_id
      LEFT JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = project_id
      AND (
        pr.role IN ('admin', 'in_house')
        OR ta.user_id = auth.uid()
        OR p.created_by = auth.uid()
      )
    )
  );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON project_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_attachments TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
`;

console.log(permissionsSql)
console.log('')
console.log('--- END SQL ---')
console.log('')
console.log('This will fix the permission issues by:')
console.log('1. Dropping conflicting policies')
console.log('2. Creating new policies that match your existing project access patterns')
console.log('3. Granting necessary table permissions to authenticated users')
console.log('4. Granting sequence usage permissions')