#!/usr/bin/env node

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

async function addAvailabilityColumns() {
  console.log('🚀 Adding availability columns to team_assignments table...')
  
  try {
    // Add available_dates column
    console.log('Adding available_dates column...')
    const { error: error1 } = await supabase
      .from('team_assignments')
      .select('available_dates')
      .limit(1)
    
    if (error1 && error1.code === 'PGRST116') {
      // Column doesn't exist, we need to add it
      console.log('Column available_dates does not exist, adding it...')
      // We'll need to use a different approach since we can't run DDL directly
      console.log('⚠️  Please run this SQL manually in your Supabase SQL editor:')
      console.log('ALTER TABLE team_assignments ADD COLUMN available_dates DATE[] DEFAULT \'{}\';')
      console.log('ALTER TABLE team_assignments ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;')
      console.log('CREATE INDEX idx_team_assignments_available_dates ON team_assignments USING GIN (available_dates);')
      console.log('CREATE INDEX idx_team_assignments_confirmed_at ON team_assignments (confirmed_at);')
    } else {
      console.log('✅ Columns already exist or accessible')
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

addAvailabilityColumns()