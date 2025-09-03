#!/usr/bin/env node

/**
 * Test Role Templates
 * This script tests the role template functionality
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

async function testRoleTemplates() {
  console.log('🧪 Testing role template functionality...')
  
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
    
    // Test 1: Fetch existing role templates
    console.log('\n🔍 Test 1: Fetching existing role templates...')
    const { data: templates, error: fetchError } = await supabase
      .from('project_role_templates')
      .select('*')
      .eq('project_id', testProject.id)
      .eq('is_active', true)
      .order('sort_order')
    
    if (fetchError) {
      console.error('❌ Error fetching role templates:', fetchError.message)
      return
    }
    
    console.log(`✅ Found ${templates.length} role templates:`)
    templates.forEach(template => {
      console.log(`   - ${template.display_name} (${template.role}): $${template.base_pay_rate}/${template.time_type}`)
    })
    
    // Test 2: Create a new role template
    console.log('\n🔍 Test 2: Creating a new role template...')
    const newTemplate = {
      project_id: testProject.id,
      role: 'coordinator',
      display_name: 'Senior Coordinator',
      base_pay_rate: 350.00,
      time_type: 'daily',
      description: 'Senior level coordinator with additional responsibilities',
      is_active: true,
      sort_order: 10
    }
    
    // First, check if this role already has a template
    const { data: existing } = await supabase
      .from('project_role_templates')
      .select('id')
      .eq('project_id', testProject.id)
      .eq('role', 'coordinator')
      .eq('display_name', 'Senior Coordinator')
      .single()
    
    if (existing) {
      console.log('⚠️  Senior Coordinator template already exists, skipping creation')
    } else {
      const { data: created, error: createError } = await supabase
        .from('project_role_templates')
        .insert(newTemplate)
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating role template:', createError.message)
      } else {
        console.log(`✅ Created new role template: ${created.display_name}`)
        
        // Test 3: Update the role template
        console.log('\n🔍 Test 3: Updating the role template...')
        const { data: updated, error: updateError } = await supabase
          .from('project_role_templates')
          .update({
            base_pay_rate: 375.00,
            description: 'Updated: Senior level coordinator with additional responsibilities and team leadership'
          })
          .eq('id', created.id)
          .select()
          .single()
        
        if (updateError) {
          console.error('❌ Error updating role template:', updateError.message)
        } else {
          console.log(`✅ Updated role template: $${updated.base_pay_rate}`)
        }
        
        // Test 4: Soft delete the role template
        console.log('\n🔍 Test 4: Soft deleting the role template...')
        const { data: deleted, error: deleteError } = await supabase
          .from('project_role_templates')
          .update({ is_active: false })
          .eq('id', created.id)
          .select()
          .single()
        
        if (deleteError) {
          console.error('❌ Error deleting role template:', deleteError.message)
        } else {
          console.log(`✅ Soft deleted role template: ${deleted.display_name}`)
        }
      }
    }
    
    // Test 5: Verify the project API includes role templates
    console.log('\n🔍 Test 5: Testing project API with role templates...')
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        project_role_templates (
          id,
          role,
          display_name,
          base_pay_rate,
          time_type,
          is_active
        )
      `)
      .eq('id', testProject.id)
      .single()
    
    if (projectError) {
      console.error('❌ Error fetching project with role templates:', projectError.message)
    } else {
      console.log(`✅ Project API includes ${projectData.project_role_templates.length} role templates`)
      projectData.project_role_templates.forEach(template => {
        console.log(`   - ${template.display_name}: $${template.base_pay_rate}/${template.time_type} (active: ${template.is_active})`)
      })
    }
    
    console.log('\n🎉 All role template tests completed successfully!')
    
  } catch (err) {
    console.error('❌ Error testing role templates:', err.message)
    process.exit(1)
  }
}

testRoleTemplates()