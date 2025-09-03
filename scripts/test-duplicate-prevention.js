const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDuplicatePrevention() {
  console.log('🔍 Testing duplicate prevention for role templates...\n')

  try {
    // Get test project
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)

    if (fetchError) {
      console.error('❌ Error fetching projects:', fetchError.message)
      return
    }

    if (!projects || projects.length === 0) {
      console.log('⚠️ No projects found. Please create a project first.')
      return
    }

    const testProject = projects[0]
    console.log(`📋 Testing with project: ${testProject.name} (${testProject.id})`)

    // Check existing Lead Coordinator template
    const { data: existingLead } = await supabase
      .from('project_role_templates')
      .select('id')
      .eq('project_id', testProject.id)
      .eq('role', 'coordinator')
      .eq('display_name', 'Lead Coordinator')
      .single()

    if (existingLead) {
      console.log('⚠️ "Lead Coordinator" template already exists, skipping creation')
    } else {
      // Test 1: Create unique template (should succeed)
      console.log('\n🔍 Test 1: Creating unique "Lead Coordinator" template...')
      const uniqueTemplate = {
        project_id: testProject.id,
        role: 'coordinator',
        display_name: 'Lead Coordinator',
        base_pay_rate: 450.00,
        time_type: 'daily'
      }

      const { data: created, error: createError } = await supabase
        .from('project_role_templates')
        .insert(uniqueTemplate)
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating Lead Coordinator:', createError.message)
      } else {
        console.log(`✅ Successfully created: ${created.display_name} - $${created.base_pay_rate}/${created.time_type}`)
      }
    }

    // Test 2: Attempt to create duplicate "Senior Coordinator" template (should fail)
    console.log('\n🔍 Test 2: Attempting to create duplicate "Senior Coordinator" template (should fail)...')
    const duplicateTemplate = {
      project_id: testProject.id,
      role: 'coordinator',
      display_name: 'Senior Coordinator',
      base_pay_rate: 425.00,
      time_type: 'daily'
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from('project_role_templates')
      .insert(duplicateTemplate)
      .select()
      .single()

    if (duplicateError) {
      console.log('✅ Duplicate prevention working! Error:', duplicateError.message)
    } else {
      console.log('❌ Duplicate was created when it should have been prevented')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testDuplicatePrevention()