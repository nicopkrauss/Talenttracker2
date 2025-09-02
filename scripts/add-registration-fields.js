#!/usr/bin/env node

/**
 * Add Registration Fields Script
 * This script adds the new registration fields to the profiles table
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

async function addRegistrationFields() {
  console.log('🚀 Adding registration fields to profiles table...')
  
  try {
    // Check if columns already exist
    console.log('📋 Checking existing table structure...')
    
    const { data: existingColumns, error: checkError } = await supabase
      .from('profiles')
      .select('registration_role, nearest_major_city, willing_to_fly')
      .limit(1)
    
    if (!checkError) {
      console.log('✅ Registration fields already exist!')
      return
    }
    
    console.log('📝 Adding new columns...')
    
    // Since we can't run DDL directly, let's use the REST API approach
    // We'll need to add the columns through the Supabase dashboard or use a different method
    
    console.log('⚠️  Please add the following columns to the profiles table manually in Supabase dashboard:')
    console.log('   - registration_role (text, nullable)')
    console.log('   - nearest_major_city (text, nullable)')
    console.log('   - willing_to_fly (boolean, default false)')
    
    console.log('\nOr run this SQL in the Supabase SQL editor:')
    console.log(`
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS registration_role TEXT,
ADD COLUMN IF NOT EXISTS nearest_major_city TEXT,
ADD COLUMN IF NOT EXISTS willing_to_fly BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD CONSTRAINT check_registration_role 
CHECK (registration_role IN ('in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'));

CREATE INDEX IF NOT EXISTS idx_profiles_registration_role ON public.profiles(registration_role);
CREATE INDEX IF NOT EXISTS idx_profiles_nearest_major_city ON public.profiles(nearest_major_city);
CREATE INDEX IF NOT EXISTS idx_profiles_willing_to_fly ON public.profiles(willing_to_fly) WHERE willing_to_fly = true;
    `)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

addRegistrationFields()
  .then(() => {
    console.log('🎉 Process completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Process failed:', error)
    process.exit(1)
  })