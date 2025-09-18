#!/usr/bin/env node

/**
 * Fix Login RLS Policies
 * This script provides SQL to fix Row Level Security policies for login
 */

console.log('🔧 Fix Login RLS Policies')
console.log('=========================\n')

console.log('The login error is likely caused by missing Row Level Security (RLS) policies')
console.log('that allow users to access their own profiles during authentication.\n')

console.log('📋 MANUAL FIX REQUIRED:')
console.log('Please copy and paste the following SQL into your Supabase SQL Editor:\n')

const sql = `-- Fix Login Issues: Create RLS Policies for Profile Access
-- This allows users to read and update their own profiles during authentication

-- First, check if RLS is enabled (it should be)
-- If not enabled, you can enable it with: ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

-- Create policy for users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Create policy for users to update their own profile  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create policy for service role to manage all profiles (for registration)
CREATE POLICY "Service role can manage all profiles" ON profiles
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Grant necessary permissions to authenticated users
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure anon users can't access profiles (security)
REVOKE ALL ON profiles FROM anon;`

console.log('```sql')
console.log(sql)
console.log('```\n')

console.log('📝 Steps:')
console.log('1. Go to your Supabase Dashboard')
console.log('2. Navigate to SQL Editor')
console.log('3. Create a new query')
console.log('4. Copy and paste the SQL above')
console.log('5. Click "Run" to execute')
console.log('6. Try logging in again\n')

console.log('💡 What this fixes:')
console.log('- Allows authenticated users to read their own profile')
console.log('- Allows authenticated users to update their own profile')
console.log('- Allows service role to manage profiles (for registration)')
console.log('- Prevents anonymous users from accessing profiles')
console.log('')
console.log('✅ After running the SQL, login should work correctly.')

// Also save to file for easy access
const fs = require('fs')
const path = require('path')
const sqlFile = path.join(__dirname, '..', 'fix-login-rls-policies.sql')
fs.writeFileSync(sqlFile, sql)
console.log(`💾 SQL also saved to: ${sqlFile}`)
console.log('   You can copy this file content to the Supabase SQL Editor')