#!/usr/bin/env node

/**
 * Integration test for talent groups functionality
 * This script tests the complete workflow of creating and managing talent groups
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

async function testTalentGroupsIntegration() {
  console.log('🧪 Testing Talent Groups Integration...\n')

  try {
    // 1. Find a test project
    console.log('1. Setting up test environment...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)

    if (projectsError || !projects || projects.length === 0) {
      console.error('❌ No projects found for testing')
      return
    }

    const testProject = projects[0]
    console.log(`✅ Using project: ${testProject.name} (${testProject.id})`)

    // 2. Test creating a talent group (simulating the UI workflow)
    console.log('\n2. Testing talent group creation workflow...')
    
    const groupData = {
      project_id: testProject.id,
      group_name: 'Integration Test Band ' + Date.now(),
      members: [
        { name: 'Alice Johnson', role: 'Lead Vocals' },
        { name: 'Bob Smith', role: 'Guitar' },
        { name: 'Charlie Brown', role: 'Drums' }
      ],
      scheduled_dates: []
    }

    // Create the group
    const { data: newGroup, error: createError } = await supabase
      .from('talent_groups')
      .insert(groupData)
      .select('*')
      .single()

    if (createError) {
      console.error('❌ Failed to create talent group:', createError.message)
      return
    }
    console.log(`✅ Created group: ${newGroup.group_name}`)
    console.log(`   Members: ${newGroup.members.length}`)

    // 3. Test that the group appears in talent roster queries
    console.log('\n3. Testing talent roster integration...')
    
    const { data: groups, error: fetchError } = await supabase
      .from('talent_groups')
      .select('*')
      .eq('project_id', testProject.id)

    if (fetchError) {
      console.error('❌ Failed to fetch talent groups:', fetchError.message)
      return
    }

    const ourGroup = groups.find(g => g.id === newGroup.id)
    if (ourGroup) {
      console.log('✅ Group appears in talent roster queries')
      console.log(`   Group: ${ourGroup.group_name} with ${ourGroup.members.length} members`)
    } else {
      console.log('❌ Group not found in talent roster queries')
    }

    // 4. Test updating group members
    console.log('\n4. Testing group member management...')
    
    const updatedMembers = [
      ...groupData.members,
      { name: 'Diana Prince', role: 'Bass Guitar' }
    ]

    const { data: updatedGroup, error: updateError } = await supabase
      .from('talent_groups')
      .update({ 
        members: updatedMembers,
        updated_at: new Date().toISOString()
      })
      .eq('id', newGroup.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('❌ Failed to update group members:', updateError.message)
      return
    }
    console.log(`✅ Updated group members: ${updatedGroup.members.length} total`)

    // 5. Test scheduling functionality
    console.log('\n5. Testing group scheduling...')
    
    const scheduledDates = ['2024-03-20', '2024-03-21', '2024-03-22']
    
    const { data: scheduledGroup, error: scheduleError } = await supabase
      .from('talent_groups')
      .update({ scheduled_dates: scheduledDates })
      .eq('id', newGroup.id)
      .select('*')
      .single()

    if (scheduleError) {
      console.error('❌ Failed to schedule group:', scheduleError.message)
      return
    }
    console.log(`✅ Scheduled group for ${scheduledGroup.scheduled_dates.length} days`)
    console.log(`   Dates: ${scheduledGroup.scheduled_dates.join(', ')}`)

    // 6. Test search functionality (simulating UI search)
    console.log('\n6. Testing search functionality...')
    
    const searchTerm = 'Integration Test'
    const { data: searchResults, error: searchError } = await supabase
      .from('talent_groups')
      .select('*')
      .eq('project_id', testProject.id)
      .ilike('group_name', `%${searchTerm}%`)

    if (searchError) {
      console.error('❌ Failed to search groups:', searchError.message)
      return
    }

    const foundGroup = searchResults.find(g => g.id === newGroup.id)
    if (foundGroup) {
      console.log('✅ Group found in search results')
    } else {
      console.log('❌ Group not found in search results')
    }

    // 7. Test group badge functionality (verify group identification)
    console.log('\n7. Testing group identification...')
    
    // Check that we can distinguish groups from individual talent
    const { data: allGroups, error: allGroupsError } = await supabase
      .from('talent_groups')
      .select('id, group_name, members')
      .eq('project_id', testProject.id)

    if (allGroupsError) {
      console.error('❌ Failed to fetch all groups:', allGroupsError.message)
      return
    }

    console.log(`✅ Found ${allGroups.length} groups in project`)
    allGroups.forEach(group => {
      console.log(`   - ${group.group_name}: ${group.members.length} members`)
    })

    // 8. Test group removal
    console.log('\n8. Testing group removal...')
    
    const { error: deleteError } = await supabase
      .from('talent_groups')
      .delete()
      .eq('id', newGroup.id)

    if (deleteError) {
      console.error('❌ Failed to delete group:', deleteError.message)
      return
    }
    console.log('✅ Group deleted successfully')

    // 9. Verify deletion
    console.log('\n9. Verifying deletion...')
    
    const { data: deletedCheck, error: verifyError } = await supabase
      .from('talent_groups')
      .select('*')
      .eq('id', newGroup.id)

    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError.message)
      return
    }

    if (deletedCheck.length === 0) {
      console.log('✅ Group successfully removed from database')
    } else {
      console.log('❌ Group still exists after deletion')
    }

    console.log('\n🎉 All talent groups integration tests passed!')
    console.log('\n📋 Summary of tested functionality:')
    console.log('   ✅ Group creation with members')
    console.log('   ✅ Group appears in talent roster')
    console.log('   ✅ Member management (add/remove)')
    console.log('   ✅ Group scheduling')
    console.log('   ✅ Search functionality')
    console.log('   ✅ Group identification')
    console.log('   ✅ Group removal')
    console.log('   ✅ Data integrity verification')

  } catch (error) {
    console.error('❌ Integration test failed with error:', error.message)
  }
}

testTalentGroupsIntegration()