#!/usr/bin/env node

/**
 * Fix Staff Profiles Script
 * Updates the profiles that were auto-created when auth users were created
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
  process.exit(1)
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Sample data for generating realistic staff
const cities = [
  'Los Angeles', 'New York', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle',
  'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City',
  'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee',
  'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Mesa', 'Kansas City', 'Atlanta',
  'Long Beach', 'Colorado Springs', 'Raleigh', 'Miami', 'Virginia Beach', 'Omaha',
  'Oakland', 'Minneapolis', 'Tulsa', 'Arlington', 'Tampa', 'New Orleans'
]

const states = [
  'CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI',
  'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI',
  'CO', 'MN', 'SC', 'AL', 'LA', 'KY', 'OR', 'OK', 'CT', 'UT',
  'IA', 'NV', 'AR', 'MS', 'KS', 'NM', 'NE', 'WV', 'ID', 'HI',
  'NH', 'ME', 'MT', 'RI', 'DE', 'SD', 'ND', 'AK', 'VT', 'WY'
]

const roles = ['admin', 'in_house']

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function generatePhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100
  const exchange = Math.floor(Math.random() * 900) + 100
  const number = Math.floor(Math.random() * 9000) + 1000
  return `${areaCode}-${exchange}-${number}`
}

async function fixStaffProfiles() {
  console.log('🔧 Fixing staff profiles...\n')
  
  try {
    // Get all profiles that need to be updated (those with minimal data)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .or('phone.is.null,city.is.null,role.is.null')

    if (profilesError) {
      console.error('❌ Failed to fetch profiles:', profilesError.message)
      return
    }

    console.log(`📋 Found ${profiles.length} profiles to update`)

    const results = {
      successful: [],
      failed: [],
      total: profiles.length
    }

    // Update each profile with realistic data
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i]
      const city = getRandomElement(cities)
      const state = getRandomElement(states)
      const role = getRandomElement(roles)
      const phone = generatePhoneNumber()

      try {
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            phone: phone,
            city: city,
            state: state,
            role: role,
            status: 'active'
          })
          .eq('id', profile.id)
          .select()
          .single()

        if (updateError) {
          console.error(`❌ Failed to update profile ${profile.full_name}:`, updateError.message)
          results.failed.push(profile)
        } else {
          console.log(`✅ Updated profile: ${profile.full_name} - ${role} from ${city}, ${state}`)
          results.successful.push(updatedProfile)
        }
      } catch (error) {
        console.error(`❌ Unexpected error updating ${profile.full_name}:`, error.message)
        results.failed.push(profile)
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:')
    console.log('===========')
    console.log(`✅ Successfully updated: ${results.successful.length} profiles`)
    console.log(`❌ Failed to update: ${results.failed.length} profiles`)

    // Save results to file
    const resultsPath = path.join(__dirname, '..', 'profile-fix-results.json')
    fs.writeFileSync(resultsPath, JSON.stringify({
      ...results,
      timestamp: new Date().toISOString(),
      successful_profiles: results.successful.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: p.role,
        city: p.city,
        state: p.state,
        phone: p.phone
      }))
    }, null, 2))

    console.log(`\n💾 Results saved to: profile-fix-results.json`)

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

fixStaffProfiles().catch(console.error)