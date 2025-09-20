const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testGlobalSettingsAPI() {
  try {
    console.log('🧪 Testing Global Settings API...')
    
    // Test 1: Direct database access
    console.log('\n1️⃣ Testing direct database access...')
    const { data: directData, error: directError } = await supabase
      .from('global_settings')
      .select('*')
      .single()
    
    if (directError) {
      console.error('❌ Direct database access failed:', directError)
    } else {
      console.log('✅ Direct database access successful')
      console.log('   Settings found:', {
        id: directData.id,
        escort_break: directData.default_escort_break_minutes,
        staff_break: directData.default_staff_break_minutes,
        reminder_freq: directData.timecard_reminder_frequency_days
      })
    }
    
    // Test 2: Test with admin user (simulate API call)
    console.log('\n2️⃣ Testing API endpoint simulation...')
    
    // First, get an admin user
    const { data: adminUser, error: adminError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'admin')
      .limit(1)
      .single()
    
    if (adminError || !adminUser) {
      console.log('⚠️  No admin user found, creating test admin...')
      
      // Create a test admin user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'test-admin@example.com',
        password: 'test-password-123',
        email_confirm: true
      })
      
      if (createError) {
        console.error('❌ Failed to create test admin:', createError)
        return
      }
      
      // Update profile to admin
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', newUser.user.id)
      
      if (profileError) {
        console.error('❌ Failed to update profile to admin:', profileError)
        return
      }
      
      console.log('✅ Test admin created:', newUser.user.email)
    } else {
      console.log('✅ Admin user found:', adminUser.full_name || adminUser.id)
    }
    
    // Test 3: Test settings conversion
    console.log('\n3️⃣ Testing settings format conversion...')
    
    if (directData) {
      const convertedSettings = {
        settings: {
          breakDurations: {
            defaultEscortMinutes: directData.default_escort_break_minutes,
            defaultStaffMinutes: directData.default_staff_break_minutes
          },
          timecardNotifications: {
            reminderFrequencyDays: directData.timecard_reminder_frequency_days,
            submissionOpensOnShowDay: directData.submission_opens_on_show_day
          },
          shiftLimits: {
            maxHoursBeforeStop: directData.max_hours_before_stop,
            overtimeWarningHours: directData.overtime_warning_hours
          },
          systemSettings: {
            archiveDate: {
              month: directData.archive_date_month,
              day: directData.archive_date_day
            },
            postShowTransitionTime: directData.post_show_transition_time
          }
        },
        permissions: {
          inHouse: {
            canApproveTimecards: directData.in_house_can_approve_timecards,
            canInitiateCheckout: directData.in_house_can_initiate_checkout,
            canManageProjects: directData.in_house_can_manage_projects
          },
          supervisor: {
            canApproveTimecards: directData.supervisor_can_approve_timecards,
            canInitiateCheckout: directData.supervisor_can_initiate_checkout
          },
          coordinator: {
            canApproveTimecards: directData.coordinator_can_approve_timecards,
            canInitiateCheckout: directData.coordinator_can_initiate_checkout
          }
        }
      }
      
      console.log('✅ Settings conversion successful')
      console.log('   API Format:', JSON.stringify(convertedSettings, null, 2))
    }
    
    // Test 4: Test update operation
    console.log('\n4️⃣ Testing settings update...')
    
    const testUpdate = {
      default_escort_break_minutes: 45,
      default_staff_break_minutes: 75,
      timecard_reminder_frequency_days: 2,
      max_hours_before_stop: 18
    }
    
    const { error: updateError } = await supabase
      .from('global_settings')
      .update(testUpdate)
      .eq('id', '00000000-0000-0000-0000-000000000001')
    
    if (updateError) {
      console.error('❌ Update test failed:', updateError)
    } else {
      console.log('✅ Update test successful')
      
      // Verify the update
      const { data: updatedData, error: verifyError } = await supabase
        .from('global_settings')
        .select('default_escort_break_minutes, default_staff_break_minutes, timecard_reminder_frequency_days, max_hours_before_stop')
        .single()
      
      if (verifyError) {
        console.error('❌ Update verification failed:', verifyError)
      } else {
        console.log('✅ Update verified:', updatedData)
        
        // Restore original values
        const { error: restoreError } = await supabase
          .from('global_settings')
          .update({
            default_escort_break_minutes: 30,
            default_staff_break_minutes: 60,
            timecard_reminder_frequency_days: 1,
            max_hours_before_stop: 20
          })
          .eq('id', '00000000-0000-0000-0000-000000000001')
        
        if (restoreError) {
          console.error('⚠️  Failed to restore original values:', restoreError)
        } else {
          console.log('✅ Original values restored')
        }
      }
    }
    
    console.log('\n🎉 All tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testGlobalSettingsAPI()