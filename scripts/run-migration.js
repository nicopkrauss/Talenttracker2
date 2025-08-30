#!/usr/bin/env node

/**
 * Migration Runner
 * This script runs SQL migrations against the Supabase database
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
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(migrationFile) {
  console.log(`🚀 Running migration: ${migrationFile}`)
  
  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile)
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ Migration failed:', error.message)
      process.exit(1)
    }
    
    console.log('✅ Migration completed successfully')
    
    // Record the migration
    const migrationName = path.basename(migrationFile, '.sql')
    const { error: recordError } = await supabase
      .from('schema_migrations')
      .insert({
        migration_name: migrationName,
        applied_at: new Date().toISOString(),
        notes: `Applied via run-migration.js`
      })
    
    if (recordError) {
      console.warn('⚠️  Could not record migration in schema_migrations:', recordError.message)
    } else {
      console.log('📝 Migration recorded in schema_migrations table')
    }
    
  } catch (err) {
    console.error('❌ Error running migration:', err.message)
    process.exit(1)
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2]

if (!migrationFile) {
  console.error('❌ Please provide a migration file name')
  console.error('Usage: node scripts/run-migration.js <migration-file.sql>')
  process.exit(1)
}

runMigration(migrationFile)