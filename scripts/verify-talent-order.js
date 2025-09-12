#!/usr/bin/env node

/**
 * Quick verification that talent order changes are working
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyTalentOrder() {
  console.log('🔄 Verifying talent assignment order...\n')

  try {
    // Find a project with talent assignments
    const { data: projectsWithTalent, error: projectsError } = await supabase
      .from('talent_project_assignments')
      .select('project_id, projects(id, name)')
      .limit(1)
      .single()

    if (projectsError || !projectsWithTalent) {
      console.log('❌ No projects with talent assignments found')
      return
    }

    const projects = projectsWithTalent.projects
    console.log(`📋 Testing project: ${projects.name} (${projects.id})`)

    // Test database query with descending order
    const { data: assignments, error: assignmentsError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        display_order,
        talent:talent_id (
          first_name,
          last_name
        )
      `)
      .eq('project_id', projects.id)
      .order('display_order', { ascending: false })

    if (assignmentsError) {
      console.log('❌ Database query failed:', assignmentsError)
      return
    }

    console.log('✅ Database query successful')
    
    if (assignments && assignments.length > 0) {
      console.log(`   Found ${assignments.length} talent assignments`)
      
      console.log('\n📊 Current order (should be descending):')
      assignments.slice(0, 5).forEach((assignment, index) => {
        const name = assignment.talent ? 
          `${assignment.talent.first_name} ${assignment.talent.last_name}` : 
          'Unknown'
        console.log(`   ${index + 1}. ${name} (display_order: ${assignment.display_order})`)
      })
      
      // Verify descending order
      let isDescending = true
      for (let i = 1; i < assignments.length; i++) {
        const prevOrder = assignments[i-1].display_order || 0
        const currOrder = assignments[i].display_order || 0
        if (currOrder > prevOrder) {
          isDescending = false
          break
        }
      }
      
      if (isDescending) {
        console.log('\n✅ Order is correctly descending (newest at top)')
      } else {
        console.log('\n❌ Order is NOT descending')
      }
      
      // Show what the highest display_order is
      const maxOrder = Math.max(...assignments.map(a => a.display_order || 0))
      console.log(`\n📈 Highest display_order: ${maxOrder}`)
      console.log(`   Next new talent will get: ${maxOrder + 1}`)
      
    } else {
      console.log('   No talent assignments found')
    }

  } catch (error) {
    console.error('❌ Verification failed:', error)
  }
}

// Run the verification
verifyTalentOrder()