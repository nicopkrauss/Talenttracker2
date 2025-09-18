#!/usr/bin/env node

/**
 * Fix Registration Trigger
 * This script creates the missing user registration trigger
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 Registration System Fix')
console.log('==========================\n')

console.log('The registration system is failing because the automatic profile creation trigger is missing.')
console.log('This trigger should create a profile record when a new user registers.\n')

console.log('📋 MANUAL FIX REQUIRED:')
console.log('Please copy and paste the following SQL into your Supabase SQL Editor:\n')

const sql = `-- Fix Registration System: Create User Profile Trigger
-- This creates the missing trigger for automatic profile creation

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    status, 
    created_at, 
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'pending',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;`

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

// Also save to file for easy access
const sqlFile = path.join(__dirname, '..', 'fix-registration-trigger.sql')
fs.writeFileSync(sqlFile, sql)
console.log(`💾 SQL also saved to: ${sqlFile}`)
console.log('   You can copy this file content to the Supabase SQL Editor\n')

console.log('✅ After running the SQL, the registration system should work correctly.')