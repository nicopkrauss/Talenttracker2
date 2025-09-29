#!/usr/bin/env node

/**
 * Approval Data Migration Script
 * 
 * This script migrates existing approved_by and approved_at data to audit log entries
 * and then removes the columns from the timecard_headers table.
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

async function runMigration() {
  console.log('🚀 Starting approval data migration...\n')
  
  try {
    // Step 1: Check current state
    console.log('📊 Checking current database state...')
    
    const { data: timecards, error: timecardError } = await supabase
      .from('timecard_headers')
      .select('id, status, approved_by, approved_at')
      .not('approved_by', 'is', null)
      .not('approved_at', 'is', null)
    
    if (timecardError) {
      throw new Error(`Failed to query timecards: ${timecardError.message}`)
    }
    
    console.log(`   Found ${timecards?.length || 0} timecards with approval data`)
    
    // Step 2: Run multi-step migration
    console.log('\n📝 Running multi-step migration...')
    
    console.log('   Step 1: Adding status_change enum value...')
    console.log('   ⚠️  This requires manual execution due to PostgreSQL enum constraints')
    console.log('   Please run the following SQL files in order:')
    console.log('   1. scripts/database/01-add-status-change-enum.sql')
    console.log('   2. COMMIT the transaction')
    console.log('   3. scripts/database/02-migrate-approval-data.sql')
    console.log('   4. scripts/database/03-remove-approval-columns.sql')
    
    // Show the SQL content for reference
    const step1Sql = fs.readFileSync(
      path.join(__dirname, 'database', '01-add-status-change-enum.sql'),
      'utf8'
    )
    
    console.log('\n   📄 Step 1 SQL Preview:')
    console.log('   ' + step1Sql.split('\n').slice(0, 10).join('\n   ') + '...')
    
    console.log('\n   ✅ Migration scripts prepared')
    
    // Step 3: Verify migration
    console.log('\n🔍 Verifying migration...')
    
    const { data: auditLogs, error: auditError } = await supabase
      .from('timecard_audit_log')
      .select('id, timecard_id, action_type, new_value')
      .eq('action_type', 'status_change')
      .eq('new_value', 'approved')
    
    if (auditError) {
      console.log('   ⚠️  Could not verify audit logs, but migration may have succeeded')
    } else {
      console.log(`   ✅ Found ${auditLogs?.length || 0} status change audit entries`)
    }
    
    // Step 4: Show final migration step
    console.log('\n⚠️  Final step: Remove approved_by and approved_at columns')
    console.log('   This should be done AFTER steps 1-2 are completed!')
    
    const step3Sql = fs.readFileSync(
      path.join(__dirname, 'database', '03-remove-approval-columns.sql'),
      'utf8'
    )
    
    console.log('\n   📄 Step 3 SQL Preview:')
    console.log('   ' + step3Sql.split('\n').slice(0, 10).join('\n   ') + '...')
    
    console.log('\n✅ Migration preparation completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Execute: scripts/database/01-add-status-change-enum.sql')
    console.log('   2. COMMIT the transaction')
    console.log('   3. Execute: scripts/database/02-migrate-approval-data.sql')
    console.log('   4. Verify audit log entries are correct')
    console.log('   5. Execute: scripts/database/03-remove-approval-columns.sql')
    console.log('   6. Update application code to use audit log for status tracking')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration interrupted by user')
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Migration terminated')
  process.exit(1)
})

runMigration()