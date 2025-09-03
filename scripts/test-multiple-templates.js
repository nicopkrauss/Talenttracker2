#!/usr/bin/env node

/**
 * Test Multiple Role Templates
 * This script tests creating multiple templates for the same role
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
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testMultipleTemplates() {
  console.log('🧪 Testing multiple role templates for the same role...')
  
  try {
    // Get a project to test with
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError.message)
      return
    }
    
    if (!projects || projects.length === 0) {
      console.error('❌ No projects found to test with')
      return
    }
    
    const testProject = projects[0]
    console.log(`📋 Testing with project: ${testProject.name} (${testProject.id})`)
    
    // Test creating multiple Coordinator templates
    const coordinatorTemplates = [
      {
        project_id: testProject.id,
        role: 'coordinator',
        display_name: 'Senior Coordinator',
        base_pay_rate: 400.00,
        time_type: 'daily',
        description: 'Senior level coordinator with team leadership responsibilities'
      },
      {
        project_id: testProject.id,
        role: 'coordinator',
        display_name: 'Junior Coordinator',
        base_pay_rate: 300.00,
        time_type: 'daily',
        description: 'Entry level coordinator position'
      }
    ]
    
    console.log('\n🔍 Creating multiple coordinator templates...')
    
    for (const template of coordinatorTemplates) {
      // Check if this specific template already exists
      const { data: existing } = await supabase
        .from('project_role_templates')
        .select('id')
        .eq('project_id', testProject.id)
        .eq('role', template.role)
        .eq('display_name', template.display_name)
        .single()
      
      if (existing) {
        console.log(`⚠️  Template "${template.display_name}" already exists, skipping`)
        continue
      }
      
      const { data: created, error: createError } = await supabase
        .from('project_role_templates')
        .insert(template)
        .select()
        .single()
      
      if (createError) {
        console.error(`❌ Error creating ${template.display_name}:`, createError.message)
      } else {
        console.log(`✅ Created: ${created.display_name} - $${created.base_pay_rate}/${created.time_type}`)
      }
    }
    
    // Fetch all coordinator templates to verify
    console.log('\n🔍 Fetching all coordinator templates...')
    const { data: allCoordinatorTemplates, error: fetchError } = await supabase
      .from('project_role_templates')
      .select('*')
      .eq('project_id', testProject.id)
      .eq('role', 'coordinator')
      .eq('is_active', true)
      .order('base_pay_rate', { ascending: false })
    
    if (fetchError) {
      console.error('❌ Error fetching coordinator templates:', fetchError.message)
    } else {
      console.log(`✅ Found ${allCoordinatorTemplates.length} coordinator templates:`)
      allCoordinatorTemplates.forEach(template => {
        console.log(`   - ${template.display_name}: $${template.base_pay_rate}/${template.time_type}`)
      })
    }
    
    // Test duplicate display name prevention
    console.log('\n🔍 Testing duplicate display name prevention...')
    const duplicateTemplate = {
      project_id: testProject.id,
      role: 'coordinator',
      display_name: 'Senior Coordinator', // This should fail
      base_pay_rate: 450.00,
      time_type: 'daily'
    }
    
    const { data: duplicate, error: duplicateError } = await supabase
      .from('project_role_templates')
      .insert(duplicateTemplate)
      .select()
      .single()
    
    if (duplicateError) {
      console.log('✅ Duplicate display name correctly prevented:', duplicateError.message)
    } else {
      console.log('❌ Duplicate display name was not prevented - this is unexpected')
    }
    
    console.log('\n🎉 Multiple template test completed!')
    
  } catch (err) {
    console.error('❌ Error testing multiple templates:', err.message)
    process.exit(1)
  }
}

testMultipleTemplates()