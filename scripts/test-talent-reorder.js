#!/usr/bin/env node

/**
 * Test script for talent reorder functionality
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

async function testTalentReorder() {
  console.log('🧪 Testing talent reorder functionality...\n')

  try {
    // 1. Check if display_order column exists
    console.log('1. Checking display_order column...')
    const { data: assignments, error: fetchError } = await supabase
      .from('talent_project_assignments')
      .select('id, talent_id, project_id, display_order')
      .limit(5)

    if (fetchError) {
      console.error('❌ Error fetching assignments:', fetchError.message)
      return
    }

    console.log('✅ display_order column exists')
    console.log(`   Found ${assignments.length} assignments`)
    
    if (assignments.length > 0) {
      console.log('   Sample assignment:', {
        id: assignments[0].id,
        display_order: assignments[0].display_order
      })
    }

    // 2. Check if we have any projects with talent assignments
    console.log('\n2. Finding projects with talent assignments...')
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        talent_project_assignments(
          id,
          talent_id,
          display_order,
          talent(first_name, last_name)
        )
      `)
      .not('talent_project_assignments', 'is', null)
      .limit(3)

    if (projectError) {
      console.error('❌ Error fetching projects:', projectError.message)
      return
    }

    if (projects.length === 0) {
      console.log('⚠️  No projects with talent assignments found')
      return
    }

    console.log(`✅ Found ${projects.length} projects with talent assignments`)
    
    // 3. Test reorder API endpoint structure
    console.log('\n3. Checking reorder API endpoint...')
    const reorderApiPath = path.join(__dirname, '..', 'app', 'api', 'projects', '[id]', 'talent-roster', 'reorder', 'route.ts')
    
    if (fs.existsSync(reorderApiPath)) {
      console.log('✅ Reorder API endpoint exists')
      
      const apiContent = fs.readFileSync(reorderApiPath, 'utf8')
      if (apiContent.includes('display_order') && apiContent.includes('talentIds')) {
        console.log('✅ API endpoint has correct structure')
      } else {
        console.log('⚠️  API endpoint may be missing required functionality')
      }
    } else {
      console.log('❌ Reorder API endpoint not found')
    }

    // 4. Check draggable component
    console.log('\n4. Checking draggable component...')
    const draggableComponentPath = path.join(__dirname, '..', 'components', 'projects', 'draggable-talent-list.tsx')
    
    if (fs.existsSync(draggableComponentPath)) {
      console.log('✅ Draggable talent list component exists')
      
      const componentContent = fs.readFileSync(draggableComponentPath, 'utf8')
      if (componentContent.includes('@dnd-kit') && componentContent.includes('DndContext')) {
        console.log('✅ Component uses @dnd-kit library')
      } else {
        console.log('⚠️  Component may be missing drag-and-drop functionality')
      }
    } else {
      console.log('❌ Draggable talent list component not found')
    }

    // 5. Check if talent roster tab uses the draggable component
    console.log('\n5. Checking talent roster tab integration...')
    const talentRosterTabPath = path.join(__dirname, '..', 'components', 'projects', 'tabs', 'talent-roster-tab.tsx')
    
    if (fs.existsSync(talentRosterTabPath)) {
      const tabContent = fs.readFileSync(talentRosterTabPath, 'utf8')
      if (tabContent.includes('DraggableTalentList')) {
        console.log('✅ Talent roster tab uses draggable component')
      } else {
        console.log('⚠️  Talent roster tab may not be using draggable component')
      }
    } else {
      console.log('❌ Talent roster tab not found')
    }

    // 6. Show sample project data for testing
    if (projects.length > 0) {
      const sampleProject = projects[0]
      console.log('\n6. Sample project for testing:')
      console.log(`   Project: ${sampleProject.name} (ID: ${sampleProject.id})`)
      console.log(`   Talent assignments: ${sampleProject.talent_project_assignments.length}`)
      
      sampleProject.talent_project_assignments.forEach((assignment, index) => {
        const talent = assignment.talent
        console.log(`   ${index + 1}. ${talent.first_name} ${talent.last_name} (Order: ${assignment.display_order || 'null'})`)
      })
      
      console.log('\n   You can test drag-to-reorder by:')
      console.log(`   1. Navigate to /projects/${sampleProject.id}`)
      console.log('   2. Go to the Talent Roster tab')
      console.log('   3. Try dragging talent entries to reorder them')
    }

    console.log('\n✅ Talent reorder functionality test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testTalentReorder()