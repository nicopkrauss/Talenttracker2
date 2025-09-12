#!/usr/bin/env node

/**
 * Test the talent roster query directly with Supabase
 */

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
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testTalentRosterDirect() {
  console.log('🧪 Testing talent roster query directly...\n')

  try {
    const projectId = 'fc928ecf-153f-4544-9878-4bc7e85f2949' // 2025 Emmys project

    console.log(`Testing with project ID: ${projectId}`)

    // Test the exact query from the API
    console.log('\n1. Testing the exact API query...')
    const { data: assignments, error: talentError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        status,
        assigned_at,
        scheduled_dates,
        display_order,
        talent:talent_id (
          id,
          first_name,
          last_name,
          rep_name,
          rep_email,
          rep_phone,
          notes,
          created_at,
          updated_at
        )
      `)
      .eq('project_id', projectId)
      .order('display_order', { ascending: true })

    if (talentError) {
      console.error('❌ Error fetching assignments:', talentError)
      return
    }

    console.log(`✅ Query successful: ${assignments.length} assignments found`)

    // Transform the data like the API does
    const transformedTalent = assignments?.map(assignment => ({
      id: assignment.talent.id,
      first_name: assignment.talent.first_name,
      last_name: assignment.talent.last_name,
      rep_name: assignment.talent.rep_name,
      rep_email: assignment.talent.rep_email,
      rep_phone: assignment.talent.rep_phone,
      notes: assignment.talent.notes,
      created_at: assignment.talent.created_at,
      updated_at: assignment.talent.updated_at,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        assigned_at: assignment.assigned_at,
        scheduled_dates: assignment.scheduled_dates,
        display_order: assignment.display_order
      }
    })) || []

    console.log('\n2. Transformed data:')
    transformedTalent.forEach((talent, index) => {
      console.log(`   ${index + 1}. ${talent.first_name} ${talent.last_name} (Order: ${talent.assignment.display_order})`)
    })

    // Test with search filtering (using the new approach)
    console.log('\n3. Testing search filtering...')
    const searchTerm = 'Adam'
    
    // First get matching talent IDs
    const { data: matchingTalent } = await supabase
      .from('talent')
      .select('id')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
    
    if (matchingTalent && matchingTalent.length > 0) {
      const talentIds = matchingTalent.map(t => t.id)
      
      const { data: searchResults, error: searchError } = await supabase
        .from('talent_project_assignments')
        .select(`
          id,
          status,
          assigned_at,
          scheduled_dates,
          display_order,
          talent:talent_id (
            id,
            first_name,
            last_name,
            rep_name,
            rep_email,
            rep_phone,
            notes,
            created_at,
            updated_at
          )
        `)
        .eq('project_id', projectId)
        .in('talent_id', talentIds)
        .order('display_order', { ascending: true })

      if (searchError) {
        console.error('❌ Search query error:', searchError)
      } else {
        console.log(`✅ Search for "${searchTerm}": ${searchResults.length} results`)
        searchResults.forEach(result => {
          console.log(`   - ${result.talent.first_name} ${result.talent.last_name}`)
        })
      }
    } else {
      console.log(`✅ Search for "${searchTerm}": 0 results (no matching talent found)`)
    }

    // Test status filtering
    console.log('\n4. Testing status filtering...')
    const { data: activeResults, error: statusError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        status,
        assigned_at,
        scheduled_dates,
        display_order,
        talent:talent_id (
          id,
          first_name,
          last_name,
          rep_name,
          rep_email,
          rep_phone,
          notes,
          created_at,
          updated_at
        )
      `)
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('display_order', { ascending: true })

    if (statusError) {
      console.error('❌ Status filter error:', statusError)
    } else {
      console.log(`✅ Active status filter: ${activeResults.length} results`)
    }

    console.log('\n🎉 Direct query test completed successfully!')
    console.log('\nThe API query structure is working correctly.')
    console.log('If the UI is not showing talent, the issue may be in:')
    console.log('1. Authentication/authorization in the API')
    console.log('2. Frontend component rendering')
    console.log('3. Network/CORS issues')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testTalentRosterDirect()