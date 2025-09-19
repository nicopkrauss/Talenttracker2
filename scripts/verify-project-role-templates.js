#!/usr/bin/env node

/**
 * Verify Project Role Templates Script
 * Checks that all projects have the required default role templates
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

async function verifyProjectRoleTemplates() {
  console.log('🔍 Verifying project role templates...\n')
  
  try {
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('❌ Failed to fetch projects:', projectsError.message)
      return
    }

    console.log(`📋 Found ${projects.length} projects`)

    // Get all role templates
    const { data: allTemplates, error: templatesError } = await supabase
      .from('project_role_templates')
      .select('project_id, role, display_name, base_pay_rate, time_type, is_default')

    if (templatesError) {
      console.error('❌ Failed to fetch role templates:', templatesError.message)
      return
    }

    console.log(`📝 Found ${allTemplates.length} role templates total\n`)

    // Group templates by project
    const templatesByProject = allTemplates.reduce((acc, template) => {
      if (!acc[template.project_id]) {
        acc[template.project_id] = []
      }
      acc[template.project_id].push(template)
      return acc
    }, {})

    // Check each project
    const requiredRoles = ['supervisor', 'coordinator', 'talent_escort']
    let completeProjects = 0
    let incompleteProjects = 0

    console.log('📊 PROJECT ROLE TEMPLATE STATUS:')
    console.log('=================================')

    for (const project of projects) {
      const projectTemplates = templatesByProject[project.id] || []
      const projectRoles = projectTemplates.map(t => t.role)
      const missingRoles = requiredRoles.filter(role => !projectRoles.includes(role))
      const isComplete = missingRoles.length === 0

      if (isComplete) {
        completeProjects++
      } else {
        incompleteProjects++
      }

      console.log(`\n${isComplete ? '✅' : '❌'} ${project.name}`)
      console.log(`   Status: ${project.status}`)
      console.log(`   Templates: ${projectTemplates.length}/3`)
      
      if (projectTemplates.length > 0) {
        projectTemplates.forEach(template => {
          console.log(`   - ${template.display_name} (${template.role}): $${template.base_pay_rate} ${template.time_type}${template.is_default ? ' [DEFAULT]' : ''}`)
        })
      }
      
      if (missingRoles.length > 0) {
        console.log(`   Missing: ${missingRoles.join(', ')}`)
      }
    }

    console.log('\n📊 SUMMARY:')
    console.log('============')
    console.log(`✅ Complete projects: ${completeProjects}`)
    console.log(`❌ Incomplete projects: ${incompleteProjects}`)
    console.log(`📊 Total projects: ${projects.length}`)
    console.log(`📝 Total role templates: ${allTemplates.length}`)
    console.log(`📈 Completion rate: ${projects.length > 0 ? Math.round((completeProjects / projects.length) * 100) : 0}%`)

    // Show role distribution
    const roleDistribution = allTemplates.reduce((acc, template) => {
      acc[template.role] = (acc[template.role] || 0) + 1
      return acc
    }, {})

    console.log('\n📋 ROLE DISTRIBUTION:')
    console.log('=====================')
    requiredRoles.forEach(role => {
      const count = roleDistribution[role] || 0
      console.log(`${role}: ${count}/${projects.length} projects`)
    })

    // Check for default templates
    const defaultTemplates = allTemplates.filter(t => t.is_default)
    console.log(`\n⭐ Default templates: ${defaultTemplates.length}/${allTemplates.length}`)

    if (incompleteProjects > 0) {
      console.log('\n⚠️  RECOMMENDATION:')
      console.log('   Some projects are missing role templates.')
      console.log('   Run the setup script to create missing templates:')
      console.log('   node scripts/setup-role-templates-trigger.js')
    } else {
      console.log('\n🎉 All projects have complete role templates!')
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
  }
}

verifyProjectRoleTemplates().catch(console.error)