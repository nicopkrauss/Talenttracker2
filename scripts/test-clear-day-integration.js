require('dotenv').config({ path: '.env.local' })
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testClearDayIntegration() {
  console.log('🧪 Testing Clear Day Integration with Daily Assignment Tables')
  
  let project, talent, escort, assignment
  
  try {
    // Create a test project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'Clear Day Test Project',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        status: 'active'
      })
      .select()
      .single()

    if (projectError) {
      console.error('❌ Failed to create test project:', projectError)
      return
    }

    project = projectData
    console.log('✅ Created test project:', project.id)

    // Create test talent
    const { data: talentData, error: talentError } = await supabase
      .from('talent')
      .insert({
        first_name: 'Test',
        last_name: 'Talent'
      })
      .select()
      .single()

    if (talentError) {
      console.error('❌ Failed to create test talent:', talentError)
      return
    }

    talent = talentData
    console.log('✅ Created test talent:', talent.id)

    // Create talent project assignment
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('talent_project_assignments')
      .insert({
        talent_id: talent.id,
        project_id: project.id,
        scheduled_dates: ['2024-01-15', '2024-01-16', '2024-01-17']
      })
      .select()
      .single()

    if (assignmentError) {
      console.error('❌ Failed to create talent assignment:', assignmentError)
      return
    }

    assignment = assignmentData
    console.log('✅ Created talent assignment with scheduled dates:', assignment.scheduled_dates)

    // Get an existing escort profile for testing
    const { data: escortData, error: escortError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('status', 'active')
      .limit(1)
      .single()

    if (escortError || !escortData) {
      console.error('❌ No active profiles found for testing. Creating a minimal test without escort assignment.')
      // Continue test without escort assignment
      escort = null
    } else {
      escort = escortData
      console.log('✅ Using existing escort for test:', escort.id)
    }

    // Create daily assignments for multiple dates (only if we have an escort)
    if (escort) {
      const dailyAssignments = [
        {
          talent_id: talent.id,
          project_id: project.id,
          assignment_date: '2024-01-15',
          escort_id: escort.id
        },
        {
          talent_id: talent.id,
          project_id: project.id,
          assignment_date: '2024-01-16',
          escort_id: escort.id
        },
        {
          talent_id: talent.id,
          project_id: project.id,
          assignment_date: '2024-01-17',
          escort_id: escort.id
        }
      ]

      const { error: dailyAssignmentError } = await supabase
        .from('talent_daily_assignments')
        .insert(dailyAssignments)

      if (dailyAssignmentError) {
        console.error('❌ Failed to create daily assignments:', dailyAssignmentError)
        return
      }

      console.log('✅ Created daily assignments for dates: 2024-01-15, 2024-01-16, 2024-01-17')
    } else {
      console.log('⚠️ Skipping daily assignment creation - no escort available')
    }

    // Verify assignments exist
    const { data: beforeClear, error: beforeError } = await supabase
      .from('talent_daily_assignments')
      .select('assignment_date')
      .eq('project_id', project.id)
      .eq('talent_id', talent.id)

    if (beforeError) {
      console.error('❌ Failed to fetch assignments before clear:', beforeError)
      return
    }

    console.log('📊 Assignments before clear:', beforeClear.map(a => a.assignment_date))

    // Test Clear Day API call for 2024-01-16 only
    const clearResponse = await fetch(`http://localhost:3000/api/projects/${project.id}/assignments/clear-day`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date: '2024-01-16' })
    })

    if (!clearResponse.ok) {
      const errorData = await clearResponse.json()
      console.error('❌ Clear Day API failed:', errorData)
      return
    }

    const clearData = await clearResponse.json()
    console.log('✅ Clear Day API response:', clearData.data.message)

    // Verify only 2024-01-16 was cleared
    const { data: afterClear, error: afterError } = await supabase
      .from('talent_daily_assignments')
      .select('assignment_date')
      .eq('project_id', project.id)
      .eq('talent_id', talent.id)
      .order('assignment_date')

    if (afterError) {
      console.error('❌ Failed to fetch assignments after clear:', afterError)
      return
    }

    console.log('📊 Assignments after clear:', afterClear.map(a => a.assignment_date))

    // Verify scheduled_dates was updated by trigger
    const { data: updatedAssignment, error: updatedError } = await supabase
      .from('talent_project_assignments')
      .select('scheduled_dates')
      .eq('id', assignment.id)
      .single()

    if (updatedError) {
      console.error('❌ Failed to fetch updated assignment:', updatedError)
      return
    }

    console.log('📊 Updated scheduled_dates:', updatedAssignment.scheduled_dates)

    // Validate results
    const expectedDates = ['2024-01-15', '2024-01-17']
    const actualDates = afterClear.map(a => a.assignment_date).sort()
    const scheduledDates = updatedAssignment.scheduled_dates?.sort()

    if (JSON.stringify(actualDates) === JSON.stringify(expectedDates)) {
      console.log('✅ Daily assignments correctly cleared for specific date only')
    } else {
      console.error('❌ Daily assignments not cleared correctly')
      console.error('Expected:', expectedDates)
      console.error('Actual:', actualDates)
    }

    if (JSON.stringify(scheduledDates) === JSON.stringify(expectedDates)) {
      console.log('✅ Scheduled dates correctly updated by database trigger')
    } else {
      console.error('❌ Scheduled dates not updated correctly by trigger')
      console.error('Expected:', expectedDates)
      console.error('Actual:', scheduledDates)
    }

    // Test clearing all remaining assignments
    console.log('\n🧪 Testing clearing all remaining assignments...')

    const clearAllResponse1 = await fetch(`http://localhost:3000/api/projects/${project.id}/assignments/clear-day`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date: '2024-01-15' })
    })

    const clearAllResponse2 = await fetch(`http://localhost:3000/api/projects/${project.id}/assignments/clear-day`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date: '2024-01-17' })
    })

    if (!clearAllResponse1.ok || !clearAllResponse2.ok) {
      console.error('❌ Failed to clear remaining assignments')
      return
    }

    // Verify all assignments are cleared
    const { data: finalCheck, error: finalError } = await supabase
      .from('talent_daily_assignments')
      .select('assignment_date')
      .eq('project_id', project.id)
      .eq('talent_id', talent.id)

    if (finalError) {
      console.error('❌ Failed to fetch final assignments:', finalError)
      return
    }

    console.log('📊 Final assignments count:', finalCheck.length)

    if (finalCheck.length === 0) {
      console.log('✅ All daily assignments successfully cleared')
    } else {
      console.error('❌ Some assignments still remain:', finalCheck)
    }

    // Verify scheduled_dates is empty or null
    const { data: finalAssignment, error: finalAssignmentError } = await supabase
      .from('talent_project_assignments')
      .select('scheduled_dates')
      .eq('id', assignment.id)
      .single()

    if (finalAssignmentError) {
      console.error('❌ Failed to fetch final assignment:', finalAssignmentError)
      return
    }

    console.log('📊 Final scheduled_dates:', finalAssignment.scheduled_dates)

    if (!finalAssignment.scheduled_dates || finalAssignment.scheduled_dates.length === 0) {
      console.log('✅ Scheduled dates correctly cleared by database trigger')
    } else {
      console.error('❌ Scheduled dates not cleared correctly')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  } finally {
    // Cleanup - delete test data
    console.log('\n🧹 Cleaning up test data...')
    
    try {
      // Delete in reverse order due to foreign key constraints
      await supabase.from('talent_daily_assignments').delete().eq('project_id', project?.id)
      await supabase.from('talent_project_assignments').delete().eq('project_id', project?.id)
      // Skip deleting escort profile since we used an existing one
      await supabase.from('talent').delete().eq('first_name', 'Test').eq('last_name', 'Talent')
      await supabase.from('projects').delete().eq('name', 'Clear Day Test Project')
      
      console.log('✅ Test data cleaned up')
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError)
    }
  }
}

// Run the test
testClearDayIntegration()
  .then(() => {
    console.log('\n🎉 Clear Day integration test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })