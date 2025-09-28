/**
 * Debug script to check audit logs in the database
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAuditLogs() {
  try {
    console.log('🔍 Checking audit logs in database...\n')

    // Get all audit logs
    const { data: allLogs, error: allError } = await supabase
      .from('timecard_audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(10)

    if (allError) {
      console.error('❌ Error fetching audit logs:', allError)
      return
    }

    console.log(`📊 Found ${allLogs?.length || 0} audit log entries (showing first 10)`)
    
    if (allLogs && allLogs.length > 0) {
      console.log('\n📋 Sample audit log entries:')
      allLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. Entry ID: ${log.id}`)
        console.log(`   Timecard ID: ${log.timecard_id}`)
        console.log(`   Change ID: ${log.change_id}`)
        console.log(`   Field Name: "${log.field_name}"`)
        console.log(`   Old Value: ${log.old_value}`)
        console.log(`   New Value: ${log.new_value}`)
        console.log(`   Action Type: ${log.action_type}`)
        console.log(`   Changed By: ${log.changed_by}`)
        console.log(`   Changed At: ${log.changed_at}`)
      })

      // Check for unique field names
      const uniqueFieldNames = [...new Set(allLogs.map(log => log.field_name))]
      console.log('\n🏷️  Unique field names found:')
      uniqueFieldNames.forEach(fieldName => {
        console.log(`   - "${fieldName}"`)
      })

      // Check for entries with null/undefined field names
      const invalidFieldNames = allLogs.filter(log => !log.field_name || log.field_name === null)
      if (invalidFieldNames.length > 0) {
        console.log(`\n⚠️  Found ${invalidFieldNames.length} entries with invalid field names`)
      }

      // Get a specific timecard's logs
      const firstTimecardId = allLogs[0].timecard_id
      console.log(`\n🎯 Checking logs for timecard: ${firstTimecardId}`)
      
      const { data: timecardLogs, error: timecardError } = await supabase
        .from('timecard_audit_log')
        .select(`
          *,
          changed_by_profile:profiles!timecard_audit_log_changed_by_fkey(full_name)
        `)
        .eq('timecard_id', firstTimecardId)
        .order('changed_at', { ascending: false })

      if (timecardError) {
        console.error('❌ Error fetching timecard logs:', timecardError)
      } else {
        console.log(`   Found ${timecardLogs?.length || 0} logs for this timecard`)
        if (timecardLogs && timecardLogs.length > 0) {
          console.log('   Sample entry with profile:')
          const sample = timecardLogs[0]
          console.log(`   - Field: "${sample.field_name}"`)
          console.log(`   - Changed by: ${sample.changed_by_profile?.full_name || 'Unknown'}`)
          console.log(`   - Has ID: ${!!sample.id}`)
        }
      }
    } else {
      console.log('\n📭 No audit logs found in database')
      
      // Check if the table exists
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'timecard_audit_log')

      if (tableError) {
        console.log('⚠️  Could not check if table exists:', tableError.message)
      } else if (!tables || tables.length === 0) {
        console.log('❌ timecard_audit_log table does not exist')
      } else {
        console.log('✅ timecard_audit_log table exists but is empty')
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

debugAuditLogs()