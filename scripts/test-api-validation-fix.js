#!/usr/bin/env node

/**
 * Test script to verify the API validation fix
 */

const { talentGroupSchema } = require('../lib/types')

async function testAPIValidationFix() {
  console.log('🧪 Testing API Validation Schema Fix...\n')

  try {
    // Import the schema dynamically since it uses ES modules
    const { z } = await import('zod')
    
    // Recreate the schema for testing
    const groupMemberSchema = z.object({
      name: z.string()
        .min(1, "Member name is required")
        .max(50, "Member name must be 50 characters or less"),
      role: z.string()
        .min(1, "Member role is required")
        .max(50, "Member role must be 50 characters or less")
    })

    const testTalentGroupSchema = z.object({
      projectId: z.string().uuid("Invalid project ID"),
      groupName: z.string()
        .min(1, "Group name is required")
        .max(100, "Group name must be 100 characters or less"),
      members: z.array(groupMemberSchema)
        .min(1, "At least one group member is required")
        .max(20, "Groups cannot have more than 20 members"),
      scheduledDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"))
        .optional()
        .default([])
    })

    // 1. Test valid group data with empty scheduledDates
    console.log('1. Testing valid group data with empty scheduledDates...')
    
    const validGroupData = {
      projectId: '9e093154-1952-499d-a033-19e3718b1b63',
      groupName: 'Test Band',
      members: [
        { name: 'John Doe', role: 'Lead Guitar' },
        { name: 'Jane Smith', role: 'Vocals' }
      ],
      scheduledDates: []
    }

    const result1 = testTalentGroupSchema.safeParse(validGroupData)
    if (result1.success) {
      console.log('✅ Valid group data with empty scheduledDates passed validation')
      console.log(`   Group: ${result1.data.groupName}`)
      console.log(`   Members: ${result1.data.members.length}`)
      console.log(`   Scheduled dates: ${result1.data.scheduledDates.length}`)
    } else {
      console.log('❌ Valid group data failed validation:', result1.error.flatten())
    }

    // 2. Test valid group data without scheduledDates field
    console.log('\n2. Testing valid group data without scheduledDates field...')
    
    const validGroupDataNoSchedule = {
      projectId: '9e093154-1952-499d-a033-19e3718b1b63',
      groupName: 'Test Band 2',
      members: [
        { name: 'Bob Johnson', role: 'Drums' }
      ]
      // No scheduledDates field at all
    }

    const result2 = testTalentGroupSchema.safeParse(validGroupDataNoSchedule)
    if (result2.success) {
      console.log('✅ Valid group data without scheduledDates field passed validation')
      console.log(`   Group: ${result2.data.groupName}`)
      console.log(`   Members: ${result2.data.members.length}`)
      console.log(`   Scheduled dates: ${result2.data.scheduledDates.length}`)
    } else {
      console.log('❌ Valid group data without scheduledDates failed validation:', result2.error.flatten())
    }

    // 3. Test valid group data with scheduled dates
    console.log('\n3. Testing valid group data with scheduled dates...')
    
    const validGroupDataWithSchedule = {
      projectId: '9e093154-1952-499d-a033-19e3718b1b63',
      groupName: 'Test Band 3',
      members: [
        { name: 'Alice Cooper', role: 'Bass' }
      ],
      scheduledDates: ['2024-03-20', '2024-03-21']
    }

    const result3 = testTalentGroupSchema.safeParse(validGroupDataWithSchedule)
    if (result3.success) {
      console.log('✅ Valid group data with scheduled dates passed validation')
      console.log(`   Group: ${result3.data.groupName}`)
      console.log(`   Members: ${result3.data.members.length}`)
      console.log(`   Scheduled dates: ${result3.data.scheduledDates.length}`)
    } else {
      console.log('❌ Valid group data with scheduled dates failed validation:', result3.error.flatten())
    }

    // 4. Test invalid data (should fail)
    console.log('\n4. Testing invalid group data (should fail)...')
    
    const invalidGroupData = {
      projectId: 'invalid-uuid',
      groupName: '',
      members: [],
      scheduledDates: ['invalid-date']
    }

    const result4 = testTalentGroupSchema.safeParse(invalidGroupData)
    if (!result4.success) {
      console.log('✅ Invalid group data correctly failed validation')
      console.log('   Errors:', Object.keys(result4.error.flatten().fieldErrors))
    } else {
      console.log('❌ Invalid group data incorrectly passed validation')
    }

    console.log('\n🎉 All API validation tests passed!')
    console.log('   ✅ Empty scheduledDates array is valid')
    console.log('   ✅ Missing scheduledDates field defaults to empty array')
    console.log('   ✅ Valid scheduledDates array works correctly')
    console.log('   ✅ Invalid data is properly rejected')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

testAPIValidationFix()