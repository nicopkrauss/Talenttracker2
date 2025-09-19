#!/usr/bin/env node

/**
 * Update Staff Roles Script
 * Updates staff roles to have proper distribution:
 * - Nico Krauss: admin (only admin)
 * - ~15 coordinators
 * - ~5 supervisors  
 * - Rest: talent_escort
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

async function updateStaffRoles() {
  console.log('🚀 Updating staff roles...\n')
  
  const results = {
    admin: 0,
    coordinator: 0,
    supervisor: 0,
    talent_escort: 0,
    errors: []
  }

  try {
    // Get all staff profiles
    const { data: allStaff, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name')

    if (fetchError) {
      console.error('❌ Failed to fetch staff:', fetchError.message)
      return
    }

    console.log(`👥 Found ${allStaff.length} staff members`)

    // Find Nico Krauss
    const nicoProfile = allStaff.find(staff => 
      staff.full_name.toLowerCase().includes('nico') && 
      staff.full_name.toLowerCase().includes('krauss')
    )

    if (!nicoProfile) {
      console.error('❌ Could not find Nico Krauss profile')
      return
    }

    console.log(`👑 Found Nico Krauss: ${nicoProfile.full_name} (${nicoProfile.email})`)

    // Get all other staff (excluding Nico)
    const otherStaff = allStaff.filter(staff => staff.id !== nicoProfile.id)
    console.log(`👤 Other staff to reassign: ${otherStaff.length}`)

    // Shuffle the other staff for random assignment
    const shuffledStaff = [...otherStaff].sort(() => Math.random() - 0.5)

    // Role distribution
    const targetCoordinators = 15
    const targetSupervisors = 5
    // Rest will be talent_escort

    console.log('\n📋 Role Distribution Plan:')
    console.log(`   Admin: 1 (Nico Krauss only)`)
    console.log(`   Coordinators: ${targetCoordinators}`)
    console.log(`   Supervisors: ${targetSupervisors}`)
    console.log(`   Talent Escorts: ${shuffledStaff.length - targetCoordinators - targetSupervisors}`)

    // Update Nico to admin (if not already)
    if (nicoProfile.role !== 'admin') {
      console.log(`\n👑 Updating Nico Krauss to admin...`)
      const { error: nicoError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', nicoProfile.id)

      if (nicoError) {
        console.error(`❌ Failed to update Nico to admin:`, nicoError.message)
        results.errors.push(`Nico Krauss: ${nicoError.message}`)
      } else {
        console.log(`✅ Nico Krauss updated to admin`)
        results.admin = 1
      }
    } else {
      console.log(`✅ Nico Krauss already admin`)
      results.admin = 1
    }

    // Assign roles to other staff
    console.log(`\n👥 Updating other staff roles...`)

    let roleIndex = 0

    // Assign coordinators
    console.log(`\n📋 Assigning ${targetCoordinators} coordinators...`)
    for (let i = 0; i < targetCoordinators && roleIndex < shuffledStaff.length; i++, roleIndex++) {
      const staff = shuffledStaff[roleIndex]
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'coordinator' })
        .eq('id', staff.id)

      if (updateError) {
        console.error(`❌ Failed to update ${staff.full_name}:`, updateError.message)
        results.errors.push(`${staff.full_name}: ${updateError.message}`)
      } else {
        console.log(`✅ ${staff.full_name} → coordinator`)
        results.coordinator++
      }
    }

    // Assign supervisors
    console.log(`\n👷 Assigning ${targetSupervisors} supervisors...`)
    for (let i = 0; i < targetSupervisors && roleIndex < shuffledStaff.length; i++, roleIndex++) {
      const staff = shuffledStaff[roleIndex]
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'supervisor' })
        .eq('id', staff.id)

      if (updateError) {
        console.error(`❌ Failed to update ${staff.full_name}:`, updateError.message)
        results.errors.push(`${staff.full_name}: ${updateError.message}`)
      } else {
        console.log(`✅ ${staff.full_name} → supervisor`)
        results.supervisor++
      }
    }

    // Assign remaining as talent escorts
    console.log(`\n🚶 Assigning remaining ${shuffledStaff.length - roleIndex} as talent escorts...`)
    for (let i = roleIndex; i < shuffledStaff.length; i++) {
      const staff = shuffledStaff[i]
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'talent_escort' })
        .eq('id', staff.id)

      if (updateError) {
        console.error(`❌ Failed to update ${staff.full_name}:`, updateError.message)
        results.errors.push(`${staff.full_name}: ${updateError.message}`)
      } else {
        console.log(`✅ ${staff.full_name} → talent_escort`)
        results.talent_escort++
      }
    }

    // Final verification
    console.log('\n🔍 Verifying role distribution...')
    const { data: updatedStaff, error: verifyError } = await supabase
      .from('profiles')
      .select('role')

    if (verifyError) {
      console.error('❌ Failed to verify roles:', verifyError.message)
    } else {
      const roleCounts = updatedStaff.reduce((counts, staff) => {
        counts[staff.role] = (counts[staff.role] || 0) + 1
        return counts
      }, {})

      console.log('\n📊 FINAL ROLE DISTRIBUTION:')
      console.log('============================')
      console.log(`👑 Admin: ${roleCounts.admin || 0}`)
      console.log(`📋 Coordinator: ${roleCounts.coordinator || 0}`)
      console.log(`👷 Supervisor: ${roleCounts.supervisor || 0}`)
      console.log(`🚶 Talent Escort: ${roleCounts.talent_escort || 0}`)
      console.log(`❓ Other/Null: ${(roleCounts.in_house || 0) + (roleCounts[null] || 0)}`)
      console.log(`📊 Total: ${updatedStaff.length}`)

      if (results.errors.length > 0) {
        console.log(`\n❌ Errors (${results.errors.length}):`)
        results.errors.forEach(error => console.log(`   ${error}`))
      }

      // Save results to file
      const resultsPath = path.join(__dirname, '..', 'role-update-results.json')
      fs.writeFileSync(resultsPath, JSON.stringify({
        ...results,
        finalDistribution: roleCounts,
        timestamp: new Date().toISOString(),
        totalStaff: updatedStaff.length
      }, null, 2))

      console.log(`\n💾 Results saved to: role-update-results.json`)

      if (results.errors.length === 0) {
        console.log('\n🎉 SUCCESS! All staff roles have been updated successfully!')
      } else {
        console.log(`\n⚠️  Completed with ${results.errors.length} errors. Check the details above.`)
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

updateStaffRoles().catch(console.error)