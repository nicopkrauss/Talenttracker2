#!/usr/bin/env node

/**
 * Add 50 Staff Members Script
 * Creates 50 staff members with realistic test data
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

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Sample data for generating realistic staff
const firstNames = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Harper', 'Hayden', 'Jamie',
  'Kendall', 'Logan', 'Marley', 'Parker', 'Peyton', 'Reese', 'River', 'Rowan',
  'Sage', 'Skyler', 'Tatum', 'Teagan', 'Wren', 'Zion', 'Aria', 'Luna',
  'Nova', 'Kai', 'Phoenix', 'Sage', 'Ember', 'Orion', 'Atlas', 'Iris',
  'Jasper', 'Hazel', 'Felix', 'Ruby', 'Oscar', 'Violet', 'Leo', 'Stella',
  'Max', 'Zoe'
]

const lastNames = [
  'Anderson', 'Brown', 'Davis', 'Garcia', 'Johnson', 'Jones', 'Martinez', 'Miller',
  'Moore', 'Rodriguez', 'Smith', 'Taylor', 'Thomas', 'Thompson', 'White', 'Williams',
  'Wilson', 'Clark', 'Hall', 'Harris', 'Jackson', 'Lewis', 'Lopez', 'Martin',
  'Perez', 'Robinson', 'Walker', 'Wright', 'Young', 'Allen', 'Baker', 'Campbell',
  'Carter', 'Collins', 'Cooper', 'Edwards', 'Evans', 'Green', 'Hill', 'King',
  'Lee', 'Mitchell', 'Nelson', 'Parker', 'Phillips', 'Roberts', 'Scott', 'Stewart',
  'Turner', 'Ward'
]

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

function generateEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com']
  const domain = getRandomElement(domains)
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
  return `${username}@${domain}`
}

async function createStaffMember(index) {
  const firstName = getRandomElement(firstNames)
  const lastName = getRandomElement(lastNames)
  const email = generateEmail(firstName, lastName)
  const phone = generatePhoneNumber()
  const city = getRandomElement(cities)
  const state = getRandomElement(states)
  const role = getRandomElement(roles)
  const fullName = `${firstName} ${lastName}`
  
  try {
    // Create auth user first
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: 'TempPassword123!', // They'll need to reset this
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role
      }
    })

    if (authError) {
      console.error(`❌ Failed to create auth user for ${fullName}:`, authError.message)
      return null
    }

    console.log(`✅ Created auth user: ${fullName} (${email})`)

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        full_name: fullName,
        email: email,
        phone: phone,
        city: city,
        state: state,
        role: role,
        status: 'active' // Make them active by default
      })
      .select()
      .single()

    if (profileError) {
      console.error(`❌ Failed to create profile for ${fullName}:`, profileError.message)
      // Clean up auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return null
    }

    console.log(`✅ Created profile: ${fullName} - ${role} from ${city}, ${state}`)
    return { authUser: authUser.user, profile }

  } catch (error) {
    console.error(`❌ Unexpected error creating ${fullName}:`, error.message)
    return null
  }
}

async function addStaffMembers() {
  console.log('🚀 Starting to add 50 staff members...\n')
  
  const results = {
    successful: [],
    failed: [],
    total: 50
  }

  // Check if we can connect to the database
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      console.error('❌ Cannot connect to database:', error.message)
      process.exit(1)
    }
  } catch (err) {
    console.error('❌ Database connection failed:', err.message)
    process.exit(1)
  }

  // Create staff members in batches to avoid overwhelming the API
  const batchSize = 5
  for (let i = 0; i < 50; i += batchSize) {
    console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1} (users ${i+1}-${Math.min(i+batchSize, 50)})...`)
    
    const batchPromises = []
    for (let j = 0; j < batchSize && (i + j) < 50; j++) {
      batchPromises.push(createStaffMember(i + j + 1))
    }

    const batchResults = await Promise.all(batchPromises)
    
    batchResults.forEach((result, index) => {
      if (result) {
        results.successful.push(result)
      } else {
        results.failed.push(i + index + 1)
      }
    })

    // Small delay between batches
    if (i + batchSize < 50) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Summary
  console.log('\n📊 SUMMARY:')
  console.log('===========')
  console.log(`✅ Successfully created: ${results.successful.length} staff members`)
  console.log(`❌ Failed to create: ${results.failed.length} staff members`)
  
  if (results.failed.length > 0) {
    console.log(`Failed indices: ${results.failed.join(', ')}`)
  }

  // Save results to file
  const resultsPath = path.join(__dirname, '..', 'staff-creation-results.json')
  fs.writeFileSync(resultsPath, JSON.stringify({
    ...results,
    timestamp: new Date().toISOString(),
    successful_users: results.successful.map(r => ({
      id: r.authUser.id,
      email: r.authUser.email,
      full_name: r.profile.full_name,
      role: r.profile.role,
      city: r.profile.city,
      state: r.profile.state
    }))
  }, null, 2))

  console.log(`\n💾 Results saved to: staff-creation-results.json`)
  
  if (results.successful.length > 0) {
    console.log('\n🔑 IMPORTANT: All users have temporary password: TempPassword123!')
    console.log('   Users should reset their passwords on first login.')
  }
}

addStaffMembers().catch(console.error)