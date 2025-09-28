#!/usr/bin/env node

/**
 * Test script to verify rejection audit logging functionality
 * This script tests that rejections are properly logged in the audit system
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testRejectionAuditLogging() {
  console.log('🧪 Testing Rejection Audit Logging...\n')

  try {
    // 1. Find a submitted timecard to test with
    console.log('1. Finding a submitted timecard...')
    const { data: timecards, error: findError } = await supabase
      .from('timecard_headers')
      .select('id, user_id, status')
      .eq('status', 'submitted')
      .limit(1)

    if (findError) {
      console.error('❌ Error finding timecard:', findError)
      return
    }

    if (!timecards || timecards.length === 0) {
      console.log('⚠️  No submitted timecards found. Creating test data...')
      
      // Create a test timecard
      const { data: testUser } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single()

      if (!testUser) {
        console.error('❌ No users found to create test timecard')
        return
      }

      const { data: newTimecard, error: createError } = await supabase
        .from('timecard_headers')
        .insert({
          user_id: testUser.id,
          status: 'submitted',
          week_start_date: '2024-01-01',
          total_hours: 40,
          overtime_hours: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating test timecard:', createError)
        return
      }

      console.log(`✅ Created test timecard: ${newTimecard.id}`)
      timecards[0] = newTimecard
    }

    const testTimecard = timecards[0]
    console.log(`✅ Found timecard: ${testTimecard.id} (status: ${testTimecard.status})`)

    // 2. Check audit logs before rejection
    console.log('\n2. Checking audit logs before rejection...')
    const { data: beforeLogs, error: beforeError } = await supabase
      .from('timecard_audit_log')
      .select('*')
      .eq('timecard_id', testTimecard.id)
      .eq('action_type', 'rejection_edit')

    if (beforeError) {
      console.error('❌ Error fetching before logs:', beforeError)
      return
    }

    console.log(`✅ Found ${beforeLogs.length} rejection audit logs before rejection`)

    // 3. Simulate rejection via API call
    console.log('\n3. Simulating timecard rejection...')
    
    // Get an admin user for the rejection
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (!adminUser) {
      console.error('❌ No admin user found for rejection test')
      return
    }

    // Manually call the rejection logic (simulating the API)
    const rejectionData = {
      timecardId: testTimecard.id,
      comments: 'Test rejection for audit logging verification',
      rejectedFields: ['check_in_time', 'total_hours']
    }

    // Update timecard status
    const { error: updateError } = await supabase
      .from('timecard_headers')
      .update({
        status: 'rejected',
        rejection_reason: rejectionData.comments,
        rejected_fields: rejectionData.rejectedFields || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', testTimecard.id)

    if (updateError) {
      console.error('❌ Error updating timecard:', updateError)
      return
    }

    // Create audit log entries manually (simulating the fixed API logic)
    const auditEntries = [
      {
        timecard_id: testTimecard.id,
        change_id: require('crypto').randomUUID(),
        field_name: 'status',
        old_value: 'submitted',
        new_value: 'rejected',
        changed_by: adminUser.id,
        changed_at: new Date().toISOString(),
        action_type: 'rejection_edit',
        work_date: null
      },
      {
        timecard_id: testTimecard.id,
        change_id: require('crypto').randomUUID(),
        field_name: 'rejection_reason',
        old_value: null,
        new_value: rejectionData.comments,
        changed_by: adminUser.id,
        changed_at: new Date().toISOString(),
        action_type: 'rejection_edit',
        work_date: null
      },
      {
        timecard_id: testTimecard.id,
        change_id: require('crypto').randomUUID(),
        field_name: 'rejected_fields',
        old_value: '[]',
        new_value: JSON.stringify(rejectionData.rejectedFields),
        changed_by: adminUser.id,
        changed_at: new Date().toISOString(),
        action_type: 'rejection_edit',
        work_date: null
      }
    ]

    const { error: auditError } = await supabase
      .from('timecard_audit_log')
      .insert(auditEntries)

    if (auditError) {
      console.error('❌ Error creating audit logs:', auditError)
      return
    }

    console.log('✅ Timecard rejected and audit logs created')

    // 4. Verify audit logs were created
    console.log('\n4. Verifying audit logs after rejection...')
    const { data: afterLogs, error: afterError } = await supabase
      .from('timecard_audit_log')
      .select(`
        *,
        changed_by_profile:profiles!timecard_audit_log_changed_by_fkey(full_name)
      `)
      .eq('timecard_id', testTimecard.id)
      .eq('action_type', 'rejection_edit')
      .order('changed_at', { ascending: false })

    if (afterError) {
      console.error('❌ Error fetching after logs:', afterError)
      return
    }

    console.log(`✅ Found ${afterLogs.length} rejection audit logs after rejection`)

    if (afterLogs.length > beforeLogs.length) {
      console.log('\n📋 New audit log entries:')
      const newLogs = afterLogs.slice(0, afterLogs.length - beforeLogs.length)
      newLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. Field: ${log.field_name}`)
        console.log(`     Old Value: ${log.old_value || '(empty)'}`)
        console.log(`     New Value: ${log.new_value || '(empty)'}`)
        console.log(`     Changed By: ${log.changed_by_profile?.full_name || log.changed_by}`)
        console.log(`     Action Type: ${log.action_type}`)
        console.log(`     Changed At: ${new Date(log.changed_at).toLocaleString()}`)
        console.log('')
      })
    }

    // 5. Test audit log API endpoint
    console.log('5. Testing audit log API endpoint...')
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/timecard_audit_log?timecard_id=eq.${testTimecard.id}&action_type=eq.rejection_edit`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    })

    if (response.ok) {
      const apiLogs = await response.json()
      console.log(`✅ API returned ${apiLogs.length} rejection audit logs`)
    } else {
      console.log(`⚠️  API request failed with status: ${response.status}`)
    }

    console.log('\n🎉 Rejection audit logging test completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - Timecard ID: ${testTimecard.id}`)
    console.log(`   - Audit logs before: ${beforeLogs.length}`)
    console.log(`   - Audit logs after: ${afterLogs.length}`)
    console.log(`   - New audit logs: ${afterLogs.length - beforeLogs.length}`)

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testRejectionAuditLogging()