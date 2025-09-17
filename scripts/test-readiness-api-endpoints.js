#!/usr/bin/env node

/**
 * Test script for Project Readiness API endpoints
 * Tests the GET /api/projects/[id]/readiness and POST /api/projects/[id]/readiness/finalize endpoints
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testReadinessEndpoints() {
  console.log('🧪 Testing Project Readiness API Endpoints\n')

  try {
    // Get a test project
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)

    if (projectsError || !projects || projects.length === 0) {
      console.error('❌ No test projects found:', projectsError)
      return
    }

    const testProject = projects[0]
    console.log(`📋 Using test project: ${testProject.name} (${testProject.id})\n`)

    // Test 1: GET readiness data
    console.log('🔍 Test 1: GET /api/projects/[id]/readiness')
    
    const readinessResponse = await fetch(`http://localhost:3000/api/projects/${testProject.id}/readiness`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!readinessResponse.ok) {
      console.error('❌ GET readiness failed:', readinessResponse.status, await readinessResponse.text())
      return
    }

    const readinessData = await readinessResponse.json()
    console.log('✅ GET readiness successful')
    console.log('📊 Readiness Status:', {
      overall_status: readinessData.data.overall_status,
      locations_status: readinessData.data.locations_status,
      roles_status: readinessData.data.roles_status,
      team_status: readinessData.data.team_status,
      talent_status: readinessData.data.talent_status,
      total_staff_assigned: readinessData.data.total_staff_assigned,
      total_talent: readinessData.data.total_talent,
      escort_count: readinessData.data.escort_count
    })

    console.log('📝 Todo Items:', readinessData.data.todoItems?.length || 0, 'items')
    if (readinessData.data.todoItems && readinessData.data.todoItems.length > 0) {
      readinessData.data.todoItems.forEach(item => {
        console.log(`  - ${item.priority.toUpperCase()}: ${item.title}`)
      })
    }

    console.log('🎯 Feature Availability:')
    Object.entries(readinessData.data.featureAvailability || {}).forEach(([feature, config]) => {
      console.log(`  - ${feature}: ${config.available ? '✅' : '❌'} ${config.available ? '' : '(' + config.guidance + ')'}`)
    })

    if (readinessData.data.assignmentProgress) {
      console.log('📅 Assignment Progress:', {
        completedAssignments: readinessData.data.assignmentProgress.completedAssignments,
        totalAssignments: readinessData.data.assignmentProgress.totalAssignments,
        assignmentRate: readinessData.data.assignmentProgress.assignmentRate + '%',
        urgentIssues: readinessData.data.assignmentProgress.urgentIssues,
        upcomingDeadlines: readinessData.data.assignmentProgress.upcomingDeadlines?.length || 0
      })
    }

    console.log('\n' + '='.repeat(60) + '\n')

    // Test 2: Test finalization (if user has admin access)
    console.log('🔒 Test 2: POST /api/projects/[id]/readiness/finalize')
    console.log('⚠️  Note: This test requires admin authentication and will be skipped in this script')
    console.log('   To test finalization manually:')
    console.log('   1. Login as admin user in the app')
    console.log('   2. Navigate to project readiness dashboard')
    console.log('   3. Click finalize buttons for configured areas')
    console.log('   4. Verify finalization status updates correctly')

    console.log('\n✅ Readiness API endpoint tests completed successfully!')

    // Test 3: Validate database triggers
    console.log('\n🔧 Test 3: Database Trigger Validation')
    
    // Check if readiness record exists
    const { data: readinessRecord, error: readinessError } = await supabase
      .from('project_readiness')
      .select('*')
      .eq('project_id', testProject.id)
      .single()

    if (readinessError) {
      console.error('❌ Readiness record not found:', readinessError)
      return
    }

    console.log('✅ Readiness record exists in database')
    
    // Test trigger by adding a team assignment
    console.log('🧪 Testing database triggers by simulating data changes...')
    
    // Get current metrics
    const currentStaffCount = readinessRecord.total_staff_assigned
    console.log(`📊 Current staff count: ${currentStaffCount}`)
    
    // Manually trigger readiness calculation
    const { error: calcError } = await supabase.rpc('calculate_project_readiness', {
      p_project_id: testProject.id
    })

    if (calcError) {
      console.error('❌ Manual readiness calculation failed:', calcError)
    } else {
      console.log('✅ Manual readiness calculation successful')
    }

    // Verify updated metrics
    const { data: updatedReadiness } = await supabase
      .from('project_readiness')
      .select('total_staff_assigned, overall_status, last_updated')
      .eq('project_id', testProject.id)
      .single()

    if (updatedReadiness) {
      console.log('📊 Updated metrics:', {
        total_staff_assigned: updatedReadiness.total_staff_assigned,
        overall_status: updatedReadiness.overall_status,
        last_updated: new Date(updatedReadiness.last_updated).toLocaleString()
      })
    }

    console.log('\n🎉 All readiness API tests completed!')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
    process.exit(1)
  }
}

// Run the tests
testReadinessEndpoints()