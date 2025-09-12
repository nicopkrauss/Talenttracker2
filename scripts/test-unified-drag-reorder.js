#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testUnifiedDragReorder() {
  console.log('🧪 Testing Unified Drag-to-Reorder Implementation...\n')

  try {
    // 1. Check if display_order column exists in talent_groups
    console.log('1. Checking talent_groups schema...')
    const { data: groups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('id, group_name, display_order')
      .limit(1)

    if (groupsError) {
      console.log('❌ display_order column not found in talent_groups')
      console.log('   Please run this SQL in Supabase dashboard:')
      console.log('   ALTER TABLE talent_groups ADD COLUMN display_order INT DEFAULT 0;')
      console.log('   CREATE INDEX idx_talent_groups_display_order ON talent_groups(project_id, display_order);')
      return
    }
    console.log('✅ talent_groups has display_order column')

    // 2. Get a test project with both talent and groups
    console.log('\n2. Finding test project with talent and groups...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5)

    if (projectsError || !projects || projects.length === 0) {
      console.error('❌ No projects found:', projectsError)
      return
    }

    let testProject = null
    for (const project of projects) {
      // Check if project has both talent and groups
      const [talentResult, groupResult] = await Promise.all([
        supabase
          .from('talent_project_assignments')
          .select('id')
          .eq('project_id', project.id)
          .limit(1),
        supabase
          .from('talent_groups')
          .select('id')
          .eq('project_id', project.id)
          .limit(1)
      ])

      if (talentResult.data?.length > 0 && groupResult.data?.length > 0) {
        testProject = project
        break
      }
    }

    if (!testProject) {
      console.log('❌ No project found with both talent and groups')
      console.log('   Creating test data...')
      
      // Use first project and create a test group if needed
      testProject = projects[0]
      
      const { data: existingGroups } = await supabase
        .from('talent_groups')
        .select('id')
        .eq('project_id', testProject.id)
        .limit(1)

      if (!existingGroups || existingGroups.length === 0) {
        const { error: createGroupError } = await supabase
          .from('talent_groups')
          .insert({
            project_id: testProject.id,
            group_name: 'Test Group for Reordering',
            members: [
              { name: 'Test Member 1', role: 'Actor' },
              { name: 'Test Member 2', role: 'Actress' }
            ],
            display_order: 1000
          })

        if (createGroupError) {
          console.error('❌ Failed to create test group:', createGroupError)
          return
        }
        console.log('✅ Created test group')
      }
    }

    console.log(`✅ Using project: ${testProject.name} (${testProject.id})`)

    // 3. Test the unified API endpoint
    console.log('\n3. Testing unified talent roster API...')
    const response = await fetch(`http://localhost:3001/api/projects/${testProject.id}/talent-roster`)
    
    if (!response.ok) {
      console.error(`❌ API request failed: ${response.status}`)
      const errorText = await response.text()
      console.error('Error:', errorText)
      return
    }

    const apiData = await response.json()
    console.log('✅ API request successful')

    // Check response format
    if (apiData.data && typeof apiData.data === 'object' && apiData.data.talent && apiData.data.groups) {
      console.log(`   Found ${apiData.data.talent.length} talent assignments`)
      console.log(`   Found ${apiData.data.groups.length} talent groups`)
      
      // Show sample ordering
      const allItems = [
        ...apiData.data.talent.map(t => ({ 
          id: t.id, 
          name: `${t.first_name} ${t.last_name}`, 
          type: 'talent', 
          order: t.assignment?.display_order || 0 
        })),
        ...apiData.data.groups.map(g => ({ 
          id: g.id, 
          name: g.groupName || g.group_name, 
          type: 'group', 
          order: g.displayOrder || g.display_order || 1000 
        }))
      ].sort((a, b) => a.order - b.order)

      console.log('\n   Current unified order:')
      allItems.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} (${item.type}) - order: ${item.order}`)
      })

    } else {
      console.log('⚠️  API using old format, may need frontend updates')
      console.log(`   Found ${apiData.data?.length || 0} items in old format`)
    }

    // 4. Test the reorder API endpoint
    console.log('\n4. Testing unified reorder API...')
    
    // Create test reorder data
    const testItems = [
      { id: 'test-talent-1', type: 'talent', displayOrder: 1 },
      { id: 'test-group-1', type: 'group', displayOrder: 2 },
      { id: 'test-talent-2', type: 'talent', displayOrder: 3 }
    ]

    const reorderResponse = await fetch(`http://localhost:3001/api/projects/${testProject.id}/talent-roster/reorder-unified`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: testItems })
    })

    if (reorderResponse.ok) {
      console.log('✅ Reorder API endpoint is working')
    } else {
      const errorData = await reorderResponse.json()
      console.log('⚠️  Reorder API test failed (expected with test IDs):', errorData.error)
    }

    console.log('\n🎉 Unified drag-to-reorder implementation test complete!')
    console.log('\nNext steps:')
    console.log('1. Add display_order column to talent_groups if not done')
    console.log('2. Test drag-and-drop in the frontend')
    console.log('3. Verify ordering persists after page refresh')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testUnifiedDragReorder()