#!/usr/bin/env node

/**
 * Test script to verify that removed escorts repopulate in the assignment menu
 * 
 * This script tests the fix for the issue where escorts don't repopulate in the 
 * assignment dropdown after being removed from a talent assignment.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testEscortRemovalFix() {
  console.log('🧪 Testing escort removal and repopulation fix...\n')

  try {
    // 1. Get a test project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date')
      .eq('status', 'active')
      .limit(1)

    if (projectError || !projects?.length) {
      console.error('❌ No active projects found for testing')
      return
    }

    const project = projects[0]
    console.log(`📋 Using project: ${project.name} (${project.id})`)

    // 2. Get project dates
    const startDate = new Date(project.start_date)
    const testDate = new Date(startDate)
    testDate.setDate(testDate.getDate() + 1) // Use second day of project
    const dateStr = testDate.toISOString().split('T')[0]
    
    console.log(`📅 Testing with date: ${dateStr}`)

    // 3. Get available escorts for this date
    console.log('\n🔍 Fetching available escorts...')
    const escortsResponse = await fetch(
      `http://localhost:3000/api/projects/${project.id}/available-escorts/${dateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    )

    if (!escortsResponse.ok) {
      console.error('❌ Failed to fetch available escorts:', escortsResponse.status)
      return
    }

    const escortsResult = await escortsResponse.json()
    const availableEscorts = escortsResult.data?.escorts || []
    
    console.log(`✅ Found ${availableEscorts.length} escorts`)
    availableEscorts.forEach(escort => {
      console.log(`   - ${escort.escortName} (${escort.section})`)
    })

    if (availableEscorts.length === 0) {
      console.log('⚠️  No escorts available for testing')
      return
    }

    // 4. Get talent assignments for this date
    console.log('\n🎭 Fetching talent assignments...')
    const assignmentsResponse = await fetch(
      `http://localhost:3000/api/projects/${project.id}/assignments/${dateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    )

    if (!assignmentsResponse.ok) {
      console.error('❌ Failed to fetch assignments:', assignmentsResponse.status)
      return
    }

    const assignmentsResult = await assignmentsResponse.json()
    const assignments = assignmentsResult.data?.assignments || []
    
    console.log(`✅ Found ${assignments.length} talent assignments`)

    if (assignments.length === 0) {
      console.log('⚠️  No talent assignments found for testing')
      return
    }

    // 5. Find a talent without an escort assignment and an available escort
    const unassignedTalent = assignments.find(t => !t.escortId)
    const availableEscort = availableEscorts.find(e => e.section === 'available')

    if (!unassignedTalent || !availableEscort) {
      console.log('⚠️  Need at least one unassigned talent and one available escort for testing')
      return
    }

    console.log(`\n🎯 Test scenario:`)
    console.log(`   Talent: ${unassignedTalent.talentName}`)
    console.log(`   Escort: ${availableEscort.escortName}`)

    // 6. Assign escort to talent
    console.log('\n📝 Step 1: Assigning escort to talent...')
    const assignResponse = await fetch(
      `http://localhost:3000/api/projects/${project.id}/assignments/${dateStr}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          talents: [{
            talentId: unassignedTalent.talentId,
            escortIds: [availableEscort.escortId]
          }],
          groups: []
        })
      }
    )

    if (!assignResponse.ok) {
      console.error('❌ Failed to assign escort:', assignResponse.status)
      return
    }

    console.log('✅ Escort assigned successfully')

    // 7. Verify escort is now marked as assigned
    console.log('\n🔍 Step 2: Verifying escort status after assignment...')
    const escortsAfterAssignResponse = await fetch(
      `http://localhost:3000/api/projects/${project.id}/available-escorts/${dateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    )

    const escortsAfterAssignResult = await escortsAfterAssignResponse.json()
    const escortsAfterAssign = escortsAfterAssignResult.data?.escorts || []
    
    const assignedEscort = escortsAfterAssign.find(e => e.escortId === availableEscort.escortId)
    
    if (assignedEscort?.section === 'current_day_assigned') {
      console.log('✅ Escort correctly marked as assigned')
    } else {
      console.log('❌ Escort not properly marked as assigned')
      console.log('   Expected section: current_day_assigned')
      console.log('   Actual section:', assignedEscort?.section)
    }

    // 8. Remove escort assignment
    console.log('\n🗑️  Step 3: Removing escort assignment...')
    const removeResponse = await fetch(
      `http://localhost:3000/api/projects/${project.id}/assignments/${dateStr}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          talents: [{
            talentId: unassignedTalent.talentId,
            escortIds: [] // Empty array removes assignment
          }],
          groups: []
        })
      }
    )

    if (!removeResponse.ok) {
      console.error('❌ Failed to remove escort assignment:', removeResponse.status)
      return
    }

    console.log('✅ Escort assignment removed successfully')

    // 9. Verify escort is back in available section
    console.log('\n🔍 Step 4: Verifying escort repopulates in available section...')
    const escortsAfterRemovalResponse = await fetch(
      `http://localhost:3000/api/projects/${project.id}/available-escorts/${dateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    )

    const escortsAfterRemovalResult = await escortsAfterRemovalResponse.json()
    const escortsAfterRemoval = escortsAfterRemovalResult.data?.escorts || []
    
    const removedEscort = escortsAfterRemoval.find(e => e.escortId === availableEscort.escortId)
    
    if (removedEscort?.section === 'available') {
      console.log('✅ SUCCESS: Escort correctly repopulated in available section!')
      console.log('   The fix is working properly.')
    } else {
      console.log('❌ FAILURE: Escort not properly returned to available section')
      console.log('   Expected section: available')
      console.log('   Actual section:', removedEscort?.section)
      console.log('   This indicates the fix may not be working correctly.')
    }

    console.log('\n📊 Final escort status:')
    escortsAfterRemoval.forEach(escort => {
      const status = escort.escortId === availableEscort.escortId ? ' ← TEST ESCORT' : ''
      console.log(`   - ${escort.escortName} (${escort.section})${status}`)
    })

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Run the test
testEscortRemovalFix()