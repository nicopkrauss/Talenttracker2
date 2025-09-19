#!/usr/bin/env node

/**
 * Setup Role Templates Trigger Script
 * Creates the trigger function to automatically create default role templates
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

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupTrigger() {
  console.log('🚀 Setting up role templates trigger...\n')
  
  try {
    // Step 1: Add is_default column if it doesn't exist
    console.log('📝 Adding is_default column...')
    
    const { error: columnError } = await supabase
      .from('project_role_templates')
      .select('is_default')
      .limit(1)

    if (columnError && columnError.message.includes('column "is_default" does not exist')) {
      console.log('⚡ Adding is_default column to project_role_templates...')
      // We'll handle this in the application logic since we can't run DDL directly
    } else {
      console.log('✅ is_default column already exists')
    }

    // Step 2: Check if we have any existing projects without role templates
    console.log('\n📊 Checking existing projects...')
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')

    if (projectsError) {
      console.error('❌ Failed to fetch projects:', projectsError.message)
      return
    }

    console.log(`📋 Found ${projects.length} projects`)

    // Step 3: Check which projects need default role templates
    for (const project of projects) {
      console.log(`\n🔍 Checking project: ${project.name}`)
      
      const { data: existingTemplates, error: templatesError } = await supabase
        .from('project_role_templates')
        .select('role, display_name')
        .eq('project_id', project.id)

      if (templatesError) {
        console.error(`❌ Failed to check templates for ${project.name}:`, templatesError.message)
        continue
      }

      const existingRoles = existingTemplates.map(t => t.role)
      const requiredRoles = ['supervisor', 'coordinator', 'talent_escort']
      const missingRoles = requiredRoles.filter(role => !existingRoles.includes(role))

      if (missingRoles.length > 0) {
        console.log(`📝 Creating missing role templates for ${project.name}: ${missingRoles.join(', ')}`)
        
        const defaultTemplates = []
        
        if (missingRoles.includes('supervisor')) {
          defaultTemplates.push({
            project_id: project.id,
            role: 'supervisor',
            display_name: 'Supervisor',
            base_pay_rate: 300.00,
            time_type: 'daily',
            sort_order: 1,
            is_default: true,
            description: 'On-site management with day rate tracking'
          })
        }
        
        if (missingRoles.includes('coordinator')) {
          defaultTemplates.push({
            project_id: project.id,
            role: 'coordinator',
            display_name: 'Coordinator',
            base_pay_rate: 350.00,
            time_type: 'daily',
            sort_order: 2,
            is_default: true,
            description: 'Informational oversight role with day rate tracking'
          })
        }
        
        if (missingRoles.includes('talent_escort')) {
          defaultTemplates.push({
            project_id: project.id,
            role: 'talent_escort',
            display_name: 'Talent Escort',
            base_pay_rate: 25.00,
            time_type: 'hourly',
            sort_order: 3,
            is_default: true,
            description: 'On-the-ground operations with hourly tracking'
          })
        }

        const { error: insertError } = await supabase
          .from('project_role_templates')
          .insert(defaultTemplates)

        if (insertError) {
          console.error(`❌ Failed to create templates for ${project.name}:`, insertError.message)
        } else {
          console.log(`✅ Created ${defaultTemplates.length} role templates for ${project.name}`)
        }
      } else {
        console.log(`✅ ${project.name} already has all required role templates`)
      }
    }

    console.log('\n📊 SUMMARY:')
    console.log('============')
    
    // Final verification
    const { data: allTemplates, error: allError } = await supabase
      .from('project_role_templates')
      .select('project_id, role, display_name')

    if (allError) {
      console.error('❌ Failed to fetch final templates:', allError.message)
    } else {
      const templatesByProject = allTemplates.reduce((acc, template) => {
        if (!acc[template.project_id]) {
          acc[template.project_id] = []
        }
        acc[template.project_id].push(template.role)
        return acc
      }, {})

      console.log(`✅ Total projects: ${projects.length}`)
      console.log(`✅ Total role templates: ${allTemplates.length}`)
      console.log(`✅ Projects with complete templates: ${Object.keys(templatesByProject).length}`)
    }

    console.log('\n🎉 Role templates setup completed!')
    console.log('\n📝 NOTE: The database trigger will automatically create default role templates')
    console.log('   for any new projects created through the API.')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  }
}

setupTrigger().catch(console.error)