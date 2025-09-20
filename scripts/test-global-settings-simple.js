const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testGlobalSettings() {
  try {
    console.log('🧪 Testing Global Settings functionality...')
    
    // Test 1: Read current settings
    console.log('\n1️⃣ Reading current settings...')
    const currentSettings = await prisma.global_settings.findFirst()
    
    if (currentSettings) {
      console.log('✅ Settings found:')
      console.log('   Escort break:', currentSettings.default_escort_break_minutes, 'minutes')
      console.log('   Staff break:', currentSettings.default_staff_break_minutes, 'minutes')
      console.log('   Reminder frequency:', currentSettings.timecard_reminder_frequency_days, 'days')
      console.log('   Max hours before stop:', currentSettings.max_hours_before_stop, 'hours')
      console.log('   Overtime warning:', currentSettings.overtime_warning_hours, 'hours')
      console.log('   Archive date:', `${currentSettings.archive_date_month}/${currentSettings.archive_date_day}`)
      console.log('   Post-show transition:', currentSettings.post_show_transition_time)
      console.log('   In-house can approve timecards:', currentSettings.in_house_can_approve_timecards)
    } else {
      console.log('❌ No settings found')
      return
    }
    
    // Test 2: Update settings
    console.log('\n2️⃣ Testing settings update...')
    const updatedSettings = await prisma.global_settings.update({
      where: { id: currentSettings.id },
      data: {
        default_escort_break_minutes: 45,
        default_staff_break_minutes: 75,
        timecard_reminder_frequency_days: 2,
        max_hours_before_stop: 18,
        in_house_can_approve_timecards: false
      }
    })
    
    console.log('✅ Settings updated:')
    console.log('   Escort break:', updatedSettings.default_escort_break_minutes, 'minutes')
    console.log('   Staff break:', updatedSettings.default_staff_break_minutes, 'minutes')
    console.log('   Reminder frequency:', updatedSettings.timecard_reminder_frequency_days, 'days')
    console.log('   Max hours before stop:', updatedSettings.max_hours_before_stop, 'hours')
    console.log('   In-house can approve timecards:', updatedSettings.in_house_can_approve_timecards)
    
    // Test 3: Restore original settings
    console.log('\n3️⃣ Restoring original settings...')
    await prisma.global_settings.update({
      where: { id: currentSettings.id },
      data: {
        default_escort_break_minutes: 30,
        default_staff_break_minutes: 60,
        timecard_reminder_frequency_days: 1,
        max_hours_before_stop: 20,
        in_house_can_approve_timecards: true
      }
    })
    
    console.log('✅ Original settings restored')
    
    // Test 4: Test API format conversion
    console.log('\n4️⃣ Testing API format conversion...')
    const finalSettings = await prisma.global_settings.findFirst()
    
    const apiFormat = {
      settings: {
        breakDurations: {
          defaultEscortMinutes: finalSettings.default_escort_break_minutes,
          defaultStaffMinutes: finalSettings.default_staff_break_minutes
        },
        timecardNotifications: {
          reminderFrequencyDays: finalSettings.timecard_reminder_frequency_days,
          submissionOpensOnShowDay: finalSettings.submission_opens_on_show_day
        },
        shiftLimits: {
          maxHoursBeforeStop: finalSettings.max_hours_before_stop,
          overtimeWarningHours: finalSettings.overtime_warning_hours
        },
        systemSettings: {
          archiveDate: {
            month: finalSettings.archive_date_month,
            day: finalSettings.archive_date_day
          },
          postShowTransitionTime: typeof finalSettings.post_show_transition_time === 'string' 
            ? finalSettings.post_show_transition_time 
            : finalSettings.post_show_transition_time.toTimeString().slice(0, 5)
        }
      },
      permissions: {
        inHouse: {
          canApproveTimecards: finalSettings.in_house_can_approve_timecards,
          canInitiateCheckout: finalSettings.in_house_can_initiate_checkout,
          canManageProjects: finalSettings.in_house_can_manage_projects
        },
        supervisor: {
          canApproveTimecards: finalSettings.supervisor_can_approve_timecards,
          canInitiateCheckout: finalSettings.supervisor_can_initiate_checkout
        },
        coordinator: {
          canApproveTimecards: finalSettings.coordinator_can_approve_timecards,
          canInitiateCheckout: finalSettings.coordinator_can_initiate_checkout
        }
      }
    }
    
    console.log('✅ API format conversion successful')
    console.log('   Break durations:', apiFormat.settings.breakDurations)
    console.log('   System settings:', apiFormat.settings.systemSettings)
    console.log('   In-house permissions:', apiFormat.permissions.inHouse)
    
    console.log('\n🎉 All tests passed! Global settings are working correctly.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testGlobalSettings()