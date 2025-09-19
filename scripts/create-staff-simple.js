#!/usr/bin/env node

/**
 * Create Staff Members - Simple Version
 * Creates staff members using the actual schema (no city/state columns)
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
  'Nova', 'Kai', 'Phoenix', 'Ember', 'Orion', 'Atlas', 'Iris',
  'Jasper', 'Hazel', 'Felix', 'Ruby', 'Oscar', 'Violet', 'Leo', 'Stella',
  'Max', 'Zoe', 'Mia', 'Liam', 'Emma', 'Noah', 'Olivia', 'William', 'Ava',
  'James', 'Isabella', 'Benjamin', 'Sophia', 'Lucas', 'Charlotte', 'Henry',
  'Amelia', 'Mason', 'Michael', 'Ethan', 'Abigail', 'Daniel', 'Emily'
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
  'Long', 'Morgan', 'Murphy', 'Perry', 'Powell', 'Price', 'Reed', 'Rogers'
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
  const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index ? '.' + index : ''}`
  return `${username}@${domain}`
}

async function createStaffMember(firstName, lastName, index) {
  const email = generateEmail(firstName, lastName, index)
  const phone = generatePhoneNumber()
  const nearestMajorCity = getRandomElement(cities)
  const willingToFly = Math.random() > 0.5
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

    // Wait a moment for any triggers to complete
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check if profile was auto-created
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.user.id)
      .single()

    if (existingProfile) {
      // Profile was auto-created, update it
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          nearest_major_city: nearestMajorCity,
          willing_to_fly: willingToFly,
          role: role,
          status: 'active'
        })
        .eq('id', authUser.user.id)
        .select()
        .single()

      if (updateError) {
        console.error(`❌ Failed to update auto-created profile for ${fullName}:`, updateError.message)
        await supabase.auth.admin.deleteUser(authUser.user.id)
        return null
      }

      console.log(`✅ Updated auto-created profile: ${fullName} (${email}) - ${role} from ${nearestMajorCity}`)
      return { authUser: authUser.user, profile: updatedProfile }
    } else {
      // No auto-created profile, create one manually
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          full_name: fullName,
          email: email,
          phone: phone,
          nearest_major_city: nearestMajorCity,
          willing_to_fly: willingToFly,
          role: role,
          status: 'active'
        })
        .select()
        .single()

      if (profileError) {
        console.error(`❌ Failed to create profile for ${fullName}:`, profileError.message)
        await supabase.auth.admin.deleteUser(authUser.user.id)
        return null
      }

      console.log(`✅ Created new staff: ${fullName} (${email}) - ${role} from ${nearestMajorCity}`)
      return { authUser: authUser.user, profile }
    }

  } catch (error) {
    console.error(`❌ Unexpected error creating ${fullName}:`, error.message)
    return null
  }
}

async function createStaff() {
  console.log('🚀 Creating staff members...\n')
  
  const results = {
    staffCreated: [],
    failed: [],
    target: 50
  }

  try {
    // Check current staff count
    const { data: currentProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    if (profilesError) {
      console.error('❌ Failed to fetch current profiles:', profilesError.message)
      return
    }

    console.log(`👤 Current staff count: ${currentProfiles.length}`)
    const needed = Math.max(0, 50 - currentProfiles.length)
    console.log(`🎯 Need to create: ${needed} more staff members\n`)

    if (needed === 0) {
      console.log('✅ Already have 50 or more staff members!')
      return
    }

    // Create needed staff members
    console.log('👥 Creating staff members...\n')
    
    const batchSize = 3 // Small batches to avoid rate limits
    for (let i = 0; i < needed; i += batchSize) {
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1} (staff ${i+1}-${Math.min(i+batchSize, needed)})...`)
      
      const batchPromises = []
      for (let j = 0; j < batchSize && (i + j) < needed; j++) {
        const firstName = getRandomElement(firstNames)
        const lastName = getRandomElement(lastNames)
        batchPromises.push(createStaffMember(firstName, lastName, Date.now() + i + j))
      }

      const batchResults = await Promise.all(batchPromises)
      
      batchResults.forEach((result, index) => {
        if (result) {
          results.staffCreated.push(result)
        } else {
          results.failed.push(`Staff member ${i + index + 1}`)
        }
      })

      // Delay between batches
      if (i + batchSize < needed) {
        console.log('⏳ Waiting before next batch...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Final summary
    const finalTotal = currentProfiles.length + results.staffCreated.length
    console.log('\n📊 FINAL SUMMARY:')
    console.log('=================')
    console.log(`✅ Staff members created: ${results.staffCreated.length}`)
    console.log(`❌ Failed: ${results.failed.length}`)
    console.log(`🎯 Total staff in system: ${finalTotal}`)

    if (results.failed.length > 0) {
      console.log(`\nFailed items: ${results.failed.join(', ')}`)
    }

    // Save results to file
    const resultsPath = path.join(__dirname, '..', 'staff-creation-results.json')
    fs.writeFileSync(resultsPath, JSON.stringify({
      ...results,
      timestamp: new Date().toISOString(),
      finalTotal: finalTotal,
      initialCount: currentProfiles.length,
      successful_staff: results.staffCreated.map(s => ({
        id: s.authUser.id,
        email: s.authUser.email,
        full_name: s.profile.full_name,
        role: s.profile.role,
        nearest_major_city: s.profile.nearest_major_city,
        willing_to_fly: s.profile.willing_to_fly
      }))
    }, null, 2))

    console.log(`\n💾 Results saved to: staff-creation-results.json`)
    
    if (results.staffCreated.length > 0) {
      console.log('\n🔑 IMPORTANT: All new users have temporary password: TempPassword123!')
      console.log('   Users should reset their passwords on first login.')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

createStaff().catch(console.error)