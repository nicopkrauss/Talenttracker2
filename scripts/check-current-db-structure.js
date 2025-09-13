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

async function checkCurrentStructure() {
  console.log('🔍 Checking current database structure for talent groups...')
  
  try {
    // Check existing talent groups structure
    console.log('📊 Fetching sample talent groups...')
    const { data: groups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('*')
      .limit(2)
    
    if (groupsError) {
      console.error('❌ Error fetching groups:', groupsError)
      return
    }

    if (groups && groups.length > 0) {
      console.log('📋 Current talent_groups table structure:')
      const sampleGroup = groups[0]
      Object.keys(sampleGroup).forEach(key => {
        console.log(`  - ${key}: ${typeof sampleGroup[key]} = ${sampleGroup[key]}`)
      })
      
      console.log('\n📝 Sample groups:')
      groups.forEach(group => {
        console.log(`  - ${group.group_name}`)
        console.log(`    assigned_escort_id: ${group.assigned_escort_id || 'null'}`)
        if (group.assigned_escort_ids) {
          console.log(`    assigned_escort_ids: ${JSON.stringify(group.assigned_escort_ids)}`)
        }
      })
    } else {
      console.log('❌ No talent groups found')
    }

    // Check if assigned_escort_ids column exists
    console.log('\n🔍 Testing assigned_escort_ids column...')
    try {
      const { data: testData, error: testError } = await supabase
        .from('talent_groups')
        .select('id, assigned_escort_ids')
        .limit(1)
      
      if (testError) {
        console.log('❌ assigned_escort_ids column does not exist')
        console.log('   Error:', testError.message)
        console.log('\n📝 Need to add: assigned_escort_ids UUID[] DEFAULT \'{}\'')
      } else {
        console.log('✅ assigned_escort_ids column exists!')
        if (testData && testData.length > 0) {
          console.log('   Sample data:', testData[0])
        }
      }
    } catch (err) {
      console.log('❌ assigned_escort_ids column does not exist')
    }

    // Check current assignment dropdown structure
    console.log('\n🎯 Current assignment workflow:')
    console.log('1. Groups show single escort dropdown (same as individual talent)')
    console.log('2. Need to add: Plus button next to existing dropdown')
    console.log('3. Plus button creates additional dropdowns')
    console.log('4. Each dropdown can be independently set/cleared')
    console.log('5. Number of dropdowns should be saved in database')

  } catch (error) {
    console.error('❌ Check failed:', error)
    process.exit(1)
  }
}

checkCurrentStructure()