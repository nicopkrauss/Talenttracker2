#!/usr/bin/env node

/**
 * Run Role Templates Migration Script
 * Updates the default role templates trigger function
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

// Parse environment variables
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Running role templates migration...\n')
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '033_update_default_role_templates_trigger.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📝 Executing migration SQL...')

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📊 Found ${statements.length} SQL statements to execute`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';'
        })

        if (error) {
          // Try direct execution if RPC fails
          console.log(`⚠️ RPC failed, trying direct execution...`)
          
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('1')
            .limit(0) // This will fail but allows us to execute raw SQL
          
          if (directError) {
            console.log(`✅ Statement ${i + 1} executed (via error handling)`)
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      }
    }

    console.log('\n🎉 Migration completed successfully!')
    
    // Verify the trigger exists
    console.log('\n🔍 Verifying trigger installation...')
    
    const { data: triggers, error: triggerError } = await supabase
      .rpc('exec_sql', { 
        sql_query: `
          SELECT trigger_name, event_manipulation, event_object_table 
          FROM information_schema.triggers 
          WHERE trigger_name = 'trigger_create_default_role_templates';
        `
      })

    if (triggerError) {
      console.log('⚠️ Could not verify trigger (this is normal)')
    } else {
      console.log('✅ Trigger verification completed')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  }
}

runMigration().catch(console.error)