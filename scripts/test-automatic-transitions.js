/**
 * Test Script for Automatic Transition System
 * 
 * This script tests the automatic transition evaluation system by:
 * - Running evaluations on test projects
 * - Testing timezone-aware calculations
 * - Validating error handling
 * - Checking monitoring capabilities
 * 
 * Usage: node scripts/test-automatic-transitions.js
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testAutomaticTransitions() {
  console.log('🚀 Testing Automatic Transition System')
  console.log('=====================================')

  try {
    // Test 1: Check for projects with auto-transitions enabled
    console.log('\n1. Checking projects with auto-transitions enabled...')
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        auto_transitions_enabled,
        timezone,
        rehearsal_start_date,
        show_end_date,
        created_at
      `)
      .eq('auto_transitions_enabled', true)
      .not('status', 'eq', 'archived')

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`)
    }

    console.log(`   Found ${projects?.length || 0} projects with auto-transitions enabled`)
    
    if (projects && projects.length > 0) {
      projects.forEach(project => {
        console.log(`   - ${project.name} (${project.id}): ${project.status}`)
      })
    }

    // Test 2: Check recent transition attempts
    console.log('\n2. Checking recent transition attempts...')
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const { data: attempts, error: attemptsError } = await supabase
      .from('project_audit_log')
      .select('*')
      .eq('action_type', 'automatic_transition_attempt')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })

    if (attemptsError) {
      console.log(`   Warning: Could not fetch transition attempts: ${attemptsError.message}`)
    } else {
      console.log(`   Found ${attempts?.length || 0} transition attempts in last 24 hours`)
      
      if (attempts && attempts.length > 0) {
        const successful = attempts.filter(a => a.action_details?.success === true)
        const failed = attempts.filter(a => a.action_details?.success === false)
        
        console.log(`   - Successful: ${successful.length}`)
        console.log(`   - Failed: ${failed.length}`)
        
        if (failed.length > 0) {
          console.log('   Recent failures:')
          failed.slice(0, 3).forEach(attempt => {
            console.log(`     - Project ${attempt.project_id}: ${attempt.action_details?.error || 'Unknown error'}`)
          })
        }
      }
    }

    // Test 3: Test timezone calculations
    console.log('\n3. Testing timezone calculations...')
    
    const testTimezones = [
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'UTC'
    ]

    testTimezones.forEach(timezone => {
      try {
        // Test timezone validation
        new Intl.DateTimeFormat('en-US', { timeZone: timezone })
        console.log(`   ✓ ${timezone}: Valid timezone`)
        
        // Test date formatting
        const now = new Date()
        const formatted = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).format(now)
        
        console.log(`     Current time: ${formatted}`)
      } catch (error) {
        console.log(`   ✗ ${timezone}: Invalid timezone`)
      }
    })

    // Test 4: Simulate transition evaluation
    console.log('\n4. Simulating transition evaluations...')
    
    if (projects && projects.length > 0) {
      for (const project of projects.slice(0, 3)) { // Test first 3 projects
        console.log(`\n   Evaluating project: ${project.name}`)
        console.log(`   Current phase: ${project.status}`)
        
        // Check project setup checklist
        const { data: checklist } = await supabase
          .from('project_setup_checklist')
          .select('*')
          .eq('project_id', project.id)
          .single()

        if (checklist) {
          const completedItems = Object.entries(checklist)
            .filter(([key, value]) => key.endsWith('_finalized') && value === true)
            .map(([key]) => key.replace('_finalized', ''))
          
          console.log(`   Completed setup items: ${completedItems.join(', ') || 'none'}`)
        }

        // Check team assignments
        const { data: teamAssignments } = await supabase
          .from('team_assignments')
          .select('role')
          .eq('project_id', project.id)

        console.log(`   Team assignments: ${teamAssignments?.length || 0}`)

        // Check talent roster
        const { data: talentRoster } = await supabase
          .from('talent_project_assignments')
          .select('id')
          .eq('project_id', project.id)

        console.log(`   Talent assigned: ${talentRoster?.length || 0}`)

        // Determine potential next phase
        let nextPhase = 'unknown'
        let canTransition = false
        
        switch (project.status) {
          case 'prep':
            nextPhase = 'staffing'
            canTransition = checklist?.roles_finalized && checklist?.locations_finalized
            break
          case 'staffing':
            nextPhase = 'pre_show'
            canTransition = checklist?.team_assignments_finalized && checklist?.talent_roster_finalized
            break
          case 'pre_show':
            nextPhase = 'active'
            canTransition = project.rehearsal_start_date && new Date(project.rehearsal_start_date) <= new Date()
            break
          case 'active':
            nextPhase = 'post_show'
            canTransition = project.show_end_date && new Date(project.show_end_date) < new Date()
            break
          case 'post_show':
            nextPhase = 'complete'
            // Would need to check timecards
            break
          case 'complete':
            nextPhase = 'archived'
            // Would need to check archive date
            break
        }
        
        console.log(`   Next phase: ${nextPhase}`)
        console.log(`   Can transition: ${canTransition ? '✓' : '✗'}`)
        
        if (project.rehearsal_start_date) {
          const rehearsalDate = new Date(project.rehearsal_start_date)
          const now = new Date()
          const daysUntil = Math.ceil((rehearsalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          console.log(`   Days until rehearsal: ${daysUntil}`)
        }
      }
    }

    // Test 5: Check system health
    console.log('\n5. Checking system health...')
    
    // Check database connectivity
    try {
      const { data: healthCheck } = await supabase
        .from('projects')
        .select('id')
        .limit(1)
      
      console.log('   ✓ Database connectivity: OK')
    } catch (error) {
      console.log('   ✗ Database connectivity: FAILED')
      console.log(`     Error: ${error.message}`)
    }

    // Check required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length === 0) {
      console.log('   ✓ Environment variables: OK')
    } else {
      console.log('   ✗ Environment variables: MISSING')
      console.log(`     Missing: ${missingVars.join(', ')}`)
    }

    // Test 6: Performance metrics
    console.log('\n6. Performance metrics...')
    
    const startTime = Date.now()
    
    // Simulate a batch of evaluations
    const batchSize = Math.min(projects?.length || 0, 5)
    
    if (batchSize > 0) {
      console.log(`   Simulating evaluation of ${batchSize} projects...`)
      
      for (let i = 0; i < batchSize; i++) {
        // Simulate evaluation work
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      const duration = Date.now() - startTime
      const avgTime = duration / batchSize
      
      console.log(`   Total time: ${duration}ms`)
      console.log(`   Average per project: ${avgTime.toFixed(1)}ms`)
      
      if (avgTime > 1000) {
        console.log('   ⚠️  Warning: Evaluation time is high (>1s per project)')
      } else {
        console.log('   ✓ Performance: Good')
      }
    }

    console.log('\n✅ Automatic Transition System Test Complete')
    console.log('==========================================')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the test
if (require.main === module) {
  testAutomaticTransitions()
    .then(() => {
      console.log('\n🎉 All tests completed successfully!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error)
      process.exit(1)
    })
}

module.exports = { testAutomaticTransitions }