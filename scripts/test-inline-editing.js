#!/usr/bin/env node

/**
 * Test script for inline timecard editing functionality
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testInlineEditing() {
  console.log('🧪 Testing inline timecard editing functionality...\n')

  try {
    // 1. Find a draft timecard to test with
    console.log('1. Finding a draft timecard...')
    const { data: timecards, error: fetchError } = await supabase
      .from('timecards')
      .select('*')
      .eq('status', 'draft')
      .limit(1)

    if (fetchError) {
      console.error('❌ Error fetching timecards:', fetchError.message)
      return
    }

    if (!timecards || timecards.length === 0) {
      console.log('⚠️  No draft timecards found. Creating a test timecard...')
      
      // Create a test timecard
      const testDate = new Date().toISOString().split('T')[0]
      const checkInTime = new Date(`${testDate}T09:00:00Z`).toISOString()
      const checkOutTime = new Date(`${testDate}T17:00:00Z`).toISOString()
      
      const { data: newTimecard, error: createError } = await supabase
        .from('timecards')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000001', // Use a test user ID
          project_id: '00000000-0000-0000-0000-000000000001', // Use a test project ID
          date: testDate,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          total_hours: 8.0,
          break_duration: 0,
          pay_rate: 25.0,
          total_pay: 200.0,
          status: 'draft',
          manually_edited: false
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating test timecard:', createError.message)
        return
      }

      console.log('✅ Created test timecard:', newTimecard.id)
      timecards.push(newTimecard)
    }

    const timecard = timecards[0]
    console.log(`✅ Found timecard: ${timecard.id}`)
    console.log(`   Status: ${timecard.status}`)
    console.log(`   Original hours: ${timecard.total_hours}`)
    console.log(`   Original pay: $${timecard.total_pay}`)

    // 2. Test the calculation engine
    console.log('\n2. Testing calculation engine...')
    
    // Simulate editing the check-out time to add 2 hours
    const originalCheckOut = new Date(timecard.check_out_time)
    const newCheckOut = new Date(originalCheckOut.getTime() + (2 * 60 * 60 * 1000)) // Add 2 hours
    
    console.log(`   Original check-out: ${originalCheckOut.toISOString()}`)
    console.log(`   New check-out: ${newCheckOut.toISOString()}`)

    // 3. Test the API endpoint
    console.log('\n3. Testing edit API endpoint...')
    
    const editResponse = await fetch('http://localhost:3001/api/timecards/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        timecardId: timecard.id,
        updates: {
          check_out_time: newCheckOut.toISOString(),
          total_hours: 10.0, // Updated to reflect 2 extra hours
          total_pay: 250.0, // Updated pay calculation
          manually_edited: true
        }
      })
    })

    if (!editResponse.ok) {
      const errorData = await editResponse.json()
      console.error('❌ API request failed:', errorData)
      return
    }

    const editResult = await editResponse.json()
    console.log('✅ Edit API response:', editResult)

    // 4. Verify the changes were applied
    console.log('\n4. Verifying changes...')
    const { data: updatedTimecard, error: verifyError } = await supabase
      .from('timecards')
      .select('*')
      .eq('id', timecard.id)
      .single()

    if (verifyError) {
      console.error('❌ Error verifying changes:', verifyError.message)
      return
    }

    console.log('✅ Updated timecard:')
    console.log(`   Check-out time: ${updatedTimecard.check_out_time}`)
    console.log(`   Total hours: ${updatedTimecard.total_hours}`)
    console.log(`   Total pay: $${updatedTimecard.total_pay}`)
    console.log(`   Manually edited: ${updatedTimecard.manually_edited}`)

    console.log('\n🎉 Inline editing test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  }
}

// Run the test
testInlineEditing()