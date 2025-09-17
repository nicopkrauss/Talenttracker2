#!/usr/bin/env node

/**
 * Project Lifecycle Migration Runner
 * This script runs the project lifecycle schema migration
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

async function runLifecycleMigration() {
  console.log('🚀 Running project lifecycle schema migration...')
  
  const migrationPath = path.join(__dirname, '..', 'migrations', '036_extend_project_lifecycle_schema.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  // Split the SQL into individual statements
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
  
  console.log(`📝 Executing ${statements.length} SQL statements...`)
  
  try {
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 60)}...`)
        
        const { error } = await supabase.rpc('exec', { sql: statement })
        
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error.message)
          console.error(`Statement: ${statement}`)
          process.exit(1)
        }
      }
    }
    
    console.log('✅ All statements executed successfully')
    console.log('🎉 Project lifecycle schema migration completed!')
    
  } catch (err) {
    console.error('❌ Error running migration:', err.message)
    process.exit(1)
  }
}

runLifecycleMigration()