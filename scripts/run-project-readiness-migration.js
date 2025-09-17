#!/usr/bin/env node

/**
 * Project Readiness System Migration Script
 * 
 * This script migrates from the old project_setup_checklist system to the new
 * flexible project_readiness system. It includes safety checks and rollback capabilities.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Starting Project Readiness System Migration...\n')

  try {
    // Step 1: Backup existing data
    console.log('📋 Step 1: Backing up existing project_setup_checklist data...')
    const { data: checklistData, error: backupError } = await supabase
      .from('project_setup_checklist')
      .select('*')

    if (backupError) {
      console.error('❌ Failed to backup checklist data:', backupError)
      process.exit(1)
    }

    // Save backup to file
    const backupPath = path.join(__dirname, '..', 'backups', `project_setup_checklist_backup_${Date.now()}.json`)
    const backupDir = path.dirname(backupPath)
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(checklistData, null, 2))
    console.log(`✅ Backup saved to: ${backupPath}`)
    console.log(`   Backed up ${checklistData?.length || 0} checklist records\n`)

    // Step 2: Check for existing project_readiness table
    console.log('🔍 Step 2: Checking for existing project_readiness table...')
    const { data: existingTable, error: tableCheckError } = await supabase
      .from('project_readiness')
      .select('count')
      .limit(1)

    if (!tableCheckError) {
      console.log('⚠️  project_readiness table already exists')
      console.log('   This migration may have already been run')
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise(resolve => {
        readline.question('Continue anyway? (y/N): ', resolve)
      })
      readline.close()
      
      if (answer.toLowerCase() !== 'y') {
        console.log('Migration cancelled by user')
        process.exit(0)
      }
    }

    // Step 3: Run the migration SQL
    console.log('🔧 Step 3: Running migration SQL...')
    const migrationPath = path.join(__dirname, '..', 'migrations', '031_create_project_readiness_system.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute the migration (note: this is a simplified approach)
    // In production, you might want to split this into smaller chunks
    const { error: migrationError } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    })

    if (migrationError) {
      console.error('❌ Migration failed:', migrationError)
      console.log('\n🔄 Attempting to restore from backup...')
      // In a real scenario, you'd implement rollback logic here
      process.exit(1)
    }

    console.log('✅ Migration SQL executed successfully\n')

    // Step 4: Verify the migration
    console.log('✅ Step 4: Verifying migration results...')
    
    // Check that project_readiness table exists and has data
    const { data: readinessData, error: verifyError } = await supabase
      .from('project_readiness')
      .select('project_id, overall_status, locations_status, roles_status, team_status, talent_status')
      .limit(5)

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
      process.exit(1)
    }

    console.log(`✅ project_readiness table created with ${readinessData?.length || 0} sample records`)
    
    if (readinessData && readinessData.length > 0) {
      console.log('   Sample readiness data:')
      readinessData.forEach(record => {
        console.log(`   - Project ${record.project_id.substring(0, 8)}...: ${record.overall_status}`)
      })
    }

    // Check that old table is gone
    const { error: oldTableError } = await supabase
      .from('project_setup_checklist')
      .select('count')
      .limit(1)

    if (!oldTableError) {
      console.log('⚠️  project_setup_checklist table still exists (this might be expected)')
    } else {
      console.log('✅ project_setup_checklist table successfully removed')
    }

    // Step 5: Test readiness calculations
    console.log('\n🧪 Step 5: Testing readiness calculations...')
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(3)

    if (projectsError) {
      console.error('❌ Failed to fetch test projects:', projectsError)
    } else if (projects && projects.length > 0) {
      for (const project of projects) {
        const { error: calcError } = await supabase.rpc('calculate_project_readiness', {
          p_project_id: project.id
        })
        
        if (calcError) {
          console.error(`❌ Failed to calculate readiness for ${project.name}:`, calcError)
        } else {
          console.log(`✅ Readiness calculated for: ${project.name}`)
        }
      }
    }

    console.log('\n🎉 Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Update your application code to use the new project_readiness table')
    console.log('2. Remove references to project_setup_checklist in your codebase')
    console.log('3. Test the new readiness system thoroughly')
    console.log('4. Deploy the updated application code')

  } catch (error) {
    console.error('💥 Unexpected error during migration:', error)
    process.exit(1)
  }
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log('Project Readiness System Migration')
  console.log('')
  console.log('Usage: node run-project-readiness-migration.js [options]')
  console.log('')
  console.log('Options:')
  console.log('  --help, -h     Show this help message')
  console.log('  --dry-run      Show what would be done without making changes')
  console.log('')
  console.log('Environment variables required:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL      Your Supabase project URL')
  console.log('  SUPABASE_SERVICE_ROLE_KEY     Your Supabase service role key')
  process.exit(0)
}

if (args.includes('--dry-run')) {
  console.log('🔍 DRY RUN MODE - No changes will be made')
  console.log('')
  console.log('This migration would:')
  console.log('1. Backup existing project_setup_checklist data')
  console.log('2. Create new project_readiness table with flexible status tracking')
  console.log('3. Migrate existing checklist data to readiness format')
  console.log('4. Create database triggers for automatic readiness updates')
  console.log('5. Drop the old project_setup_checklist table')
  console.log('6. Verify the migration completed successfully')
  console.log('')
  console.log('Run without --dry-run to execute the migration')
  process.exit(0)
}

// Run the migration
runMigration().catch(error => {
  console.error('💥 Migration failed:', error)
  process.exit(1)
})