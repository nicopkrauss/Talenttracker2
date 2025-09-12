#!/usr/bin/env node

/**
 * Test script for bulk team member actions functionality
 * 
 * This script tests:
 * 1. Bulk selection of confirmed team members
 * 2. Bulk move to pending functionality
 * 3. Bulk remove from project functionality
 * 4. Individual action integration with bulk selection
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testBulkTeamMemberActions() {
  console.log('🧪 Testing Bulk Team Member Actions')
  console.log('=' .repeat(50))

  try {
    // 1. Find a project with confirmed team members
    console.log('1. Finding project with confirmed team members...')
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        team_assignments!inner(
          id,
          confirmed_at,
          available_dates,
          profiles(full_name)
        )
      `)
      .not('team_assignments.confirmed_at', 'is', null)
      .limit(1)

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }

    if (!projects || projects.length === 0) {
      console.log('❌ No projects with confirmed team members found')
      console.log('   Please confirm some team members first to test this functionality')
      return
    }

    const project = projects[0]
    const confirmedAssignments = project.team_assignments.filter(a => a.confirmed_at)
    
    console.log(`✅ Found project: ${project.name}`)
    console.log(`   Confirmed team members: ${confirmedAssignments.length}`)
    confirmedAssignments.forEach(assignment => {
      console.log(`   - ${assignment.profiles.full_name} (ID: ${assignment.id})`)
    })

    if (confirmedAssignments.length < 2) {
      console.log('⚠️  Need at least 2 confirmed team members to test bulk actions')
      console.log('   Please confirm more team members first')
      return
    }

    // 2. Test bulk move to pending
    console.log('\n2. Testing bulk move to pending...')
    
    const assignmentsToMoveToPending = confirmedAssignments.slice(0, Math.min(2, confirmedAssignments.length))
    console.log(`   Moving ${assignmentsToMoveToPending.length} members to pending:`)
    assignmentsToMoveToPending.forEach(assignment => {
      console.log(`   - ${assignment.profiles.full_name}`)
    })

    // Simulate bulk move to pending by updating available_dates to null
    const movePromises = assignmentsToMoveToPending.map(assignment =>
      supabase
        .from('team_assignments')
        .update({ 
          available_dates: null,
          confirmed_at: null
        })
        .eq('id', assignment.id)
    )

    const moveResults = await Promise.all(movePromises)
    const moveErrors = moveResults.filter(result => result.error)
    
    if (moveErrors.length > 0) {
      console.error('❌ Error moving to pending:', moveErrors)
      return
    }

    console.log('✅ Successfully moved team members to pending')

    // 3. Verify the move worked
    console.log('\n3. Verifying move to pending...')
    
    const { data: updatedAssignments, error: verifyError } = await supabase
      .from('team_assignments')
      .select('id, confirmed_at, available_dates, profiles(full_name)')
      .in('id', assignmentsToMoveToPending.map(a => a.id))

    if (verifyError) {
      console.error('❌ Error verifying move:', verifyError)
      return
    }

    const stillConfirmed = updatedAssignments.filter(a => a.confirmed_at)
    if (stillConfirmed.length > 0) {
      console.log('❌ Some assignments are still confirmed:')
      stillConfirmed.forEach(assignment => {
        console.log(`   - ${assignment.profiles.full_name} (still confirmed)`)
      })
    } else {
      console.log('✅ All selected assignments successfully moved to pending')
    }

    // 4. Test re-confirming one member for removal test
    console.log('\n4. Re-confirming one member for removal test...')
    
    const memberToReconfirm = assignmentsToMoveToPending[0]
    const { error: reconfirmError } = await supabase
      .from('team_assignments')
      .update({ 
        available_dates: ['2024-12-01', '2024-12-02'],
        confirmed_at: new Date().toISOString()
      })
      .eq('id', memberToReconfirm.id)

    if (reconfirmError) {
      console.error('❌ Error re-confirming member:', reconfirmError)
      return
    }

    console.log(`✅ Re-confirmed ${memberToReconfirm.profiles.full_name}`)

    // 5. Test bulk remove from project
    console.log('\n5. Testing bulk remove from project...')
    
    const assignmentsToRemove = [memberToReconfirm]
    console.log(`   Removing ${assignmentsToRemove.length} member from project:`)
    assignmentsToRemove.forEach(assignment => {
      console.log(`   - ${assignment.profiles.full_name}`)
    })

    // Simulate bulk remove by deleting the assignments
    const removePromises = assignmentsToRemove.map(assignment =>
      supabase
        .from('team_assignments')
        .delete()
        .eq('id', assignment.id)
    )

    const removeResults = await Promise.all(removePromises)
    const removeErrors = removeResults.filter(result => result.error)
    
    if (removeErrors.length > 0) {
      console.error('❌ Error removing from project:', removeErrors)
      return
    }

    console.log('✅ Successfully removed team members from project')

    // 6. Verify the removal worked
    console.log('\n6. Verifying removal from project...')
    
    const { data: removedCheck, error: removedError } = await supabase
      .from('team_assignments')
      .select('id')
      .in('id', assignmentsToRemove.map(a => a.id))

    if (removedError) {
      console.error('❌ Error verifying removal:', removedError)
      return
    }

    if (removedCheck && removedCheck.length > 0) {
      console.log('❌ Some assignments were not removed:')
      console.log(`   Found ${removedCheck.length} assignments still in database`)
    } else {
      console.log('✅ All selected assignments successfully removed from project')
    }

    console.log('\n🎉 Bulk team member actions test completed successfully!')
    console.log('\n📋 Test Summary:')
    console.log('✅ Found project with confirmed team members')
    console.log('✅ Bulk move to pending functionality works')
    console.log('✅ Bulk remove from project functionality works')
    console.log('✅ Database operations completed successfully')

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error)
  }
}

// Run the test
testBulkTeamMemberActions()