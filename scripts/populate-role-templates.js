#!/usr/bin/env node

/**
 * Populate Role Templates
 * This script creates default role templates for existing projects
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

async function populateRoleTemplates() {
  console.log('🚀 Populating role templates for existing projects...')
  
  try {
    // Get all existing projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .in('status', ['prep', 'active'])
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError.message)
      process.exit(1)
    }
    
    console.log(`📋 Found ${projects.length} projects`)
    
    // Default role templates
    const defaultTemplates = [
      {
        role: 'supervisor',
        display_name: 'Supervisor',
        base_pay_rate: 300.00,
        time_type: 'daily',
        sort_order: 1
      },
      {
        role: 'coordinator',
        display_name: 'Coordinator',
        base_pay_rate: 350.00,
        time_type: 'daily',
        sort_order: 2
      },
      {
        role: 'talent_escort',
        display_name: 'Escort',
        base_pay_rate: 20.00,
        time_type: 'hourly',
        sort_order: 3
      }
    ]
    
    // Create role templates for each project
    for (const project of projects) {
      console.log(`📝 Creating role templates for project ${project.id}`)
      
      const templatesForProject = defaultTemplates.map(template => ({
        ...template,
        project_id: project.id
      }))
      
      const { error: insertError } = await supabase
        .from('project_role_templates')
        .insert(templatesForProject)
      
      if (insertError) {
        console.error(`❌ Error creating templates for project ${project.id}:`, insertError.message)
      } else {
        console.log(`✅ Created ${templatesForProject.length} role templates for project ${project.id}`)
      }
    }
    
    console.log('🎉 Role template population completed!')
    
  } catch (err) {
    console.error('❌ Error populating role templates:', err.message)
    process.exit(1)
  }
}

populateRoleTemplates()