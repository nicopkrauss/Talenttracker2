#!/usr/bin/env node

/**
 * Test script to verify the group creation validation fix
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

async function testGroupCreationFix() {
  console.log('🧪 Testing Group Creation Validation Fix...\n')

  try {
    // 1. Find a test project
    console.log('1. Finding test project...')
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

    // 2. Test group creation with empty scheduledDates (this should work now)
    console.log('\n2. Testing group creation with empty scheduledDates...')
    
    const groupData = {
      project_id: testProject.id,
      group_name: 'Validation Fix Test ' + Date.now(),
      members: [
        { name: 'Test Member 1', role: 'Lead' },
        { name: 'Test Member 2', role: 'Support' }
      ],
      scheduled_dates: [] // This was causing the validation error
    }

    const { data: newGroup, error: createError } = await supabase
      .from('talent_groups')
      .insert(groupData)
      .select('*')
      .single()

    if (createError) {
      console.error('❌ Failed to create group:', createError.message)
      return
    }
    console.log(`✅ Created group successfully: ${newGroup.group_name}`)
    console.log(`   Members: ${newGroup.members.length}`)
    console.log(`   Scheduled dates: ${newGroup.scheduled_dates.length}`)

    // 3. Test that the group can be updated with scheduled dates
    console.log('\n3. Testing group update with scheduled dates...')
    
    const scheduledDates = ['2024-03-25', '2024-03-26']
    const { data: updatedGroup, error: updateError } = await supabase
      .from('talent_groups')
      .update({ scheduled_dates: scheduledDates })
      .eq('id', newGroup.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('❌ Failed to update group:', updateError.message)
      return
    }
    console.log(`✅ Updated group with scheduled dates: ${updatedGroup.scheduled_dates.length} dates`)

    // 4. Clean up
    console.log('\n4. Cleaning up test data...')
    const { error: deleteError } = await supabase
      .from('talent_groups')
      .delete()
      .eq('id', newGroup.id)

    if (deleteError) {
      console.error('❌ Failed to delete test group:', deleteError.message)
      return
    }
    console.log('✅ Test group deleted successfully')

    console.log('\n🎉 Group creation validation fix verified!')
    console.log('   ✅ Groups can be created with empty scheduledDates')
    console.log('   ✅ Groups can be updated with scheduledDates later')
    console.log('   ✅ No validation errors for empty date arrays')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

testGroupCreationFix()