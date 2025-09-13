/**
 * Test script for assignment API endpoints
 * Run with: node scripts/test-assignment-api.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAssignmentAPI() {
  try {
    console.log('🧪 Testing Assignment API Endpoints...\n')

    // Test 1: Check if talent_project_assignments table exists and has correct columns
    console.log('1. Testing talent_project_assignments table structure...')
    const { data: talentAssignments, error: talentError } = await supabase
      .from('talent_project_assignments')
      .select('id, talent_id, project_id, escort_id, scheduled_dates')
      .limit(1)

    if (talentError) {
      console.error('❌ talent_project_assignments query failed:', talentError.message)
    } else {
      console.log('✅ talent_project_assignments table accessible')
      if (talentAssignments && talentAssignments.length > 0) {
        console.log('   Sample columns:', Object.keys(talentAssignments[0]))
      }
    }

    // Test 2: Check if talent_groups table exists and has correct columns
    console.log('\n2. Testing talent_groups table structure...')
    const { data: talentGroups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('id, project_id, group_name, assigned_escort_id, scheduled_dates')
      .limit(1)

    if (groupsError) {
      console.error('❌ talent_groups query failed:', groupsError.message)
    } else {
      console.log('✅ talent_groups table accessible')
      if (talentGroups && talentGroups.length > 0) {
        console.log('   Sample columns:', Object.keys(talentGroups[0]))
      }
    }

    // Test 3: Check if team_assignments table exists for escort availability
    console.log('\n3. Testing team_assignments table structure...')
    const { data: teamAssignments, error: teamError } = await supabase
      .from('team_assignments')
      .select('id, user_id, project_id, role, available_dates')
      .limit(1)

    if (teamError) {
      console.error('❌ team_assignments query failed:', teamError.message)
    } else {
      console.log('✅ team_assignments table accessible')
      if (teamAssignments && teamAssignments.length > 0) {
        console.log('   Sample columns:', Object.keys(teamAssignments[0]))
      }
    }

    // Test 4: Check if we can join with profiles table
    console.log('\n4. Testing profiles table joins...')
    const { data: profileJoin, error: profileError } = await supabase
      .from('team_assignments')
      .select(`
        id,
        user_id,
        profiles:user_id (
          id,
          full_name
        )
      `)
      .limit(1)

    if (profileError) {
      console.error('❌ profiles join failed:', profileError.message)
    } else {
      console.log('✅ profiles table join working')
    }

    // Test 5: Check if we can join talent with talent_project_assignments
    console.log('\n5. Testing talent table joins...')
    const { data: talentJoin, error: talentJoinError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        talent_id,
        talent:talent_id (
          id,
          first_name,
          last_name
        )
      `)
      .limit(1)

    if (talentJoinError) {
      console.error('❌ talent join failed:', talentJoinError.message)
    } else {
      console.log('✅ talent table join working')
    }

    console.log('\n🎉 Assignment API structure test completed!')

  } catch (error) {
    console.error('💥 Test failed with error:', error.message)
  }
}

// Run the test
testAssignmentAPI()