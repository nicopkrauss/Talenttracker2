#!/usr/bin/env node

/**
 * Test script for Project Readiness database functions and calculations
 * Tests the database triggers and readiness calculation logic
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testReadinessDatabase() {
  console.log('🧪 Testing Project Readiness Database Functions\n')

  try {
    // Get a test project
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date')
      .limit(1)

    if (projectsError || !projects || projects.length === 0) {
      console.error('❌ No test projects found:', projectsError)
      return
    }

    const testProject = projects[0]
    console.log(`📋 Using test project: ${testProject.name} (${testProject.id})`)
    console.log(`📅 Project dates: ${testProject.start_date} to ${testProject.end_date}\n`)

    // Test 1: Check if readiness record exists
    console.log('🔍 Test 1: Checking readiness record existence')
    
    const { data: readinessRecord, error: readinessError } = await supabase
      .from('project_readiness')
      .select('*')
      .eq('project_id', testProject.id)
      .single()

    if (readinessError) {
      if (readinessError.code === 'PGRST116') {
        console.log('⚠️  No readiness record found, creating one...')
        
        const { data: newRecord, error: createError } = await supabase
          .from('project_readiness')
          .insert({ project_id: testProject.id })
          .select('*')
          .single()

        if (createError) {
          console.error('❌ Failed to create readiness record:', createError)
          return
        }
        
        console.log('✅ Created new readiness record')
        readinessRecord = newRecord
      } else {
        console.error('❌ Error fetching readiness record:', readinessError)
        return
      }
    } else {
      console.log('✅ Readiness record exists')
    }

    console.log('📊 Current readiness status:', {
      overall_status: readinessRecord.overall_status,
      locations_status: readinessRecord.locations_status,
      roles_status: readinessRecord.roles_status,
      team_status: readinessRecord.team_status,
      talent_status: readinessRecord.talent_status,
      total_staff_assigned: readinessRecord.total_staff_assigned,
      total_talent: readinessRecord.total_talent,
      escort_count: readinessRecord.escort_count,
      supervisor_count: readinessRecord.supervisor_count,
      coordinator_count: readinessRecord.coordinator_count
    })

    console.log('\n' + '='.repeat(60) + '\n')

    // Test 2: Test readiness calculation function
    console.log('🔧 Test 2: Testing readiness calculation function')
    
    const { error: calcError } = await supabase.rpc('calculate_project_readiness', {
      p_project_id: testProject.id
    })

    if (calcError) {
      console.error('❌ Readiness calculation failed:', calcError)
      return
    }

    console.log('✅ Readiness calculation successful')

    // Get updated readiness data
    const { data: updatedReadiness, error: updatedError } = await supabase
      .from('project_readiness')
      .select('*')
      .eq('project_id', testProject.id)
      .single()

    if (updatedError) {
      console.error('❌ Failed to fetch updated readiness:', updatedError)
      return
    }

    console.log('📊 Updated readiness status:', {
      overall_status: updatedReadiness.overall_status,
      locations_status: updatedReadiness.locations_status,
      roles_status: updatedReadiness.roles_status,
      team_status: updatedReadiness.team_status,
      talent_status: updatedReadiness.talent_status,
      total_staff_assigned: updatedReadiness.total_staff_assigned,
      total_talent: updatedReadiness.total_talent,
      escort_count: updatedReadiness.escort_count,
      last_updated: new Date(updatedReadiness.last_updated).toLocaleString()
    })

    console.log('\n' + '='.repeat(60) + '\n')

    // Test 3: Test assignment progress calculation
    console.log('📅 Test 3: Testing assignment progress calculation')

    // Get talent assignments
    const { data: talentAssignments, error: talentError } = await supabase
      .from('talent_project_assignments')
      .select('talent_id')
      .eq('project_id', testProject.id)

    if (talentError) {
      console.error('❌ Failed to fetch talent assignments:', talentError)
      return
    }

    console.log(`👥 Found ${talentAssignments?.length || 0} talent assignments`)

    // Get talent groups
    const { data: talentGroups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('id, group_name')
      .eq('project_id', testProject.id)

    if (groupsError) {
      console.error('❌ Failed to fetch talent groups:', groupsError)
      return
    }

    console.log(`👥 Found ${talentGroups?.length || 0} talent groups`)

    // Calculate project duration
    const startDate = new Date(testProject.start_date)
    const endDate = new Date(testProject.end_date)
    const projectDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    console.log(`📅 Project duration: ${projectDays} days`)

    const totalEntities = (talentAssignments?.length || 0) + (talentGroups?.length || 0)
    const totalPossibleAssignments = totalEntities * projectDays

    console.log(`🎯 Total possible assignments: ${totalPossibleAssignments} (${totalEntities} entities × ${projectDays} days)`)

    // Get current assignment counts
    const { data: talentDailyAssignments, error: talentDailyError } = await supabase
      .from('talent_daily_assignments')
      .select('id', { count: 'exact' })
      .eq('project_id', testProject.id)
      .not('escort_id', 'is', null)

    const { data: groupDailyAssignments, error: groupDailyError } = await supabase
      .from('group_daily_assignments')
      .select('id', { count: 'exact' })
      .eq('project_id', testProject.id)
      .not('escort_id', 'is', null)

    if (talentDailyError || groupDailyError) {
      console.error('❌ Failed to fetch daily assignments:', talentDailyError || groupDailyError)
      return
    }

    const completedAssignments = (talentDailyAssignments?.length || 0) + (groupDailyAssignments?.length || 0)
    const assignmentRate = totalPossibleAssignments > 0 ? Math.round((completedAssignments / totalPossibleAssignments) * 100) : 0

    console.log(`✅ Completed assignments: ${completedAssignments}`)
    console.log(`📊 Assignment completion rate: ${assignmentRate}%`)

    console.log('\n' + '='.repeat(60) + '\n')

    // Test 4: Test feature availability logic
    console.log('🎯 Test 4: Testing feature availability logic')

    const featureAvailability = {
      timeTracking: {
        available: updatedReadiness.total_staff_assigned > 0,
        requirement: 'At least one staff member assigned'
      },
      assignments: {
        available: updatedReadiness.total_talent > 0 && updatedReadiness.escort_count > 0,
        requirement: 'Both talent and escorts assigned'
      },
      locationTracking: {
        available: updatedReadiness.locations_status !== 'default-only' && updatedReadiness.assignments_status !== 'none',
        requirement: 'Custom locations and assignments configured'
      },
      supervisorCheckout: {
        available: updatedReadiness.supervisor_count > 0 && updatedReadiness.escort_count > 0,
        requirement: 'Supervisor and escorts assigned'
      },
      projectOperations: {
        available: updatedReadiness.overall_status === 'operational' || updatedReadiness.overall_status === 'production-ready',
        requirement: 'Project must be operational'
      }
    }

    console.log('🎯 Feature Availability:')
    Object.entries(featureAvailability).forEach(([feature, config]) => {
      const status = config.available ? '✅ Available' : '❌ Not Available'
      console.log(`  - ${feature}: ${status}`)
      console.log(`    Requirement: ${config.requirement}`)
    })

    console.log('\n' + '='.repeat(60) + '\n')

    // Test 5: Test todo items generation logic
    console.log('📝 Test 5: Testing todo items generation')

    const todoItems = []

    // Critical items
    if (updatedReadiness.total_staff_assigned === 0) {
      todoItems.push({ priority: 'critical', title: 'Assign team members' })
    }
    if (updatedReadiness.total_talent === 0) {
      todoItems.push({ priority: 'critical', title: 'Add talent to roster' })
    }
    if (updatedReadiness.escort_count === 0 && updatedReadiness.total_talent > 0) {
      todoItems.push({ priority: 'critical', title: 'Assign talent escorts' })
    }

    // Important items
    if (updatedReadiness.roles_status === 'default-only') {
      todoItems.push({ priority: 'important', title: 'Configure custom roles' })
    }
    if (updatedReadiness.locations_status === 'default-only') {
      todoItems.push({ priority: 'important', title: 'Add custom locations' })
    }
    if (updatedReadiness.supervisor_count === 0 && updatedReadiness.total_staff_assigned > 0) {
      todoItems.push({ priority: 'important', title: 'Assign a supervisor' })
    }

    // Optional items
    if (!updatedReadiness.roles_finalized && updatedReadiness.roles_status !== 'default-only') {
      todoItems.push({ priority: 'optional', title: 'Finalize role configuration' })
    }
    if (!updatedReadiness.locations_finalized && updatedReadiness.locations_status !== 'default-only') {
      todoItems.push({ priority: 'optional', title: 'Finalize location setup' })
    }

    console.log(`📝 Generated ${todoItems.length} todo items:`)
    todoItems.forEach(item => {
      console.log(`  - ${item.priority.toUpperCase()}: ${item.title}`)
    })

    console.log('\n🎉 All database function tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
    process.exit(1)
  }
}

// Run the tests
testReadinessDatabase()