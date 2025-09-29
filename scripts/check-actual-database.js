#!/usr/bin/env node

/**
 * Check what's actually in the database for audit logs
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkDatabase() {
  console.log('🔍 Checking actual database state...')
  
  const timecardId = '50e3ac1d-fd71-4efb-b417-929e41dbeab3'
  
  try {
    // Check if timecard_audit_log table exists and has data
    console.log('\n1. Checking timecard_audit_log table...')
    const { data: auditLogs, error: auditError } = await supabase
      .from('timecard_audit_log')
      .select('*')
      .eq('timecard_id', timecardId)
      .limit(10)
    
    if (auditError) {
      console.error('❌ Error accessing timecard_audit_log:', auditError.message)
    } else {
      console.log(`✅ timecard_audit_log table exists with ${auditLogs?.length || 0} entries for this timecard`)
      if (auditLogs && auditLogs.length > 0) {
        console.log('   Sample entries:')
        auditLogs.slice(0, 3).forEach((log, i) => {
          console.log(`   ${i + 1}. ${log.action_type} - ${log.field_name || 'status'} at ${log.changed_at}`)
        })
      }
    }
    
    // Check the actual timecard data
    console.log('\n2. Checking timecard data...')
    const { data: timecard, error: timecardError } = await supabase
      .from('timecard_headers')
      .select('id, status, rejected_fields, rejection_reason')
      .eq('id', timecardId)
      .single()
    
    if (timecardError) {
      console.error('❌ Error fetching timecard:', timecardError.message)
    } else {
      console.log('✅ Timecard data:', {
        id: timecard.id,
        status: timecard.status,
        rejected_fields: timecard.rejected_fields,
        has_rejection_reason: !!timecard.rejection_reason
      })
    }
    
    // Test the API endpoint directly
    console.log('\n3. Testing audit logs API endpoint...')
    try {
      const response = await fetch(`http://localhost:3000/api/timecards/${timecardId}/audit-logs`)
      if (response.ok) {
        const data = await response.json()
        console.log('✅ API endpoint works, returned:', {
          auditLogsCount: data.auditLogs?.length || 0,
          hasData: !!data.auditLogs,
          hasPagination: !!data.pagination
        })
      } else {
        console.log('❌ API endpoint returned:', response.status, response.statusText)
      }
    } catch (error) {
      console.log('⚠️  Could not test API endpoint (app may not be running):', error.message)
    }
    
  } catch (error) {
    console.error('💥 Database check failed:', error)
  }
}

checkDatabase()
  .then(() => {
    console.log('\n✅ Database check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Check failed:', error)
    process.exit(1)
  })