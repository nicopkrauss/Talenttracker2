#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugMultiEscortIssues() {
  console.log('🔍 Debugging multi-escort assignment issues...\n')

  const projectId = 'fc928ecf-153f-4544-9878-4bc7e85f2949'
  const talentId = 'd1d08745-4560-4e9c-b98d-5cc2943f0eb9'

  try {
    // 1. Check current talent group state
    console.log('1. Checking current talent group state:')
    const { data: talentGroup, error: groupError } = await supabase
      .from('talent_groups')
      .select('*')
      .eq('id', talentId)
      .eq('project_id', projectId)
      .single()

    if (groupError) {
      console.error('❌ Error fetching talent group:', groupError)
      return
    }

    console.log('✅ Current talent group state:')
    console.log('   - ID:', talentGroup.id)
    console.log('   - Name:', talentGroup.name)
    console.log('   - Assigned Escort ID:', talentGroup.assigned_escort_id)
    console.log('   - Assigned Escort IDs:', talentGroup.assigned_escort_ids)
    console.log('   - Escort Dropdown Count:', talentGroup.escort_dropdown_count)
    console.log('')

    // 2. Test clearing escort assignment
    console.log('2. Testing escort clearing...')
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
      console.error('❌ Error clearing escort assignment:', clearError)
    } else {
      console.log('✅ Escort assignment cleared successfully')
    }

    // 3. Verify clearing worked
    console.log('3. Verifying escort clearing...')
    const { data: clearedGroup, error: verifyError } = await supabase
      .from('talent_groups')
      .select('assigned_escort_id, assigned_escort_ids')
      .eq('id', talentId)
      .eq('project_id', projectId)
      .single()

    if (verifyError) {
      console.error('❌ Error verifying clear:', verifyError)
    } else {
      console.log('✅ After clearing:')
      console.log('   - Assigned Escort ID:', clearedGroup.assigned_escort_id)
      console.log('   - Assigned Escort IDs:', clearedGroup.assigned_escort_ids)
    }
    console.log('')

    // 4. Test dropdown count reduction
    console.log('4. Testing dropdown count reduction...')
    const { error: countError } = await supabase
      .from('talent_groups')
      .update({
        escort_dropdown_count: 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', talentId)
      .eq('project_id', projectId)

    if (countError) {
      console.error('❌ Error updating dropdown count:', countError)
    } else {
      console.log('✅ Dropdown count updated successfully')
    }

    // 5. Verify dropdown count update
    console.log('5. Verifying dropdown count update...')
    const { data: updatedGroup, error: countVerifyError } = await supabase
      .from('talent_groups')
      .select('escort_dropdown_count')
      .eq('id', talentId)
      .eq('project_id', projectId)
      .single()

    if (countVerifyError) {
      console.error('❌ Error verifying count update:', countVerifyError)
    } else {
      console.log('✅ After count update:')
      console.log('   - Escort Dropdown Count:', updatedGroup.escort_dropdown_count)
    }
    console.log('')

    // 6. Test API endpoint directly
    console.log('6. Testing API endpoint directly...')
    const testAssignment = {
      date: '2026-01-09',
      assignments: [{
        talentId: talentId,
        escortIds: [],
        dropdownCount: 1
      }]
    }

    console.log('   Making API call with:', JSON.stringify(testAssignment, null, 2))

    const response = await fetch(`http://localhost:3000/api/projects/${projectId}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAssignment)
    })

    console.log('   API Response Status:', response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ API call successful:', result)
    } else {
      const errorText = await response.text()
      console.error('❌ API call failed:', errorText)
    }

    // 7. Final state check
    console.log('\n7. Final state check:')
    const { data: finalGroup, error: finalError } = await supabase
      .from('talent_groups')
      .select('*')
      .eq('id', talentId)
      .eq('project_id', projectId)
      .single()

    if (finalError) {
      console.error('❌ Error fetching final state:', finalError)
    } else {
      console.log('✅ Final talent group state:')
      console.log('   - Assigned Escort ID:', finalGroup.assigned_escort_id)
      console.log('   - Assigned Escort IDs:', finalGroup.assigned_escort_ids)
      console.log('   - Escort Dropdown Count:', finalGroup.escort_dropdown_count)
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

debugMultiEscortIssues()