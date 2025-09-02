#!/usr/bin/env node

/**
 * Create 50 Staff Members Complete Script
 * Creates profiles for existing auth users and adds more to reach 50 total
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
const firstNames = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Blake', 'Cameron', 'Drew', 'Emery', 'Finley', 'Harper', 'Hayden', 'Jamie',
  'Kendall', 'Logan', 'Marley', 'Parker', 'Peyton', 'Reese', 'River', 'Rowan',
  'Sage', 'Skyler', 'Tatum', 'Teagan', 'Wren', 'Zion', 'Aria', 'Luna',
  'Nova', 'Kai', 'Phoenix', 'Sage', 'Ember', 'Orion', 'Atlas', 'Iris',
  'Jasper', 'Hazel', 'Felix', 'Ruby', 'Oscar', 'Violet', 'Leo', 'Stella',
  'Max', 'Zoe', 'Mia', 'Liam', 'Emma', 'Noah', 'Olivia', 'William', 'Ava',
  'James', 'Isabella', 'Benjamin', 'Sophia', 'Lucas', 'Charlotte', 'Henry',
  'Amelia', 'Alexander', 'Mia', 'Mason', 'Harper', 'Michael', 'Evelyn'
]

const lastNames = [
  'Anderson', 'Brown', 'Davis', 'Garcia', 'Johnson', 'Jones', 'Martinez', 'Miller',
  'Moore', 'Rodriguez', 'Smith', 'Taylor', 'Thomas', 'Thompson', 'White', 'Williams',
  'Wilson', 'Clark', 'Hall', 'Harris', 'Jackson', 'Lewis', 'Lopez', 'Martin',
  'Perez', 'Robinson', 'Walker', 'Wright', 'Young', 'Allen', 'Baker', 'Campbell',
  'Carter', 'Collins', 'Cooper', 'Edwards', 'Evans', 'Green', 'Hill', 'King',
  'Lee', 'Mitchell', 'Nelson', 'Parker', 'Phillips', 'Roberts', 'Scott', 'Stewart',
  'Turner', 'Ward', 'Adams', 'Bailey', 'Bell', 'Brooks', 'Butler', 'Cook',
  'Cox', 'Diaz', 'Fisher', 'Foster', 'Gray', 'Howard', 'Hughes', 'Kelly',
  'Long', 'Morgan', 'Murphy', 'Perry', 'Powell', 'Price', 'Reed', 'Rogers',
  'Ross', 'Sanders', 'Watson', 'Wood'
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

function generateEmail(firstName, lastName, index = '') {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com']
  const domain = getRandomElement(domains)
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}`
  return `${username}@${domain}`
}

async function createProfileForAuthUser(authUser) {
  // Extract name from email or use a generated name
  const emailParts = authUser.email.split('@')[0].split('.')
  let firstName, lastName
  
  if (emailParts.length >= 2) {
    firstName = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1)
    lastName = emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1)
  } else {
    firstName = getRandomElement(firstNames)
    lastName = getRandomElement(lastNames)
  }

  const fullName = `${firstName} ${lastName}`
  const phone = generatePhoneNumber()
  const city = getRandomElement(cities)
  const state = getRandomElement(states)
  const role = getRandomElement(roles)

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        full_name: fullName,
        email: authUser.email,
        phone: phone,
        city: city,
        state: state,
        role: role,
        status: 'active'
      })
      .select()
      .single()

    if (profileError) {
      console.error(`❌ Failed to create profile for ${authUser.email}:`, profileError.message)
      return null
    }

    console.log(`✅ Created profile: ${fullName} (${authUser.email}) - ${role} from ${city}, ${state}`)
    return profile

  } catch (error) {
    console.error(`❌ Unexpected error creating profile for ${authUser.email}:`, error.message)
    return null
  }
}

async function createNewStaffMember(index) {
  const firstName = getRandomElement(firstNames)
  const lastName = getRandomElement(lastNames)
  const email = generateEmail(firstName, lastName, index)
  const phone = generatePhoneNumber()
  const city = getRandomElement(cities)
  const state = getRandomElement(states)
  const role = getRandomElement(roles)
  const fullName = `${firstName} ${lastName}`
  
  try {
    // Create auth user first
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: 'TempPassword123!',
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
        status: 'active'
      })
      .select()
      .single()

    if (profileError) {
      console.error(`❌ Failed to create profile for ${fullName}:`, profileError.message)
      // Clean up auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return null
    }

    console.log(`✅ Created new staff: ${fullName} (${email}) - ${role} from ${city}, ${state}`)
    return { authUser: authUser.user, profile }

  } catch (error) {
    console.error(`❌ Unexpected error creating ${fullName}:`, error.message)
    return null
  }
}

async function create50StaffComplete() {
  console.log('🚀 Creating 50 staff members complete...\n')
  
  const results = {
    existingProfilesCreated: [],
    newStaffCreated: [],
    failed: [],
    total: 50
  }

  try {
    // Step 1: Get all auth users and profiles
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError.message)
      return
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    if (profilesError) {
      console.error('❌ Failed to fetch profiles:', profilesError.message)
      return
    }

    console.log(`🔐 Found ${authUsers.users.length} auth users`)
    console.log(`👤 Found ${profiles.length} profiles`)

    // Step 2: Create profiles for auth users that don't have them
    console.log('\n📝 Creating profiles for existing auth users...')
    const authUsersWithoutProfiles = authUsers.users.filter(authUser => 
      !profiles.find(profile => profile.id === authUser.id)
    )

    for (const authUser of authUsersWithoutProfiles) {
      const profile = await createProfileForAuthUser(authUser)
      if (profile) {
        results.existingProfilesCreated.push(profile)
      } else {
        results.failed.push(`Auth user: ${authUser.email}`)
      }
    }

    // Step 3: Calculate how many more staff we need
    const currentTotal = profiles.length + results.existingProfilesCreated.length
    const needed = Math.max(0, 50 - currentTotal)
    
    console.log(`\n📊 Current total: ${currentTotal}, Need to create: ${needed} more`)

    // Step 4: Create additional staff members
    if (needed > 0) {
      console.log('\n👥 Creating additional staff members...')
      
      const batchSize = 5
      for (let i = 0; i < needed; i += batchSize) {
        console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1} (users ${i+1}-${Math.min(i+batchSize, needed)})...`)
        
        const batchPromises = []
        for (let j = 0; j < batchSize && (i + j) < needed; j++) {
          batchPromises.push(createNewStaffMember(1000 + i + j))
        }

        const batchResults = await Promise.all(batchPromises)
        
        batchResults.forEach((result, index) => {
          if (result) {
            results.newStaffCreated.push(result)
          } else {
            results.failed.push(`New staff member ${i + index + 1}`)
          }
        })

        // Small delay between batches
        if (i + batchSize < needed) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    // Final summary
    const totalCreated = results.existingProfilesCreated.length + results.newStaffCreated.length
    console.log('\n📊 FINAL SUMMARY:')
    console.log('=================')
    console.log(`✅ Profiles created for existing auth users: ${results.existingProfilesCreated.length}`)
    console.log(`✅ New staff members created: ${results.newStaffCreated.length}`)
    console.log(`✅ Total staff created this run: ${totalCreated}`)
    console.log(`❌ Failed: ${results.failed.length}`)
    console.log(`🎯 Total staff in system: ${profiles.length + totalCreated}`)

    if (results.failed.length > 0) {
      console.log(`\nFailed items: ${results.failed.join(', ')}`)
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '..', 'complete-staff-creation-results.json')
    fs.writeFileSync(resultsPath, JSON.stringify({
      ...results,
      timestamp: new Date().toISOString(),
      finalTotal: profiles.length + totalCreated,
      existingProfiles: profiles.length,
      createdThisRun: totalCreated
    }, null, 2))

    console.log(`\n💾 Results saved to: complete-staff-creation-results.json`)
    
    if (totalCreated > 0) {
      console.log('\n🔑 IMPORTANT: All new users have temporary password: TempPassword123!')
      console.log('   Users should reset their passwords on first login.')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

create50StaffComplete().catch(console.error)