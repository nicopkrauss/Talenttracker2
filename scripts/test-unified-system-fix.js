/**
 * Test Unified Scheduling System Fix
 * This script tests that all APIs are now using the unified daily assignment tables
 * instead of the old scheduled_dates columns that were removed.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUnifiedSystem() {
  console.log('🧪 Testing Unified Scheduling System Fix...\n')

  try {
    // Test 1: Verify scheduled_dates columns are removed
    console.log('1. Testing that scheduled_dates columns are removed...')
    
    try {
      await supabase
        .from('talent_project_assignments')
        .select('scheduled_dates')
        .limit(1)
      console.log('❌ ERROR: talent_project_assignments.scheduled_dates still exists!')
    } catch (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('✅ talent_project_assignments.scheduled_dates column removed')
      } else {
        console.log('❌ Unexpected error:', error.message)
      }
    }

    try {
      await supabase
        .from('talent_groups')
        .select('scheduled_dates')
        .limit(1)
      console.log('❌ ERROR: talent_groups.scheduled_dates still exists!')
    } catch (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('✅ talent_groups.scheduled_dates column removed')
      } else {
        console.log('❌ Unexpected error:', error.message)
      }
    }

    // Test 2: Verify daily assignment tables exist and work
    console.log('\n2. Testing daily assignment tables...')
    
    const { data: talentDailyAssignments, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select('*')
      .limit(1)

    if (talentError) {
      console.log('❌ talent_daily_assignments table error:', talentError.message)
    } else {
      console.log('✅ talent_daily_assignments table accessible')
    }

    const { data: groupDailyAssignments, error: groupError } = await supabase
      .from('group_daily_assignments')
      .select('*')
      .limit(1)

    if (groupError) {
      console.log('❌ group_daily_assignments table error:', groupError.message)
    } else {
      console.log('✅ group_daily_assignments table accessible')
    }

    // Test 3: Test API endpoints
    console.log('\n3. Testing API endpoints...')
    
    // Get a test project
    const { data: projects } = await supabase
      .from('projects')
      .select('id, start_date, end_date')
      .limit(1)

    if (!projects || projects.length === 0) {
      console.log('⚠️  No projects found for API testing')
      return
    }

    const project = projects[0]
    const testDate = project.start_date

    console.log(`Using project ${project.id} and date ${testDate}`)

    // Test assignments API
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${project.id}/assignments/${testDate}`)
      if (response.ok) {
        console.log('✅ Assignments API working')
      } else {
        const error = await response.text()
        console.log('❌ Assignments API error:', error)
      }
    } catch (error) {
      console.log('❌ Assignments API fetch error:', error.message)
    }

    // Test talent roster API
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${project.id}/talent-roster`)
      if (response.ok) {
        console.log('✅ Talent roster API working')
      } else {
        const error = await response.text()
        console.log('❌ Talent roster API error:', error)
      }
    } catch (error) {
      console.log('❌ Talent roster API fetch error:', error.message)
    }

    // Test talent groups API
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${project.id}/talent-groups`)
      if (response.ok) {
        console.log('✅ Talent groups API working')
      } else {
        const error = await response.text()
        console.log('❌ Talent groups API error:', error)
      }
    } catch (error) {
      console.log('❌ Talent groups API fetch error:', error.message)
    }

    // Test available escorts API
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${project.id}/available-escorts/${testDate}`)
      if (response.ok) {
        console.log('✅ Available escorts API working')
      } else {
        const error = await response.text()
        console.log('❌ Available escorts API error:', error)
      }
    } catch (error) {
      console.log('❌ Available escorts API fetch error:', error.message)
    }

    console.log('\n🎉 Unified system testing complete!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testUnifiedSystem()