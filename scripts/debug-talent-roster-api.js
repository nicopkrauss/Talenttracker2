#!/usr/bin/env node

/**
 * Debug the talent roster API by simulating the exact call
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

async function debugTalentRosterAPI() {
  console.log('🔍 Debugging talent roster API...\n')

  try {
    const projectId = 'fc928ecf-153f-4544-9878-4bc7e85f2949' // 2025 Emmys project

    console.log(`Project ID: ${projectId}`)

    // Step 1: Check project access (like the API does)
    console.log('\n1. Checking project access...')
    const { data: projectAccess, error: accessError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', projectId)
      .single()

    if (accessError || !projectAccess) {
      console.error('❌ Project access error:', accessError?.message || 'Project not found')
      return
    }

    console.log(`✅ Project access OK: ${projectAccess.name}`)

    // Step 2: Simulate the exact API query (without search)
    console.log('\n2. Testing main query (no search)...')
    let talentQuery = supabase
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

    const { data: assignments, error: talentError } = await talentQuery

    if (talentError) {
      console.error('❌ Main query error:', talentError)
      return
    }

    console.log(`✅ Main query successful: ${assignments.length} assignments`)

    // Step 3: Transform data (like the API does)
    console.log('\n3. Testing data transformation...')
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

    console.log('✅ Data transformation successful')
    console.log('\n   Transformed talent:')
    transformedTalent.forEach((talent, index) => {
      console.log(`   ${index + 1}. ${talent.first_name} ${talent.last_name}`)
      console.log(`      - ID: ${talent.id}`)
      console.log(`      - Rep: ${talent.rep_name}`)
      console.log(`      - Order: ${talent.assignment.display_order}`)
      console.log(`      - Status: ${talent.assignment.status}`)
    })

    // Step 4: Test with search
    console.log('\n4. Testing with search filter...')
    const search = 'Adam'
    
    // First get matching talent IDs
    const { data: matchingTalent } = await supabase
      .from('talent')
      .select('id')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    
    if (matchingTalent && matchingTalent.length > 0) {
      const talentIds = matchingTalent.map(t => t.id)
      
      let searchQuery = supabase
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

      const { data: searchResults, error: searchError } = await searchQuery

      if (searchError) {
        console.error('❌ Search query error:', searchError)
      } else {
        console.log(`✅ Search query successful: ${searchResults.length} results for "${search}"`)
        searchResults.forEach(result => {
          console.log(`   - ${result.talent.first_name} ${result.talent.last_name}`)
        })
      }
    }

    // Step 5: Create the final API response format
    console.log('\n5. Creating API response format...')
    const apiResponse = {
      data: transformedTalent,
      project: {
        id: projectAccess.id,
        name: projectAccess.name,
        status: projectAccess.status
      },
      filters: {
        search: '',
        status: 'all',
        sort_by: 'display_order',
        sort_order: 'asc'
      }
    }

    console.log('✅ API response format created')
    console.log(`   - Data count: ${apiResponse.data.length}`)
    console.log(`   - Project: ${apiResponse.project.name}`)

    console.log('\n🎉 All API steps completed successfully!')
    console.log('\nThe API should be working. If the UI still shows no talent, check:')
    console.log('1. Authentication in the browser (user logged in?)')
    console.log('2. Network requests in browser dev tools')
    console.log('3. Console errors in the browser')
    console.log('4. Component rendering logic')

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

debugTalentRosterAPI()