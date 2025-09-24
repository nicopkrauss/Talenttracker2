const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixSystemSettingsDuplicates() {
  try {
    console.log('Checking system_settings table for duplicates...')
    
    // Get all system_settings records
    const { data: settings, error: fetchError } = await supabase
      .from('system_settings')
      .select('*')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching system_settings:', fetchError)
      return
    }

    console.log(`Found ${settings.length} system_settings records`)

    if (settings.length <= 1) {
      console.log('No duplicates found. System is healthy.')
      return
    }

    // Keep the first record (oldest) and delete the rest
    const keepRecord = settings[0]
    const deleteRecords = settings.slice(1)

    console.log(`Keeping record with ID: ${keepRecord.id}`)
    console.log(`Deleting ${deleteRecords.length} duplicate records...`)

    for (const record of deleteRecords) {
      const { error: deleteError } = await supabase
        .from('system_settings')
        .delete()
        .eq('id', record.id)

      if (deleteError) {
        console.error(`Error deleting record ${record.id}:`, deleteError)
      } else {
        console.log(`Deleted duplicate record: ${record.id}`)
      }
    }

    console.log('System settings cleanup completed!')

    // Verify the fix
    const { data: verifyData, error: verifyError } = await supabase
      .from('system_settings')
      .select('*')

    if (verifyError) {
      console.error('Error verifying fix:', verifyError)
    } else {
      console.log(`Verification: ${verifyData.length} system_settings record(s) remaining`)
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

fixSystemSettingsDuplicates()