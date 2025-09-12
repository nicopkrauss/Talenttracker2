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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addConfirmedAtColumn() {
  console.log('Checking if confirmed_at column exists...')
  
  // Try to select the column to see if it exists
  const { data, error } = await supabase
    .from('team_assignments')
    .select('confirmed_at')
    .limit(1)
    
  if (error && error.code === 'PGRST116') {
    console.log('Column confirmed_at does not exist')
    console.log('Please run this SQL in Supabase SQL editor:')
    console.log('ALTER TABLE team_assignments ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;')
  } else if (error) {
    console.error('Error checking column:', error)
  } else {
    console.log('✅ Column confirmed_at already exists')
  }
}

addConfirmedAtColumn().catch(console.error)