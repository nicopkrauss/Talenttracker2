#!/usr/bin/env node

/**
 * Initialize display_order for existing talent assignments
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

async function initializeDisplayOrder() {
  console.log('🔄 Initializing display_order for existing talent assignments...\n')

  try {
    // Get all projects with talent assignments that have null display_order
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        talent_project_assignments!inner(
          id,
          talent_id,
          display_order,
          created_at,
          talent(first_name, last_name)
        )
      `)
      .is('talent_project_assignments.display_order', null)

    if (projectError) {
      console.error('❌ Error fetching projects:', projectError.message)
      return
    }

    if (projects.length === 0) {
      console.log('✅ All talent assignments already have display_order values')
      return
    }

    console.log(`📋 Found ${projects.length} projects with assignments needing display_order`)

    let totalUpdated = 0

    for (const project of projects) {
      console.log(`\n📁 Processing project: ${project.name}`)
      
      // Sort assignments by created_at to maintain existing order
      const assignments = project.talent_project_assignments.sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      )

      console.log(`   Found ${assignments.length} assignments to update`)

      // Update each assignment with sequential display_order
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i]
        const displayOrder = i + 1

        const { error: updateError } = await supabase
          .from('talent_project_assignments')
          .update({ 
            display_order: displayOrder,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignment.id)

        if (updateError) {
          console.error(`   ❌ Error updating assignment ${assignment.id}:`, updateError.message)
        } else {
          const talent = assignment.talent
          console.log(`   ✅ ${talent.first_name} ${talent.last_name} → order ${displayOrder}`)
          totalUpdated++
        }
      }
    }

    console.log(`\n🎉 Successfully updated ${totalUpdated} talent assignments with display_order values`)

    // Verify the updates
    console.log('\n🔍 Verifying updates...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('talent_project_assignments')
      .select('id, display_order')
      .is('display_order', null)

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError.message)
    } else {
      if (verifyData.length === 0) {
        console.log('✅ All assignments now have display_order values')
      } else {
        console.log(`⚠️  ${verifyData.length} assignments still have null display_order`)
      }
    }

  } catch (error) {
    console.error('❌ Initialization failed:', error.message)
  }
}

initializeDisplayOrder()