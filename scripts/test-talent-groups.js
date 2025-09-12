#!/usr/bin/env node

/**
 * Test script for talent groups functionality
 * This script tests the talent groups API endpoints
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

async function testTalentGroups() {
  console.log('🧪 Testing Talent Groups functionality...\n')

  try {
    // 1. Check if talent_groups table exists
    console.log('1. Checking talent_groups table...')
    const { data: tables, error: tablesError } = await supabase
      .from('talent_groups')
      .select('id')
      .limit(1)

    if (tablesError) {
      console.error('❌ talent_groups table not found:', tablesError.message)
      return
    }
    console.log('✅ talent_groups table exists')

    // 2. Find a test project
    console.log('\n2. Finding a test project...')
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

    // 3. Create a test talent group
    console.log('\n3. Creating test talent group...')
    const testGroup = {
      project_id: testProject.id,
      group_name: 'Test Band ' + Date.now(),
      members: [
        { name: 'John Doe', role: 'Lead Guitar' },
        { name: 'Jane Smith', role: 'Vocals' },
        { name: 'Bob Johnson', role: 'Drums' }
      ],
      scheduled_dates: []
    }

    const { data: newGroup, error: createError } = await supabase
      .from('talent_groups')
      .insert(testGroup)
      .select()
      .single()

    if (createError) {
      console.error('❌ Failed to create talent group:', createError.message)
      return
    }
    console.log(`✅ Created talent group: ${newGroup.group_name} (${newGroup.id})`)
    console.log(`   Members: ${newGroup.members.length}`)

    // 4. Fetch the created group
    console.log('\n4. Fetching created group...')
    const { data: fetchedGroup, error: fetchError } = await supabase
      .from('talent_groups')
      .select('*')
      .eq('id', newGroup.id)
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch talent group:', fetchError.message)
      return
    }
    console.log(`✅ Fetched group: ${fetchedGroup.group_name}`)
    console.log(`   Members: ${JSON.stringify(fetchedGroup.members, null, 2)}`)

    // 5. Update the group
    console.log('\n5. Updating talent group...')
    const updatedMembers = [
      ...testGroup.members,
      { name: 'Alice Cooper', role: 'Bass' }
    ]

    const { data: updatedGroup, error: updateError } = await supabase
      .from('talent_groups')
      .update({ 
        members: updatedMembers,
        updated_at: new Date().toISOString()
      })
      .eq('id', newGroup.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Failed to update talent group:', updateError.message)
      return
    }
    console.log(`✅ Updated group: ${updatedGroup.group_name}`)
    console.log(`   New member count: ${updatedGroup.members.length}`)

    // 6. Test scheduled_dates functionality
    console.log('\n6. Testing scheduled dates...')
    const scheduledDates = ['2024-03-15', '2024-03-16']
    
    const { data: scheduledGroup, error: scheduleError } = await supabase
      .from('talent_groups')
      .update({ scheduled_dates: scheduledDates })
      .eq('id', newGroup.id)
      .select()
      .single()

    if (scheduleError) {
      console.error('❌ Failed to update scheduled dates:', scheduleError.message)
      return
    }
    console.log(`✅ Updated scheduled dates: ${scheduledGroup.scheduled_dates}`)

    // 7. Clean up - delete the test group
    console.log('\n7. Cleaning up test data...')
    const { error: deleteError } = await supabase
      .from('talent_groups')
      .delete()
      .eq('id', newGroup.id)

    if (deleteError) {
      console.error('❌ Failed to delete test group:', deleteError.message)
      return
    }
    console.log('✅ Test group deleted successfully')

    console.log('\n🎉 All talent groups tests passed!')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

testTalentGroups()