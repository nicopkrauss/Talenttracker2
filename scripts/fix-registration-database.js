#!/usr/bin/env node

/**
 * Fix Registration Database Script
 * This script fixes all database issues for the role-based registration system
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

// Parse environment variables
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixRegistrationDatabase() {
  console.log('🚀 Fixing database for role-based registration...')
  
  try {
    console.log('\n📋 Current database issues to fix:')
    console.log('   1. Add registration_role, nearest_major_city, willing_to_fly columns')
    console.log('   2. Update system_role enum to include all registration roles')
    console.log('   3. Remove old city/state columns (optional)')
    console.log('   4. Add proper indexes and constraints')
    
    console.log('\n⚠️  IMPORTANT: Run this SQL in your Supabase SQL Editor:')
    console.log('\n' + '='.repeat(80))
    
    const sql = `
-- Step 1: Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS registration_role TEXT,
ADD COLUMN IF NOT EXISTS nearest_major_city TEXT,
ADD COLUMN IF NOT EXISTS willing_to_fly BOOLEAN DEFAULT false;

-- Step 2: Update the system_role enum to include all registration roles
-- First, add the new values to the enum
ALTER TYPE public.system_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.system_role ADD VALUE IF NOT EXISTS 'talent_logistics_coordinator';
ALTER TYPE public.system_role ADD VALUE IF NOT EXISTS 'talent_escort';

-- Step 3: Add check constraint for registration_role
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS check_registration_role;

ALTER TABLE public.profiles 
ADD CONSTRAINT check_registration_role 
CHECK (registration_role IN ('in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'));

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_registration_role ON public.profiles(registration_role);
CREATE INDEX IF NOT EXISTS idx_profiles_nearest_major_city ON public.profiles(nearest_major_city);
CREATE INDEX IF NOT EXISTS idx_profiles_willing_to_fly ON public.profiles(willing_to_fly) WHERE willing_to_fly = true;

-- Step 5: Add comments for documentation
COMMENT ON COLUMN public.profiles.registration_role IS 'Role selected during registration process';
COMMENT ON COLUMN public.profiles.nearest_major_city IS 'Nearest major city selected from predefined list';
COMMENT ON COLUMN public.profiles.willing_to_fly IS 'Whether user is willing to fly for projects (only relevant for covered roles)';

-- Step 6: Optional - Remove old city/state columns if you want to clean up
-- Uncomment these lines if you want to remove the old columns:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS city;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS state;

-- Step 7: Update any existing profiles to have a default registration_role based on their system role
UPDATE public.profiles 
SET registration_role = CASE 
  WHEN role = 'admin' THEN 'in_house'
  WHEN role = 'in_house' THEN 'in_house'
  ELSE 'talent_escort'  -- Default for users without a system role
END
WHERE registration_role IS NULL;
`
    
    console.log(sql)
    console.log('='.repeat(80))
    
    console.log('\n📝 After running the SQL above, update your Prisma schema:')
    console.log('\n1. Update the system_role enum in prisma/schema.prisma:')
    console.log(`
enum system_role {
  admin
  in_house
  supervisor
  talent_logistics_coordinator
  talent_escort

  @@schema("public")
}
`)
    
    console.log('\n2. Then run: npx prisma generate')
    console.log('\n3. Test the registration flow')
    
    console.log('\n✅ Instructions provided. Please run the SQL in Supabase dashboard.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

fixRegistrationDatabase()
  .then(() => {
    console.log('\n🎉 Database fix instructions completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Process failed:', error)
    process.exit(1)
  })