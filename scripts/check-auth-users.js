#!/usr/bin/env node

/**
 * Check Auth Users Script
 * Lists all auth users and their corresponding profiles
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

async function checkAuthUsers() {
  console.log('👥 Checking auth users and profiles...\n')
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Failed to fetch auth users:', authError.message)
      return
    }

    console.log(`🔐 Found ${authUsers.users.length} auth users`)

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at')

    if (profilesError) {
      console.error('❌ Failed to fetch profiles:', profilesError.message)
      return
    }

    console.log(`👤 Found ${profiles.length} profiles`)

    // Match them up
    console.log('\n📋 AUTH USERS AND PROFILES:')
    console.log('===========================')

    const matchedUsers = []
    const unmatchedAuthUsers = []
    const unmatchedProfiles = []

    authUsers.users.forEach(authUser => {
      const matchingProfile = profiles.find(p => p.id === authUser.id)
      if (matchingProfile) {
        matchedUsers.push({
          authUser,
          profile: matchingProfile
        })
        console.log(`✅ ${matchingProfile.full_name} (${authUser.email}) - ${matchingProfile.role || 'no role'} - ${matchingProfile.status}`)
      } else {
        unmatchedAuthUsers.push(authUser)
        console.log(`❌ Auth user without profile: ${authUser.email}`)
      }
    })

    profiles.forEach(profile => {
      const matchingAuthUser = authUsers.users.find(u => u.id === profile.id)
      if (!matchingAuthUser) {
        unmatchedProfiles.push(profile)
        console.log(`❌ Profile without auth user: ${profile.full_name} (${profile.email})`)
      }
    })

    // Summary
    console.log('\n📊 SUMMARY:')
    console.log('===========')
    console.log(`✅ Matched users: ${matchedUsers.length}`)
    console.log(`❌ Auth users without profiles: ${unmatchedAuthUsers.length}`)
    console.log(`❌ Profiles without auth users: ${unmatchedProfiles.length}`)

    // Show role distribution
    const roleDistribution = {}
    matchedUsers.forEach(user => {
      const role = user.profile.role || 'no role'
      roleDistribution[role] = (roleDistribution[role] || 0) + 1
    })

    console.log('\n🎭 ROLE DISTRIBUTION:')
    console.log('====================')
    Object.entries(roleDistribution).forEach(([role, count]) => {
      console.log(`${role}: ${count}`)
    })

    // Save detailed results
    const resultsPath = path.join(__dirname, '..', 'auth-users-check.json')
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalAuthUsers: authUsers.users.length,
      totalProfiles: profiles.length,
      matchedUsers: matchedUsers.length,
      unmatchedAuthUsers: unmatchedAuthUsers.length,
      unmatchedProfiles: unmatchedProfiles.length,
      roleDistribution,
      matchedUserDetails: matchedUsers.map(u => ({
        id: u.authUser.id,
        email: u.authUser.email,
        full_name: u.profile.full_name,
        role: u.profile.role,
        status: u.profile.status,
        city: u.profile.city,
        state: u.profile.state,
        created_at: u.profile.created_at
      })),
      unmatchedAuthUserDetails: unmatchedAuthUsers.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at
      }))
    }, null, 2))

    console.log(`\n💾 Detailed results saved to: auth-users-check.json`)

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

checkAuthUsers().catch(console.error)