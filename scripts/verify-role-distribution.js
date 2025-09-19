#!/usr/bin/env node

/**
 * Verify Role Distribution Script
 * Shows detailed breakdown of staff roles
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

async function verifyRoleDistribution() {
  console.log('🔍 Verifying role distribution...\n')
  
  try {
    // Get all staff with roles
    const { data: allStaff, error: fetchError } = await supabase
      .from('profiles')
      .select('full_name, email, role, nearest_major_city')
      .order('role', { ascending: true })
      .order('full_name', { ascending: true })

    if (fetchError) {
      console.error('❌ Failed to fetch staff:', fetchError.message)
      return
    }

    // Group by role
    const roleGroups = allStaff.reduce((groups, staff) => {
      const role = staff.role || 'null'
      if (!groups[role]) {
        groups[role] = []
      }
      groups[role].push(staff)
      return groups
    }, {})

    // Display each role group
    console.log('📊 DETAILED ROLE DISTRIBUTION:')
    console.log('===============================\n')

    // Admin
    if (roleGroups.admin) {
      console.log(`👑 ADMIN (${roleGroups.admin.length}):`)
      roleGroups.admin.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.full_name} (${staff.email})`)
        console.log(`      📍 ${staff.nearest_major_city}`)
      })
      console.log('')
    }

    // Coordinators
    if (roleGroups.coordinator) {
      console.log(`📋 COORDINATORS (${roleGroups.coordinator.length}):`)
      roleGroups.coordinator.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.full_name} (${staff.email})`)
        console.log(`      📍 ${staff.nearest_major_city}`)
      })
      console.log('')
    }

    // Supervisors
    if (roleGroups.supervisor) {
      console.log(`👷 SUPERVISORS (${roleGroups.supervisor.length}):`)
      roleGroups.supervisor.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.full_name} (${staff.email})`)
        console.log(`      📍 ${staff.nearest_major_city}`)
      })
      console.log('')
    }

    // Talent Escorts
    if (roleGroups.talent_escort) {
      console.log(`🚶 TALENT ESCORTS (${roleGroups.talent_escort.length}):`)
      roleGroups.talent_escort.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.full_name} (${staff.email})`)
        console.log(`      📍 ${staff.nearest_major_city}`)
      })
      console.log('')
    }

    // Any other roles
    Object.keys(roleGroups).forEach(role => {
      if (!['admin', 'coordinator', 'supervisor', 'talent_escort'].includes(role)) {
        console.log(`❓ ${role.toUpperCase()} (${roleGroups[role].length}):`)
        roleGroups[role].forEach((staff, index) => {
          console.log(`   ${index + 1}. ${staff.full_name} (${staff.email})`)
          console.log(`      📍 ${staff.nearest_major_city}`)
        })
        console.log('')
      }
    })

    // Summary
    console.log('📊 SUMMARY:')
    console.log('===========')
    console.log(`👑 Admin: ${roleGroups.admin?.length || 0}`)
    console.log(`📋 Coordinators: ${roleGroups.coordinator?.length || 0}`)
    console.log(`👷 Supervisors: ${roleGroups.supervisor?.length || 0}`)
    console.log(`🚶 Talent Escorts: ${roleGroups.talent_escort?.length || 0}`)
    console.log(`❓ Other: ${Object.keys(roleGroups).filter(role => 
      !['admin', 'coordinator', 'supervisor', 'talent_escort'].includes(role)
    ).reduce((sum, role) => sum + roleGroups[role].length, 0)}`)
    console.log(`📊 Total: ${allStaff.length}`)

    // Verify requirements
    console.log('\n✅ REQUIREMENTS CHECK:')
    console.log('======================')
    console.log(`👑 Only Nico Krauss is admin: ${
      roleGroups.admin?.length === 1 && 
      roleGroups.admin[0].full_name.includes('Nico') && 
      roleGroups.admin[0].full_name.includes('Krauss') ? '✅ YES' : '❌ NO'
    }`)
    console.log(`📋 ~15 Coordinators: ${roleGroups.coordinator?.length || 0} ${
      (roleGroups.coordinator?.length || 0) >= 14 && (roleGroups.coordinator?.length || 0) <= 16 ? '✅' : '❌'
    }`)
    console.log(`👷 ~5 Supervisors: ${roleGroups.supervisor?.length || 0} ${
      (roleGroups.supervisor?.length || 0) >= 4 && (roleGroups.supervisor?.length || 0) <= 6 ? '✅' : '❌'
    }`)
    console.log(`🚶 Rest are Escorts: ${roleGroups.talent_escort?.length || 0} ${
      (roleGroups.talent_escort?.length || 0) >= 25 ? '✅' : '❌'
    }`)

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

verifyRoleDistribution().catch(console.error)