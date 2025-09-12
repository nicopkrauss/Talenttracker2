#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTalentRosterAPI() {
  console.log('🧪 Testing Talent Roster API Fix...\n')

  try {
    // First, let's check if we have any projects
    console.log('1. Checking available projects...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status')
      .limit(5)

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }

    if (!projects || projects.length === 0) {
      console.log('❌ No projects found')
      return
    }

    console.log(`✅ Found ${projects.length} projects`)
    projects.forEach(p => console.log(`   - ${p.name} (${p.id})`))

    const testProjectId = projects[0].id
    console.log(`\n2. Testing talent roster API for project: ${projects[0].name}`)

    // Test the direct Supabase query that the API uses
    console.log('   Testing direct Supabase query...')
    const { data: assignments, error: assignmentsError } = await supabase
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
      .eq('project_id', testProjectId)
      .order('display_order', { ascending: true })

    if (assignmentsError) {
      console.error('❌ Error in direct query:', assignmentsError)
      return
    }

    console.log(`✅ Direct query successful: ${assignments?.length || 0} assignments found`)
    
    if (assignments && assignments.length > 0) {
      console.log('   Sample assignment:')
      console.log('   ', JSON.stringify(assignments[0], null, 2))
    }

    // Now test the API endpoint via HTTP
    console.log('\n3. Testing API endpoint via HTTP...')
    const response = await fetch(`http://localhost:3000/api/projects/${testProjectId}/talent-roster`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`)
      console.error('Error details:', errorText)
      return
    }

    const apiData = await response.json()
    console.log('✅ API request successful')
    console.log(`   Found ${apiData.data?.length || 0} talent assignments`)
    
    if (apiData.data && apiData.data.length > 0) {
      console.log('   Sample talent:')
      console.log('   ', JSON.stringify(apiData.data[0], null, 2))
    }

    console.log('\n🎉 All tests passed! The talent roster API is working correctly.')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

testTalentRosterAPI()