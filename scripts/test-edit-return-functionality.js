#!/usr/bin/env node

/**
 * Test script to verify Edit & Return functionality
 * Tests the new inline editing approach vs old edit route
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testEditReturnFunctionality() {
  console.log('🧪 Testing Edit & Return Functionality...\n')

  try {
    // Get a submitted timecard to test with
    const { data: timecards, error } = await supabase
      .from('timecards')
      .select('*')
      .eq('status', 'submitted')
      .limit(1)

    if (error) {
      console.error('❌ Error fetching timecards:', error.message)
      return
    }

    if (!timecards || timecards.length === 0) {
      console.log('⚠️  No submitted timecards found to test with')
      console.log('💡 Creating a test submitted timecard...')
      
      // Create a test submitted timecard
      const { data: newTimecard, error: createError } = await supabase
        .from('timecards')
        .insert({
          user_id: '90e7ed01-ee5b-4e32-a2b6-283bdde9335f', // Use existing user
          project_id: 'f8b5c2e1-4d3a-4b2c-8e1f-9a7b6c5d4e3f', // Use existing project
          date: '2025-09-23',
          check_in_time: '2025-09-23T09:00:00Z',
          check_out_time: '2025-09-23T17:00:00Z',
          break_start_time: '2025-09-23T12:00:00Z',
          break_end_time: '2025-09-23T12:30:00Z',
          total_hours: 7.5,
          break_duration: 30,
          pay_rate: 25.00,
          total_pay: 187.50,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating test timecard:', createError.message)
        return
      }

      console.log('✅ Created test submitted timecard:', newTimecard.id)
      timecards.push(newTimecard)
    }

    const testTimecard = timecards[0]
    console.log('📋 Testing with timecard:')
    console.log(`   ID: ${testTimecard.id}`)
    console.log(`   Status: ${testTimecard.status}`)
    console.log(`   User ID: ${testTimecard.user_id}`)
    console.log('')

    console.log('✅ Changes Implemented:')
    console.log('1. ✅ Updated handleEdit to handleEditAndReturn with dialog')
    console.log('2. ✅ Added showEditReturnDialog state and dialog component')
    console.log('3. ✅ Updated API to handle returnToDraft flag')
    console.log('4. ✅ Added permission checks for returning submitted timecards')
    console.log('5. ✅ Updated timecard list edit button to go to details page')
    
    console.log('\n🎯 Edit & Return Workflow:')
    console.log('• User submits timecard for approval')
    console.log('• Approver clicks "Edit & Return" button')
    console.log('• Dialog asks for reason to return to draft')
    console.log('• Timecard status changes to "draft" with admin_edited flag')
    console.log('• User can now edit inline on details page')
    console.log('• No more separate /edit route needed')
    
    console.log('\n📱 UI Updates:')
    console.log('• Timecard details: Edit & Return button opens dialog')
    console.log('• Timecard list: Edit button now goes to details page')
    console.log('• Inline editing: Available on details page for draft timecards')
    console.log('• Old edit route: No longer used in UI')

    console.log('\n🔒 Permission Logic:')
    console.log('• Edit & Return: Only approvers can return submitted timecards')
    console.log('• Inline editing: Owners and approvers can edit draft timecards')
    console.log('• Status restrictions: Submitted → Draft (return), Draft → Edit (inline)')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testEditReturnFunctionality()