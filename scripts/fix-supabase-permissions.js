#!/usr/bin/env node

/**
 * Fix Supabase Permissions
 * This script provides SQL to fix service role permissions
 */

console.log('🔧 Supabase Service Role Permissions Fix')
console.log('=========================================\n')

console.log('The registration system is failing because the service role key doesn\'t have')
console.log('proper permissions to access the public schema and profiles table.\n')

console.log('📋 MANUAL FIX REQUIRED:')
console.log('Please copy and paste the following SQL into your Supabase SQL Editor:\n')

const sql = `-- Fix Service Role Permissions for Registration System
-- This grants the necessary permissions for the service role to manage user profiles

-- Grant usage on public schema to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant all privileges on profiles table to service_role
GRANT ALL ON public.profiles TO service_role;

-- Grant all privileges on all tables in public schema to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant all privileges on all sequences in public schema to service_role
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant all privileges on all functions in public schema to service_role
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- Ensure service_role can create users (should already have this)
-- This is typically granted by default, but let's be explicit
GRANT ALL ON auth.users TO service_role;`

console.log('```sql')
console.log(sql)
console.log('```\n')

console.log('📝 Steps:')
console.log('1. Go to your Supabase Dashboard')
console.log('2. Navigate to SQL Editor')
console.log('3. Create a new query')
console.log('4. Copy and paste the SQL above')
console.log('5. Click "Run" to execute')
console.log('6. Try registration again\n')

console.log('💡 Why this is needed:')
console.log('The service role key is used by the registration API to create user profiles.')
console.log('By default, it may not have permissions to access the public schema where')
console.log('the profiles table is located. This SQL grants the necessary permissions.\n')

console.log('✅ After running the SQL, the registration system should work correctly.')

// Also save to file for easy access
const fs = require('fs')
const path = require('path')
const sqlFile = path.join(__dirname, '..', 'fix-supabase-permissions.sql')
fs.writeFileSync(sqlFile, sql)
console.log(`💾 SQL also saved to: ${sqlFile}`)
console.log('   You can copy this file content to the Supabase SQL Editor')