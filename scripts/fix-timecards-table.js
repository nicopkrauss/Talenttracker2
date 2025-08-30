#!/usr/bin/env node

/**
 * Fix the timecards table by adding missing columns
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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixTimecardsTable() {
  console.log('🔧 Fixing timecards table structure...\n')
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '005_add_missing_timecard_columns.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📋 Current timecards table columns:')
    console.log('• id, created_at, updated_at, user_id, project_id, status')
    
    console.log('\n🚀 Adding missing columns...')
    
    // Split the SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';'
      
      if (statement.includes('BEGIN') || statement.includes('COMMIT')) {
        continue // Skip transaction statements for individual execution
      }
      
      try {
        // For Supabase, we need to use the REST API differently
        // Let's try a simpler approach - execute the whole migration at once
        break
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} had an issue: ${err.message}`)
      }
    }
    
    // Try to execute the full migration
    console.log('🔄 Executing migration...')
    
    // Since we can't use RPC, let's try a different approach
    // We'll use individual ALTER TABLE statements
    
    const alterStatements = [
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS date DATE',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS check_in_time TIME',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS check_out_time TIME',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS break_start_time TIME',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS break_end_time TIME',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS total_hours DECIMAL(5,2) DEFAULT 0',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS break_duration DECIMAL(4,2) DEFAULT 0',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS pay_rate DECIMAL(8,2) DEFAULT 0',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS total_pay DECIMAL(10,2) DEFAULT 0',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN DEFAULT FALSE',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS supervisor_comments TEXT',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE timecards ADD COLUMN IF NOT EXISTS approved_by UUID'
    ]
    
    console.log('❌ Cannot execute SQL directly through Supabase client')
    console.log('\n📋 MANUAL STEPS REQUIRED:')
    console.log('========================')
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of migrations/005_add_missing_timecard_columns.sql')
    console.log('4. Run the SQL query')
    console.log('\nOR execute these ALTER TABLE statements one by one:')
    console.log('')
    
    alterStatements.forEach((stmt, i) => {
      console.log(`${i + 1}. ${stmt};`)
    })
    
    console.log('\n✅ After running the migration, the timecard page should work!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n📋 Manual fix required - see instructions above')
  }
}

fixTimecardsTable()