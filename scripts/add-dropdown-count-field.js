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
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addDropdownCountField() {
  console.log('🚀 Adding escort_dropdown_count field to talent_groups...')
  
  try {
    // Check if the field already exists
    console.log('📊 Checking current talent groups structure...')
    const { data: groups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('*')
      .limit(1)
    
    if (groupsError) {
      console.error('❌ Error fetching groups:', groupsError)
      return
    }

    if (groups && groups.length > 0) {
      const sampleGroup = groups[0]
      if (sampleGroup.escort_dropdown_count !== undefined) {
        console.log('✅ escort_dropdown_count field already exists')
        console.log(`   Current value: ${sampleGroup.escort_dropdown_count}`)
        return
      }
    }

    console.log('📝 Field does not exist. Manual SQL needed:')
    console.log('\nExecute this SQL in Supabase SQL Editor:')
    console.log('```sql')
    console.log('-- Add escort_dropdown_count field to track number of dropdowns')
    console.log('ALTER TABLE talent_groups')
    console.log('ADD COLUMN escort_dropdown_count INTEGER DEFAULT 1;')
    console.log('')
    console.log('-- Update existing groups with escorts to have at least 1 dropdown')
    console.log('UPDATE talent_groups')
    console.log('SET escort_dropdown_count = CASE')
    console.log('  WHEN assigned_escort_id IS NOT NULL THEN 1')
    console.log('  WHEN array_length(assigned_escort_ids, 1) > 0 THEN array_length(assigned_escort_ids, 1)')
    console.log('  ELSE 1')
    console.log('END;')
    console.log('```')

    console.log('\n🎯 This field will store:')
    console.log('- Number of escort dropdowns to display')
    console.log('- Minimum value: 1 (always show at least one dropdown)')
    console.log('- Increases when user clicks plus button')
    console.log('- Persists even if dropdowns are empty')

  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

addDropdownCountField()