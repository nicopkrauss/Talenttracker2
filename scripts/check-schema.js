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

async function checkSchema() {
  console.log('Checking team_assignments table schema...')
  
  const { data, error } = await supabase
    .from('team_assignments')
    .select('*')
    .limit(1)
    
  if (error) {
    console.error('Error:', error)
    return
  }
  
  if (data && data.length > 0) {
    console.log('Current columns:', Object.keys(data[0]))
  } else {
    console.log('No data in table, checking with empty select')
    const { error: emptyError } = await supabase
      .from('team_assignments')
      .select('id')
      .limit(1)
    
    if (emptyError) {
      console.error('Table access error:', emptyError)
    } else {
      console.log('Table exists but is empty')
    }
  }
  
  console.log('\nTo add the required columns, run this SQL in Supabase SQL editor:')
  console.log('ALTER TABLE team_assignments ADD COLUMN IF NOT EXISTS available_dates DATE[] DEFAULT \'{}\';')
  console.log('ALTER TABLE team_assignments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;')
}

checkSchema().catch(console.error)