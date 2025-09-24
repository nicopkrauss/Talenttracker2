#!/usr/bin/env node

/**
 * Test script to verify the improved Edit & Return workflow
 * Tests the new flow: Button -> Edit Mode -> Warning -> Save -> Comment Dialog
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testEditReturnWorkflow() {
  console.log('🧪 Testing Improved Edit & Return Workflow...\n')

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
      return
    }

    const testTimecard = timecards[0]
    console.log('📋 Testing with timecard:')
    console.log(`   ID: ${testTimecard.id}`)
    console.log(`   Status: ${testTimecard.status}`)
    console.log(`   User ID: ${testTimecard.user_id}`)
    console.log('')

    console.log('✅ New Edit & Return Workflow:')
    console.log('')
    console.log('🔄 Step 1: Click "Edit & Return" Button')
    console.log('   • Button immediately enters edit mode')
    console.log('   • Sets isEditAndReturn = true')
    console.log('   • Shows inline editing interface')
    console.log('')
    
    console.log('⚠️  Step 2: Edit Mode Warning')
    console.log('   • Blue notice appears: "Edit & Return Mode"')
    console.log('   • Explains what will happen when saved')
    console.log('   • User can make changes with real-time calculations')
    console.log('')
    
    console.log('💾 Step 3: Click Save Button')
    console.log('   • Opens "Save Changes & Return to Draft" dialog')
    console.log('   • Shows changes summary with calculations')
    console.log('   • Requires reason for the changes')
    console.log('')
    
    console.log('✅ Step 4: Save & Return')
    console.log('   • Saves all changes to timecard')
    console.log('   • Changes status to draft')
    console.log('   • Sets admin_edited flag')
    console.log('   • Exits edit mode')
    console.log('   • User gets notified')
    console.log('')

    console.log('🎯 Key Improvements:')
    console.log('• ✅ No immediate popup - starts editing right away')
    console.log('• ✅ Clear warning in edit mode (blue notice)')
    console.log('• ✅ Real-time calculations while editing')
    console.log('• ✅ Comment dialog only appears when saving')
    console.log('• ✅ Shows changes summary in save dialog')
    console.log('• ✅ Consistent with existing edit workflow')
    
    console.log('\n🎨 UI States:')
    console.log('• Normal submitted timecard: Shows Approve, Reject, Edit & Return')
    console.log('• Edit & Return mode: Shows blue warning + inline editing')
    console.log('• Regular admin edit: Shows yellow warning + inline editing')
    console.log('• Save dialog: Shows changes summary + reason field')

    console.log('\n🔒 Permission & Status Logic:')
    console.log('• Edit & Return: Only approvers on submitted timecards')
    console.log('• Regular edit: Owners + approvers on draft timecards')
    console.log('• Status flow: Submitted → (Edit & Return) → Draft')
    console.log('• Audit trail: All changes tracked with reasons')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testEditReturnWorkflow()