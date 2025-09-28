#!/usr/bin/env node

/**
 * Debug script for Desktop Rejection API Call
 * 
 * This script makes an actual API call to test the desktop rejection format
 * and see what debugging information is logged.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugDesktopRejectionAPI() {
  console.log('🧪 Debug Desktop Rejection API Call...\n')

  try {
    // Step 1: Create test user
    console.log('1. Creating test admin user...')
    const testUser = {
      email: `test-admin-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true
    })

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`)
    }

    const userId = authData.user.id
    console.log(`✅ Created test user: ${userId}`)

    // Step 2: Update user profile to admin
    console.log('2. Setting user as admin...')
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId)

    if (profileError) {
      throw new Error(`Failed to update profile: ${profileError.message}`)
    }
    console.log('✅ User set as admin')

    // Step 3: Create test project
    console.log('3. Creating test project...')
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: `Test Project ${Date.now()}`,
        status: 'active',
        created_by: userId,
        start_date: '2024-01-15',
        end_date: '2024-01-20'
      })
      .select()
      .single()

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`)
    }

    const projectId = projectData.id
    console.log(`✅ Created test project: ${projectId}`)

    // Step 4: Create test timecard
    console.log('4. Creating test timecard...')
    const { data: timecardData, error: timecardError } = await supabase
      .from('timecard_headers')
      .insert({
        user_id: userId,
        project_id: projectId,
        period_start_date: '2024-01-15',
        period_end_date: '2024-01-17',
        status: 'submitted',
        total_hours: 16.0,
        total_pay: 400.0,
        pay_rate: 25.0
      })
      .select()
      .single()

    if (timecardError) {
      throw new Error(`Failed to create timecard: ${timecardError.message}`)
    }

    const timecardId = timecardData.id
    console.log(`✅ Created test timecard: ${timecardId}`)

    // Step 5: Create daily entries
    console.log('5. Creating daily entries...')
    const dailyEntries = [
      {
        timecard_header_id: timecardId,
        work_date: '2024-01-15',
        check_in_time: '09:00:00',
        check_out_time: '17:00:00',
        break_start_time: '12:00:00',
        break_end_time: '13:00:00',
        hours_worked: 8.0,
        daily_pay: 200.0
      },
      {
        timecard_header_id: timecardId,
        work_date: '2024-01-16',
        check_in_time: '09:00:00',
        check_out_time: '17:00:00',
        break_start_time: '12:00:00',
        break_end_time: '13:00:00',
        hours_worked: 8.0,
        daily_pay: 200.0
      }
    ]

    const { error: dailyError } = await supabase
      .from('timecard_daily_entries')
      .insert(dailyEntries)

    if (dailyError) {
      throw new Error(`Failed to create daily entries: ${dailyError.message}`)
    }
    console.log('✅ Created daily entries')

    // Step 6: Get auth session for API call
    console.log('6. Getting auth session...')
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: testUser.email
    })

    if (sessionError) {
      throw new Error(`Failed to generate session: ${sessionError.message}`)
    }

    // Step 7: Make API call with desktop format
    console.log('7. Making API call with desktop format...')
    
    const desktopRejectionData = {
      timecardId: timecardId,
      updates: {
        status: 'rejected',
        // Desktop format: field IDs like "check_in_time_day_0"
        'check_in_time_day_0': '09:30:00',  // Changed from 09:00:00
        'break_start_time_day_0': '12:30:00', // Changed from 12:00:00
        'check_out_time_day_1': '17:30:00'   // Changed from 17:00:00
      },
      editComment: 'Desktop format: Times corrected during rejection'
    }

    console.log('📤 API Request Data:', JSON.stringify(desktopRejectionData, null, 2))

    // Make the API call
    const response = await fetch('http://localhost:3001/api/timecards/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-access-token=${sessionData.properties?.access_token}; sb-refresh-token=${sessionData.properties?.refresh_token}`
      },
      body: JSON.stringify(desktopRejectionData)
    })

    const responseData = await response.json()
    
    console.log('📥 API Response Status:', response.status)
    console.log('📥 API Response Data:', JSON.stringify(responseData, null, 2))

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} - ${JSON.stringify(responseData)}`)
    }

    // Step 8: Check audit log entries
    console.log('8. Checking audit log entries...')
    
    const { data: auditLogs, error: auditFetchError } = await supabase
      .from('timecard_audit_log')
      .select('*')
      .eq('timecard_id', timecardId)
      .eq('action_type', 'rejection_edit')
      .order('changed_at', { ascending: false })

    if (auditFetchError) {
      throw new Error(`Failed to fetch audit logs: ${auditFetchError.message}`)
    }

    console.log(`📋 Found ${auditLogs.length} audit log entries:`)
    auditLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.field_name}: ${log.old_value} → ${log.new_value} (${log.work_date})`)
    })

    // Step 9: Cleanup
    console.log('\n9. Cleaning up test data...')
    
    // Delete audit logs
    await supabase
      .from('timecard_audit_log')
      .delete()
      .eq('timecard_id', timecardId)

    // Delete daily entries
    await supabase
      .from('timecard_daily_entries')
      .delete()
      .eq('timecard_header_id', timecardId)

    // Delete timecard
    await supabase
      .from('timecard_headers')
      .delete()
      .eq('id', timecardId)

    // Delete project
    await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    // Delete user
    await supabase.auth.admin.deleteUser(userId)

    console.log('✅ Cleanup completed')

    // Final result
    console.log('\n' + '='.repeat(60))
    if (auditLogs.length > 0) {
      console.log('🎉 SUCCESS! Desktop rejection API call created audit log entries.')
    } else {
      console.log('❌ FAILURE! No audit log entries were created.')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
debugDesktopRejectionAPI()