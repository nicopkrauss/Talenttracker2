/**
 * Run the action_type constraint fix migration
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Running action_type constraint fix...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-action-type-constraint.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`\nExecuting statement ${i + 1}:`)
      console.log(statement)
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error)
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
          if (data) {
            console.log('Result:', data)
          }
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message)
      }
    }
    
    console.log('\n🎉 Migration completed!')
    
    // Test the fix
    console.log('\nTesting the fix...')
    const testValues = ['user_edit', 'admin_edit', 'rejection_edit']
    
    for (const actionType of testValues) {
      try {
        const { error } = await supabase
          .from('timecard_audit_log')
          .insert({
            timecard_id: '00000000-0000-0000-0000-000000000000',
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

        if (error && error.message.includes('check constraint')) {
          console.log(`❌ ${actionType}: Still failing constraint check`)
        } else if (error && error.message.includes('foreign key')) {
          console.log(`✅ ${actionType}: Constraint check passed (foreign key error expected)`)
        } else if (error) {
          console.log(`⚠️  ${actionType}: Other error - ${error.message}`)
        } else {
          console.log(`✅ ${actionType}: Fully valid`)
          // Clean up
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
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()