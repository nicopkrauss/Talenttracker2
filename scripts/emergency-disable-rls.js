#!/usr/bin/env node

/**
 * Emergency RLS Disable
 * This script provides SQL to temporarily disable RLS for development
 * WARNING: This reduces security - only use for development/testing
 */

console.log('🚨 Emergency RLS Disable (Development Only)')
console.log('============================================\n')

console.log('⚠️  WARNING: This will temporarily disable Row Level Security on all tables.')
console.log('⚠️  This reduces security and should ONLY be used for development/testing.')
console.log('⚠️  DO NOT use this in production!\n')

console.log('📋 EMERGENCY FIX (if comprehensive fix doesn\'t work):')
console.log('Please copy and paste the following SQL into your Supabase SQL Editor:\n')

const sql = `-- EMERGENCY: Disable RLS on all tables for development
-- WARNING: This reduces security - only use for development/testing

-- Disable RLS on all main tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_project_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE timecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_role_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_setup_checklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_daily_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_daily_assignments DISABLE ROW LEVEL SECURITY;

-- Grant basic permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure service role has full access
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;`

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

console.log('💡 What this does:')
console.log('- Disables Row Level Security on all tables')
console.log('- Grants broad permissions to authenticated users')
console.log('- Allows full access for development and testing')
console.log('')
console.log('🔧 To re-enable security later:')
console.log('- Run the comprehensive permissions fix script')
console.log('- Or manually enable RLS: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;')
console.log('')
console.log('⚠️  Remember: This is a temporary development solution!')
console.log('✅ After running this SQL, all database access should work immediately.')

// Also save to file for easy access
const fs = require('fs')
const path = require('path')
const sqlFile = path.join(__dirname, '..', 'emergency-disable-rls.sql')
fs.writeFileSync(sqlFile, sql)
console.log(`💾 SQL also saved to: ${sqlFile}`)
console.log('   You can copy this file content to the Supabase SQL Editor')