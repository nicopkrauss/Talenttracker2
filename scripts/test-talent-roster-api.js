#!/usr/bin/env node

/**
 * Test the talent roster API directly
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

async function testTalentRosterAPI() {
  console.log('🧪 Testing talent roster API...\n')

  try {
    // 1. Find a project with talent assignments
    console.log('1. Finding project with talent assignments...')
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        talent_project_assignments(id)
      `)
      .not('talent_project_assignments', 'is', null)
      .limit(1)

    if (projectError) {
      console.error('❌ Error finding projects:', projectError.message)
      return
    }

    if (!projects || projects.length === 0) {
      console.log('❌ No projects with talent assignments found')
      return
    }

    const projectId = projects[0].id
    console.log(`✅ Using project: ${projects[0].name} (${projectId})`)

    // 2. Test the new query structure
    console.log('\n2. Testing new query structure...')
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
      .eq('project_id', projectId)
      .order('display_order', { ascending: true })

    if (assignmentsError) {
      console.error('❌ Error fetching assignments:', assignmentsError.message)
      return
    }

    console.log(`✅ Found ${assignments.length} talent assignments`)
    
    if (assignments.length > 0) {
      console.log('\n   Sample assignment:')
      const sample = assignments[0]
      console.log(`   - Talent: ${sample.talent.first_name} ${sample.talent.last_name}`)
      console.log(`   - Display Order: ${sample.display_order}`)
      console.log(`   - Status: ${sample.status}`)
      console.log(`   - Scheduled Dates: ${sample.scheduled_dates?.length || 0} dates`)
    }

    // 3. Test the API endpoint directly
    console.log('\n3. Testing API endpoint...')
    const apiUrl = `http://localhost:3000/api/projects/${projectId}/talent-roster`
    
    try {
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      if (response.ok) {
        console.log(`✅ API endpoint working: ${data.data?.length || 0} talent returned`)
        
        if (data.data && data.data.length > 0) {
          console.log('\n   Sample API response:')
          const sample = data.data[0]
          console.log(`   - Name: ${sample.first_name} ${sample.last_name}`)
          console.log(`   - Assignment ID: ${sample.assignment?.id}`)
          console.log(`   - Display Order: ${sample.assignment?.display_order}`)
        }
      } else {
        console.error('❌ API endpoint error:', data.error)
        console.error('   Details:', data.details)
      }
    } catch (fetchError) {
      console.error('❌ Error calling API endpoint:', fetchError.message)
      console.log('   (This is expected if the dev server is not running)')
    }

    // 4. Initialize display_order values if they're null
    console.log('\n4. Checking display_order values...')
    const nullOrderAssignments = assignments.filter(a => a.display_order === null || a.display_order === 0)
    
    if (nullOrderAssignments.length > 0) {
      console.log(`⚠️  Found ${nullOrderAssignments.length} assignments with null/zero display_order`)
      console.log('   Initializing display_order values...')
      
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i]
        const newOrder = i + 1
        
        const { error: updateError } = await supabase
          .from('talent_project_assignments')
          .update({ display_order: newOrder })
          .eq('id', assignment.id)
        
        if (updateError) {
          console.error(`   ❌ Error updating ${assignment.talent.first_name}: ${updateError.message}`)
        } else {
          console.log(`   ✅ ${assignment.talent.first_name} ${assignment.talent.last_name} → order ${newOrder}`)
        }
      }
    } else {
      console.log('✅ All assignments have proper display_order values')
    }

    console.log('\n🎉 Talent roster API test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testTalentRosterAPI()