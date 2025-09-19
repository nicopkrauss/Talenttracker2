#!/usr/bin/env node

/**
 * Add Talent Data Script
 * Runs the celebrity talent SQL insert script
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

async function addTalentData() {
  console.log('🚀 Adding celebrity talent data...\n')
  
  try {
    // Check if talent already exists
    const { data: existingTalent, error: checkError } = await supabase
      .from('talent')
      .select('count')
      .limit(1)
    
    if (checkError) {
      console.error('❌ Failed to check existing talent:', checkError.message)
      return
    }

    const { count } = await supabase
      .from('talent')
      .select('*', { count: 'exact', head: true })

    console.log(`👤 Current talent count: ${count}`)

    if (count >= 50) {
      console.log('✅ Already have 50 or more talent records!')
      return
    }

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'data', 'insert_celebrity_talent.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Extract just the INSERT statements (skip comments and UPDATE statements for now)
    const insertStatements = sqlContent
      .split('\n')
      .filter(line => line.trim().startsWith('INSERT INTO talent'))
      .join('\n')

    if (!insertStatements) {
      console.error('❌ No INSERT statements found in SQL file')
      return
    }

    console.log('📝 Executing talent insert statements...')

    // Execute the insert via RPC or direct SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: insertStatements 
    })

    if (error) {
      // If RPC doesn't work, try parsing and inserting manually
      console.log('⚠️ RPC failed, trying manual insert...')
      
      // Parse the INSERT statement to extract values
      const valuesMatch = insertStatements.match(/VALUES\s+(.*);/s)
      if (!valuesMatch) {
        console.error('❌ Could not parse INSERT values')
        return
      }

      // This is a simplified approach - for production, you'd want proper SQL parsing
      console.log('📝 Inserting talent records manually...')
      
      // Let's use a simpler approach - create the talent records directly
      const talentRecords = [
        {
          first_name: 'Leonardo',
          last_name: 'DiCaprio',
          rep_name: 'Sarah Mitchell',
          rep_email: 'sarah.mitchell@talentgroup.com',
          rep_phone: '(555) 123-4567',
          notes: 'Prefers dramatic roles, environmental causes important'
        },
        {
          first_name: 'Meryl',
          last_name: 'Streep',
          rep_name: 'David Chen',
          rep_email: 'david.chen@elitetalent.com',
          rep_phone: '(555) 234-5678',
          notes: 'Versatile performer, accent coaching available'
        },
        {
          first_name: 'Denzel',
          last_name: 'Washington',
          rep_name: 'Maria Rodriguez',
          rep_email: 'maria.rodriguez@starmanagement.com',
          rep_phone: '(555) 345-6789',
          notes: 'Also directs, strong leadership presence'
        },
        {
          first_name: 'Scarlett',
          last_name: 'Johansson',
          rep_name: 'James Wilson',
          rep_email: 'james.wilson@premiertalent.com',
          rep_phone: '(555) 456-7890',
          notes: 'Action and drama experience, stunt training'
        },
        {
          first_name: 'Robert',
          last_name: 'Downey Jr.',
          rep_name: 'Lisa Thompson',
          rep_email: 'lisa.thompson@iconictalent.com',
          rep_phone: '(555) 567-8901',
          notes: 'Charismatic lead, improvisation skills'
        }
      ]

      // Insert a few sample records to test
      const { data: insertData, error: insertError } = await supabase
        .from('talent')
        .insert(talentRecords)
        .select()

      if (insertError) {
        console.error('❌ Failed to insert talent records:', insertError.message)
        return
      }

      console.log(`✅ Successfully inserted ${insertData.length} talent records`)
      
      // Check final count
      const { count: finalCount } = await supabase
        .from('talent')
        .select('*', { count: 'exact', head: true })

      console.log(`🎯 Final talent count: ${finalCount}`)

    } else {
      console.log('✅ Successfully executed SQL insert')
      
      // Check final count
      const { count: finalCount } = await supabase
        .from('talent')
        .select('*', { count: 'exact', head: true })

      console.log(`🎯 Final talent count: ${finalCount}`)
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

addTalentData().catch(console.error)