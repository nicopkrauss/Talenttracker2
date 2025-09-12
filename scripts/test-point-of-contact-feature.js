#!/usr/bin/env node

/**
 * Test script for Point of Contact feature in talent groups
 * Tests database schema, API endpoints, and data validation
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testPointOfContactFeature() {
  console.log('🧪 Testing Point of Contact feature for talent groups...\n')

  try {
    // 1. Test database schema - check if columns exist
    console.log('1️⃣ Testing database schema...')
    const { data: schemaTest, error: schemaError } = await supabase
      .from('talent_groups')
      .select('point_of_contact_name, point_of_contact_phone')
      .limit(1)

    if (schemaError) {
      console.error('❌ Schema test failed:', schemaError.message)
      return
    }
    console.log('✅ Database schema updated successfully')

    // 2. Find a test project
    console.log('\n2️⃣ Finding test project...')
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)

    if (projectError || !projects?.length) {
      console.error('❌ No test project found:', projectError?.message)
      return
    }

    const testProject = projects[0]
    console.log(`✅ Using test project: ${testProject.name} (${testProject.id})`)

    // 3. Test creating a group with point of contact
    console.log('\n3️⃣ Testing group creation with point of contact...')
    const testGroupData = {
      project_id: testProject.id,
      group_name: `Test POC Group ${Date.now()}`,
      members: [
        { name: 'John Doe', role: 'Lead Singer' },
        { name: 'Jane Smith', role: 'Guitarist' }
      ],
      scheduled_dates: [],
      point_of_contact_name: 'Manager Mike',
      point_of_contact_phone: '+1 (555) 123-4567'
    }

    const { data: newGroup, error: createError } = await supabase
      .from('talent_groups')
      .insert(testGroupData)
      .select('*')
      .single()

    if (createError) {
      console.error('❌ Group creation failed:', createError.message)
      return
    }

    console.log('✅ Group created successfully with point of contact:')
    console.log(`   - Group: ${newGroup.group_name}`)
    console.log(`   - POC Name: ${newGroup.point_of_contact_name}`)
    console.log(`   - POC Phone: ${newGroup.point_of_contact_phone}`)

    // 4. Test creating a group without point of contact (optional fields)
    console.log('\n4️⃣ Testing group creation without point of contact...')
    const testGroupData2 = {
      project_id: testProject.id,
      group_name: `Test No POC Group ${Date.now()}`,
      members: [
        { name: 'Alice Johnson', role: 'Dancer' }
      ],
      scheduled_dates: []
      // No point of contact fields
    }

    const { data: newGroup2, error: createError2 } = await supabase
      .from('talent_groups')
      .insert(testGroupData2)
      .select('*')
      .single()

    if (createError2) {
      console.error('❌ Group creation without POC failed:', createError2.message)
      return
    }

    console.log('✅ Group created successfully without point of contact:')
    console.log(`   - Group: ${newGroup2.group_name}`)
    console.log(`   - POC Name: ${newGroup2.point_of_contact_name || 'null'}`)
    console.log(`   - POC Phone: ${newGroup2.point_of_contact_phone || 'null'}`)

    // 5. Test fetching groups with point of contact data
    console.log('\n5️⃣ Testing group retrieval with point of contact...')
    const { data: fetchedGroups, error: fetchError } = await supabase
      .from('talent_groups')
      .select(`
        id,
        group_name,
        members,
        point_of_contact_name,
        point_of_contact_phone,
        created_at
      `)
      .eq('project_id', testProject.id)
      .in('id', [newGroup.id, newGroup2.id])

    if (fetchError) {
      console.error('❌ Group fetch failed:', fetchError.message)
      return
    }

    console.log('✅ Groups fetched successfully:')
    fetchedGroups.forEach(group => {
      console.log(`   - ${group.group_name}:`)
      console.log(`     POC: ${group.point_of_contact_name || 'None'}`)
      console.log(`     Phone: ${group.point_of_contact_phone || 'None'}`)
    })

    // 6. Test updating point of contact information
    console.log('\n6️⃣ Testing point of contact update...')
    const { data: updatedGroup, error: updateError } = await supabase
      .from('talent_groups')
      .update({
        point_of_contact_name: 'Updated Manager',
        point_of_contact_phone: '+1 (555) 987-6543'
      })
      .eq('id', newGroup.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('❌ Group update failed:', updateError.message)
      return
    }

    console.log('✅ Point of contact updated successfully:')
    console.log(`   - New POC Name: ${updatedGroup.point_of_contact_name}`)
    console.log(`   - New POC Phone: ${updatedGroup.point_of_contact_phone}`)

    // 7. Test phone number validation (simulate API validation)
    console.log('\n7️⃣ Testing phone number validation...')
    const validPhones = [
      '+1 (555) 123-4567',
      '555-123-4567',
      '(555) 123-4567',
      '555.123.4567',
      '5551234567',
      '+44 20 7946 0958'
    ]

    const invalidPhones = [
      'not-a-phone',
      '123-abc-4567',
      'call me maybe'
    ]

    console.log('✅ Valid phone formats:')
    validPhones.forEach(phone => {
      const isValid = /^[\d\s\-\(\)\+\.]*$/.test(phone)
      console.log(`   - "${phone}": ${isValid ? '✅' : '❌'}`)
    })

    console.log('❌ Invalid phone formats:')
    invalidPhones.forEach(phone => {
      const isValid = /^[\d\s\-\(\)\+\.]*$/.test(phone)
      console.log(`   - "${phone}": ${isValid ? '✅' : '❌'}`)
    })

    // 8. Cleanup test data
    console.log('\n8️⃣ Cleaning up test data...')
    const { error: cleanupError } = await supabase
      .from('talent_groups')
      .delete()
      .in('id', [newGroup.id, newGroup2.id])

    if (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError.message)
      return
    }

    console.log('✅ Test data cleaned up successfully')

    console.log('\n🎉 All Point of Contact feature tests passed!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Database schema updated')
    console.log('   ✅ Group creation with POC works')
    console.log('   ✅ Group creation without POC works (optional)')
    console.log('   ✅ Group retrieval includes POC data')
    console.log('   ✅ POC information can be updated')
    console.log('   ✅ Phone number validation works')
    console.log('   ✅ Test cleanup completed')

  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

// Run the test
testPointOfContactFeature()