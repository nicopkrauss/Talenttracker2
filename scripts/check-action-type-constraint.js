/**
 * Check and fix action_type constraint on timecard_audit_log table
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkActionTypeConstraint() {
  try {
    console.log('Checking action_type constraint on timecard_audit_log table...')
    
    console.log('Skipping constraint definition check (RPC not available)')

    // Try to insert a test record to see what values are allowed
    console.log('\nTesting valid action_type values...')
    
    const testValues = ['user_edit', 'admin_edit', 'rejection_edit']
    
    for (const actionType of testValues) {
      try {
        const { error } = await supabase
          .from('timecard_audit_log')
          .insert({
            timecard_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
            change_id: '00000000-0000-0000-0000-000000000000',
            field_name: 'test_field',
            old_value: 'old',
            new_value: 'new',
            changed_by: '00000000-0000-0000-0000-000000000000',
            action_type: actionType,
            work_date: '2024-01-01'
          })
          .select()
          .limit(1)

        if (error) {
          console.log(`❌ ${actionType}: ${error.message}`)
        } else {
          console.log(`✅ ${actionType}: Valid`)
          
          // Clean up test record
          await supabase
            .from('timecard_audit_log')
            .delete()
            .eq('field_name', 'test_field')
            .eq('action_type', actionType)
        }
      } catch (err) {
        console.log(`❌ ${actionType}: ${err.message}`)
      }
    }

  } catch (error) {
    console.error('Script error:', error)
  }
}

checkActionTypeConstraint()