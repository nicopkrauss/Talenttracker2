#!/usr/bin/env node

/**
 * Check RLS Policies
 * This script checks Row Level Security policies that might affect login
 */

console.log('🔍 Row Level Security Policy Check')
console.log('===================================\n')

console.log('The login error might be caused by Row Level Security (RLS) policies')
console.log('that prevent users from accessing their own profiles during login.\n')

console.log('📋 MANUAL CHECK REQUIRED:')
console.log('Please run this SQL in your Supabase SQL Editor to check RLS policies:\n')

const sql = `-- Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if RLS is enabled on profiles table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';`

console.log('```sql')
console.log(sql)
console.log('```\n')

console.log('🔧 If RLS is blocking profile access, you may need to add a policy like:')
console.log('')
console.log('```sql')
console.log('-- Allow users to read their own profile')
console.log('CREATE POLICY "Users can read own profile" ON profiles')
console.log('  FOR SELECT USING (auth.uid() = id);')
console.log('')
console.log('-- Allow users to update their own profile')  
console.log('CREATE POLICY "Users can update own profile" ON profiles')
console.log('  FOR UPDATE USING (auth.uid() = id);')
console.log('```\n')

console.log('💡 Common RLS issues during login:')
console.log('1. No SELECT policy for users to read their own profile')
console.log('2. Policies that are too restrictive')
console.log('3. Missing authenticated role permissions')
console.log('')
console.log('✅ After fixing RLS policies, login should work correctly.')

// Also save to file for easy access
const fs = require('fs')
const path = require('path')
const sqlFile = path.join(__dirname, '..', 'check-rls-policies.sql')
fs.writeFileSync(sqlFile, sql)
console.log(`💾 SQL also saved to: ${sqlFile}`)
console.log('   You can copy this file content to the Supabase SQL Editor')