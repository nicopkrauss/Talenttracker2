const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Running global settings migration...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '031_create_global_settings_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Executing ${statements.length} SQL statements...`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        })
        
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error)
          // Continue with other statements
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`)
        }
      }
    }
    
    // Verify the table was created
    console.log('\n🔍 Verifying table creation...')
    const { data: tableExists, error: tableError } = await supabase
      .from('global_settings')
      .select('id')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Error verifying table:', tableError)
    } else {
      console.log('✅ global_settings table verified')
      
      if (tableExists && tableExists.length > 0) {
        console.log('✅ Default settings row exists')
      } else {
        console.log('ℹ️  No default settings row found (this is expected if the insert failed)')
      }
    }
    
    console.log('\n🎉 Migration completed!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Alternative approach using direct SQL execution
async function runMigrationDirect() {
  try {
    console.log('🚀 Running global settings migration (direct approach)...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '031_create_global_settings_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📝 Executing migration SQL...')
    
    // Execute the entire migration as one query
    const { error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration SQL executed successfully')
    
    // Verify the table was created
    console.log('\n🔍 Verifying table creation...')
    const { data: settings, error: verifyError } = await supabase
      .from('global_settings')
      .select('*')
      .single()
    
    if (verifyError) {
      console.error('❌ Error verifying table:', verifyError)
    } else {
      console.log('✅ global_settings table verified with data:', {
        id: settings.id,
        default_escort_break_minutes: settings.default_escort_break_minutes,
        default_staff_break_minutes: settings.default_staff_break_minutes
      })
    }
    
    console.log('\n🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Check if exec_sql function exists, if not use direct approach
supabase.rpc('exec_sql', { sql: 'SELECT 1;' })
  .then(() => {
    console.log('Using RPC exec_sql approach...')
    return runMigrationDirect()
  })
  .catch(() => {
    console.log('RPC exec_sql not available, using statement-by-statement approach...')
    return runMigration()
  })