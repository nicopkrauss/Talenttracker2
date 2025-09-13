require('dotenv').config({ path: '.env.local' })
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testClearDayDatabaseOperations() {
  console.log('🧪 Testing Clear Day Database Operations with Daily Assignment Tables')
  
  let project, talent, escort
  
  try {
    // Create a test project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'Clear Day DB Test Project',
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

    console.log('✅ Created talent assignment with scheduled dates:', assignmentData.scheduled_dates)

    // Get an existing escort profile for testing
    const { data: escortData, error: escortError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('status', 'active')
      .limit(1)
      .single()

    if (escortError || !escortData) {
      console.error('❌ No active profiles found for testing')
      return
    }

    escort = escortData
    console.log('✅ Using existing escort for test:', escort.id)

    // Create daily assignments for multiple dates
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

    // Verify assignments exist
    const { data: beforeClear, error: beforeError } = await supabase
      .from('talent_daily_assignments')
      .select('assignment_date')
      .eq('project_id', project.id)
      .eq('talent_id', talent.id)
      .order('assignment_date')

    if (beforeError) {
      console.error('❌ Failed to fetch assignments before clear:', beforeError)
      return
    }

    console.log('📊 Assignments before clear:', beforeClear.map(a => a.assignment_date))

    // Test Clear Day database operation for 2024-01-16 only
    console.log('\n🧪 Testing Clear Day database operation for 2024-01-16...')
    
    const { error: clearError } = await supabase
      .from('talent_daily_assignments')
      .delete()
      .eq('project_id', project.id)
      .eq('assignment_date', '2024-01-16')

    if (clearError) {
      console.error('❌ Failed to clear daily assignments:', clearError)
      return
    }

    console.log('✅ Successfully cleared assignments for 2024-01-16')

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

    // Verify scheduled_dates was updated by trigger (wait a moment for trigger to execute)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const { data: updatedAssignment, error: updatedError } = await supabase
      .from('talent_project_assignments')
      .select('scheduled_dates')
      .eq('talent_id', talent.id)
      .eq('project_id', project.id)
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

    const { error: clearAllError } = await supabase
      .from('talent_daily_assignments')
      .delete()
      .eq('project_id', project.id)
      .eq('talent_id', talent.id)

    if (clearAllError) {
      console.error('❌ Failed to clear remaining assignments:', clearAllError)
      return
    }

    console.log('✅ Successfully cleared all remaining assignments')

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

    // Verify scheduled_dates is empty or null (wait for trigger)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const { data: finalAssignment, error: finalAssignmentError } = await supabase
      .from('talent_project_assignments')
      .select('scheduled_dates')
      .eq('talent_id', talent.id)
      .eq('project_id', project.id)
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

    // Test group assignments as well
    console.log('\n🧪 Testing group daily assignments...')
    
    // Create a test group
    const { data: groupData, error: groupError } = await supabase
      .from('talent_groups')
      .insert({
        project_id: project.id,
        group_name: 'Test Group',
        members: [talent.id],
        scheduled_dates: ['2024-01-20', '2024-01-21']
      })
      .select()
      .single()

    if (groupError) {
      console.error('❌ Failed to create test group:', groupError)
      return
    }

    console.log('✅ Created test group:', groupData.id)

    // Create group daily assignments
    const groupAssignments = [
      {
        group_id: groupData.id,
        project_id: project.id,
        assignment_date: '2024-01-20',
        escort_id: escort.id
      },
      {
        group_id: groupData.id,
        project_id: project.id,
        assignment_date: '2024-01-21',
        escort_id: escort.id
      }
    ]

    const { error: groupAssignmentError } = await supabase
      .from('group_daily_assignments')
      .insert(groupAssignments)

    if (groupAssignmentError) {
      console.error('❌ Failed to create group daily assignments:', groupAssignmentError)
      return
    }

    console.log('✅ Created group daily assignments for dates: 2024-01-20, 2024-01-21')

    // Clear one date from group assignments
    const { error: clearGroupError } = await supabase
      .from('group_daily_assignments')
      .delete()
      .eq('project_id', project.id)
      .eq('assignment_date', '2024-01-20')

    if (clearGroupError) {
      console.error('❌ Failed to clear group assignment:', clearGroupError)
      return
    }

    console.log('✅ Successfully cleared group assignment for 2024-01-20')

    // Verify group scheduled_dates was updated
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const { data: updatedGroup, error: updatedGroupError } = await supabase
      .from('talent_groups')
      .select('scheduled_dates')
      .eq('id', groupData.id)
      .single()

    if (updatedGroupError) {
      console.error('❌ Failed to fetch updated group:', updatedGroupError)
      return
    }

    console.log('📊 Updated group scheduled_dates:', updatedGroup.scheduled_dates)

    if (updatedGroup.scheduled_dates && updatedGroup.scheduled_dates.includes('2024-01-21') && !updatedGroup.scheduled_dates.includes('2024-01-20')) {
      console.log('✅ Group scheduled dates correctly updated by database trigger')
    } else {
      console.error('❌ Group scheduled dates not updated correctly by trigger')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  } finally {
    // Cleanup - delete test data
    console.log('\n🧹 Cleaning up test data...')
    
    try {
      // Delete in reverse order due to foreign key constraints
      await supabase.from('group_daily_assignments').delete().eq('project_id', project?.id)
      await supabase.from('talent_daily_assignments').delete().eq('project_id', project?.id)
      await supabase.from('talent_groups').delete().eq('project_id', project?.id)
      await supabase.from('talent_project_assignments').delete().eq('project_id', project?.id)
      await supabase.from('talent').delete().eq('first_name', 'Test').eq('last_name', 'Talent')
      await supabase.from('projects').delete().eq('name', 'Clear Day DB Test Project')
      
      console.log('✅ Test data cleaned up')
    } catch (cleanupError) {
      console.error('⚠️ Cleanup failed:', cleanupError)
    }
  }
}

// Run the test
testClearDayDatabaseOperations()
  .then(() => {
    console.log('\n🎉 Clear Day database operations test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })