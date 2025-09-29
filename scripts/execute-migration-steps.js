#!/usr/bin/env node

/**
 * Execute Migration Steps Script
 * 
 * This script executes the approval data migration in the correct order,
 * handling PostgreSQL enum constraints and RLS properly.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local')
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found in scripts directory')
  process.exit(1)
}

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
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeStep(stepNumber, sqlFile, description) {
  console.log(`\n🔄 Step ${stepNumber}: ${description}`)
  
  try {
    const sqlPath = path.join(__dirname, 'database', sqlFile)
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log(`   📄 Executing ${sqlFile}...`)
    
    // For PostgreSQL, we need to execute the SQL directly
    // Note: This is a simplified approach - in production, use proper migration tools
    console.log('   📋 SQL to execute:')
    console.log('   ' + sqlContent.split('\n').slice(0, 15).join('\n   ') + '...')
    
    console.log(`   ⚠️  Please execute this SQL manually in your database:`)
    console.log(`   File: ${sqlPath}`)
    
    return true
  } catch (error) {
    console.error(`   ❌ Step ${stepNumber} failed:`, error.message)
    return false
  }
}

async function executeMigration() {
  console.log('🚀 Starting step-by-step approval data migration...\n')
  
  try {
    // Step 1: Add enum value
    const step1Success = await executeStep(
      1, 
      '01-add-status-change-enum.sql',
      'Add status_change to audit_action_type enum'
    )
    
    if (!step1Success) {
      console.error('❌ Step 1 failed. Cannot continue.')
      process.exit(1)
    }
    
    console.log('\n⚠️  IMPORTANT: You must COMMIT the transaction after Step 1 before proceeding!')
    console.log('   PostgreSQL requires enum values to be committed before use.')
    
    // Step 2: Migrate data
    const step2Success = await executeStep(
      2,
      '02-migrate-approval-data.sql', 
      'Migrate approval data to audit log'
    )
    
    if (!step2Success) {
      console.error('❌ Step 2 failed. Cannot continue.')
      process.exit(1)
    }
    
    // Step 3: Remove columns
    const step3Success = await executeStep(
      3,
      '03-remove-approval-columns.sql',
      'Remove approved_by and approved_at columns'
    )
    
    if (!step3Success) {
      console.error('❌ Step 3 failed.')
      process.exit(1)
    }
    
    console.log('\n✅ All migration steps prepared!')
    console.log('\n📋 Execution Summary:')
    console.log('   1. ✅ Step 1 SQL prepared (add enum value)')
    console.log('   2. ✅ Step 2 SQL prepared (migrate data)')  
    console.log('   3. ✅ Step 3 SQL prepared (remove columns)')
    
    console.log('\n🔧 Manual Execution Required:')
    console.log('   Execute each SQL file in order, committing after each step')
    console.log('   This ensures PostgreSQL enum constraints are handled properly')
    
  } catch (error) {
    console.error('\n❌ Migration preparation failed:', error.message)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration preparation interrupted by user')
  process.exit(1)
})

executeMigration()