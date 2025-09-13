#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phksmrvgqqjfxgxztvgc.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoa3NtcnZncXFqZnhneHp0dmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MjYwNDYsImV4cCI6MjA3MjAwMjA0Nn0.383iOq9if4QKz5zi9wcQVOthrKtAg8SzIzJlT4338ms'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testMultiEscortUIFlow() {
  console.log('🔍 Testing multi-escort UI flow...\n')

  const projectId = 'fc928ecf-153f-4544-9878-4bc7e85f2949'
  const talentId = 'd1d08745-4560-4e9c-b98d-5cc2943f0eb9'
  const testDate = '2026-01-09'

  try {
    // 1. Set up initial state - assign an escort and set dropdown count to 2
    console.log('1. Setting up initial state...')
    const { error: setupError } = await supabase
      .from('talent_groups')
      .update({
        assigned_escort_id: '368dd790-794c-4683-807e-03be91f3ce46',
        assigned_escort_ids: ['368dd790-794c-4683-807e-03be91f3ce46'],
        escort_dropdown_count: 2,
        updated_at: new Date().toISOString()
      })
      .eq('id', talentId)
      .eq('project_id', projectId)

    if (setupError) {
      console.error('❌ Setup error:', setupError)
      return
    }
    console.log('✅ Initial state set up')

    // 2. Verify initial state
    console.log('\n2. Verifying initial state...')
    const { data: initialState, error: initialError } = await supabase
      .from('talent_groups')
      .select('assigned_escort_id, assigned_escort_ids, escort_dropdown_count')
      .eq('id', talentId)
      .eq('project_id', projectId)
      .single()

    if (initialError) {
      console.error('❌ Initial state error:', initialError)
      return
    }

    console.log('✅ Initial state:')
    console.log('   - Assigned Escort ID:', initialState.assigned_escort_id)
    console.log('   - Assigned Escort IDs:', initialState.assigned_escort_ids)
    console.log('   - Dropdown Count:', initialState.escort_dropdown_count)

    // 3. Test clearing escort from first dropdown (simulating UI action)
    console.log('\n3. Testing escort clearing from first dropdown...')
    const { error: clearError } = await supabase
      .from('talent_groups')
      .update({
        assigned_escort_id: null,
        assigned_escort_ids: [],
        updated_at: new Date().toISOString()
      })
      .eq('id', talentId)
      .eq('project_id', projectId)

    if (clearError) {
      console.error('❌ Clear error:', clearError)
      return
    }
    console.log('✅ Escort cleared')

    // 4. Verify clearing worked
    console.log('\n4. Verifying escort clearing...')
    const { data: clearedState, error: clearVerifyError } = await supabase
      .from('talent_groups')
      .select('assigned_escort_id, assigned_escort_ids, escort_dropdown_count')
      .eq('id', talentId)
      .eq('project_id', projectId)
      .single()

    if (clearVerifyError) {
      console.error('❌ Clear verify error:', clearVerifyError)
      return
    }

    console.log('✅ After clearing:')
    console.log('   - Assigned Escort ID:', clearedState.assigned_escort_id)
    console.log('   - Assigned Escort IDs:', clearedState.assigned_escort_ids)
    console.log('   - Dropdown Count:', clearedState.escort_dropdown_count)

    // 5. Test removing dropdown (simulating "Remove Escort Field" action)
    console.log('\n5. Testing dropdown removal...')
    const { error: removeError } = await supabase
      .from('talent_groups')
      .update({
        escort_dropdown_count: 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', talentId)
      .eq('project_id', projectId)

    if (removeError) {
      console.error('❌ Remove error:', removeError)
      return
    }
    console.log('✅ Dropdown count reduced')

    // 6. Verify dropdown removal
    console.log('\n6. Verifying dropdown removal...')
    const { data: removedState, error: removeVerifyError } = await supabase
      .from('talent_groups')
      .select('assigned_escort_id, assigned_escort_ids, escort_dropdown_count')
      .eq('id', talentId)
      .eq('project_id', projectId)
      .single()

    if (removeVerifyError) {
      console.error('❌ Remove verify error:', removeVerifyError)
      return
    }

    console.log('✅ After dropdown removal:')
    console.log('   - Assigned Escort ID:', removedState.assigned_escort_id)
    console.log('   - Assigned Escort IDs:', removedState.assigned_escort_ids)
    console.log('   - Dropdown Count:', removedState.escort_dropdown_count)

    // 7. Test what the assignments API would return
    console.log('\n7. Testing assignments API response...')
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('talent_groups')
      .select(`
        id,
        group_name,
        members,
        assigned_escort_id,
        assigned_escort_ids,
        escort_dropdown_count,
        assigned_escort:profiles!talent_groups_assigned_escort_id_fkey(
          id,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .eq('id', talentId)
      .single()

    if (assignmentsError) {
      console.error('❌ Assignments API error:', assignmentsError)
      return
    }

    console.log('✅ Assignments API would return:')
    console.log('   - Group Name:', assignmentsData.group_name)
    console.log('   - Members:', assignmentsData.members)
    console.log('   - Assigned Escort ID:', assignmentsData.assigned_escort_id)
    console.log('   - Assigned Escort IDs:', assignmentsData.assigned_escort_ids)
    console.log('   - Dropdown Count:', assignmentsData.escort_dropdown_count)
    console.log('   - Assigned Escort Name:', assignmentsData.assigned_escort?.full_name || 'None')

    // 8. Simulate what the UI should show
    console.log('\n8. UI should show:')
    const dropdownCount = assignmentsData.escort_dropdown_count || 1
    const escortIds = assignmentsData.assigned_escort_ids || []
    
    console.log(`   - Number of dropdowns: ${dropdownCount}`)
    for (let i = 0; i < dropdownCount; i++) {
      const escortId = escortIds[i]
      const escortName = escortId ? assignmentsData.assigned_escort?.full_name || 'Unknown' : 'Select Escort'
      console.log(`   - Dropdown ${i + 1}: ${escortName}`)
    }

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testMultiEscortUIFlow()