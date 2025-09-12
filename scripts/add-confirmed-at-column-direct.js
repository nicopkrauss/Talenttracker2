#!/usr/bin/env node

/**
 * Add the confirmed_at column to team_assignments table
 * This column tracks when a team member's availability has been confirmed
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addConfirmedAtColumn() {
  console.log('🚀 Adding confirmed_at column to team_assignments table...')
  
  try {
    // First, check if the column already exists
    console.log('Checking if confirmed_at column exists...')
    const { data, error: checkError } = await supabase
      .from('team_assignments')
      .select('confirmed_at')
      .limit(1)
    
    if (!checkError) {
      console.log('✅ Column confirmed_at already exists!')
      return
    }
    
    if (checkError.code !== '42703') {
      console.error('❌ Unexpected error checking column:', checkError)
      return
    }
    
    console.log('Column confirmed_at does not exist, need to add it manually.')
    console.log('\n📋 Please run this SQL in your Supabase SQL Editor:')
    console.log('━'.repeat(60))
    console.log('-- Add confirmed_at column to team_assignments table')
    console.log('ALTER TABLE team_assignments ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;')
    console.log('')
    console.log('-- Add index for efficient querying')
    console.log('CREATE INDEX idx_team_assignments_confirmed_at ON team_assignments (confirmed_at);')
    console.log('')
    console.log('-- Add comment to document the column')
    console.log("COMMENT ON COLUMN team_assignments.confirmed_at IS 'Timestamp when team member availability was confirmed';")
    console.log('━'.repeat(60))
    console.log('\n🔗 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql')
    console.log('\n⚠️  After running the SQL, the availability confirmation workflow will be fully functional.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

addConfirmedAtColumn()