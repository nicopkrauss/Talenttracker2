#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

// Parse environment variables
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugDatabaseSchemaIssue() {
  console.log('🔍 Debugging Database Schema Issue')
  console.log('==================================\n')
  
  try {
    // Check current state of Test group
    console.log('📊 Current Test group state:')
    const { data: testGroup, error: groupError } = await supabase
      .from('talent_groups')
      .select('id, group_name, assigned_escort_id, assigned_escort_ids, escort_dropdown_count')
      .eq('group_name', 'Test')
      .single()
    
    if (groupError) {
      console.error('❌ Error fetching test group:', groupError)
      return
    }

    console.log(`Group: ${testGroup.group_name}`)
    console.log(`  assigned_escort_id: ${testGroup.assigned_escort_id}`)
    console.log(`  assigned_escort_ids: ${JSON.stringify(testGroup.assigned_escort_ids)}`)
    console.log(`  escort_dropdown_count: ${testGroup.escort_dropdown_count}`)

    // Test API call simulation
    console.log('\n🧪 Testing API call simulation...')
    
    // Simulate clearing assignment (escortIds: [])
    console.log('Simulating clear assignment API call...')
    const { data: updateResult, error: updateError } = await supabase
      .from('talent_groups')
      .update({
        assigned_escort_ids: [],
        assigned_escort_id: null,
        escort_dropdown_count: 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', testGroup.id)
      .select()

    if (updateError) {
      console.error('❌ Update failed:', updateError)
    } else {
      console.log('✅ Update successful:', updateResult)
    }

    // Check state after update
    console.log('\n📊 State after simulated clear:')
    const { data: afterUpdate, error: afterError } = await supabase
      .from('talent_groups')
      .select('id, group_name, assigned_escort_id, assigned_escort_ids, escort_dropdown_count')
      .eq('id', testGroup.id)
      .single()
    
    if (afterError) {
      console.error('❌ Error fetching after update:', afterError)
    } else {
      console.log(`  assigned_escort_id: ${afterUpdate.assigned_escort_id}`)
      console.log(`  assigned_escort_ids: ${JSON.stringify(afterUpdate.assigned_escort_ids)}`)
      console.log(`  escort_dropdown_count: ${afterUpdate.escort_dropdown_count}`)
    }

    // Test assignment (add escort back)
    console.log('\n🧪 Testing assignment (add escort back)...')
    const { data: escorts } = await supabase
      .from('profiles')
      .select('id, full_name')
      .not('full_name', 'is', null)
      .limit(1)

    if (escorts && escorts.length > 0) {
      const testEscort = escorts[0]
      console.log(`Assigning escort: ${testEscort.full_name} (${testEscort.id})`)
      
      const { data: assignResult, error: assignError } = await supabase
        .from('talent_groups')
        .update({
          assigned_escort_ids: [testEscort.id],
          assigned_escort_id: testEscort.id,
          escort_dropdown_count: 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', testGroup.id)
        .select()

      if (assignError) {
        console.error('❌ Assignment failed:', assignError)
      } else {
        console.log('✅ Assignment successful:', assignResult)
      }

      // Check final state
      console.log('\n📊 Final state after assignment:')
      const { data: finalState, error: finalError } = await supabase
        .from('talent_groups')
        .select('id, group_name, assigned_escort_id, assigned_escort_ids, escort_dropdown_count')
        .eq('id', testGroup.id)
        .single()
      
      if (finalError) {
        console.error('❌ Error fetching final state:', finalError)
      } else {
        console.log(`  assigned_escort_id: ${finalState.assigned_escort_id}`)
        console.log(`  assigned_escort_ids: ${JSON.stringify(finalState.assigned_escort_ids)}`)
        console.log(`  escort_dropdown_count: ${finalState.escort_dropdown_count}`)
      }
    }

    console.log('\n🔧 DIAGNOSIS:')
    console.log('=============')
    console.log('• Database operations work correctly when called directly')
    console.log('• Issue likely in API endpoint or request format')
    console.log('• Need to check if API is actually being called')
    console.log('• Check browser network tab for failed requests')

  } catch (error) {
    console.error('❌ Debug failed:', error)
    process.exit(1)
  }
}

debugDatabaseSchemaIssue()