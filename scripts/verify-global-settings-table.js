const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyGlobalSettingsTable() {
  try {
    console.log('🔍 Verifying global_settings table...')
    
    // Check if the table exists and has data
    const settings = await prisma.global_settings.findFirst()
    
    if (settings) {
      console.log('✅ global_settings table exists and has data:')
      console.log('   ID:', settings.id)
      console.log('   Escort break minutes:', settings.default_escort_break_minutes)
      console.log('   Staff break minutes:', settings.default_staff_break_minutes)
      console.log('   Reminder frequency:', settings.timecard_reminder_frequency_days)
      console.log('   Max hours before stop:', settings.max_hours_before_stop)
      console.log('   In-house can approve timecards:', settings.in_house_can_approve_timecards)
    } else {
      console.log('⚠️  Table exists but no default settings found. Creating default row...')
      
      // Create the default settings row
      const newSettings = await prisma.global_settings.create({
        data: {
          id: '00000000-0000-0000-0000-000000000001'
        }
      })
      
      console.log('✅ Default settings created:', newSettings.id)
    }
    
    console.log('\n🎉 Global settings table verification completed!')
    
  } catch (error) {
    console.error('❌ Error verifying global settings table:', error)
    
    if (error.code === 'P2002') {
      console.log('ℹ️  Default settings row already exists')
    } else if (error.message.includes('does not exist')) {
      console.error('❌ global_settings table does not exist. Please run the migration.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

verifyGlobalSettingsTable()