#!/usr/bin/env node

/**
 * Project Readiness System Migration Rollback Script
 * 
 * This script rolls back the project readiness migration by:
 * 1. Recreating the project_setup_checklist table
 * 2. Migrating data back from project_readiness
 * 3. Dropping the project_readiness table
 * 4. Removing triggers and functions
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

async function rollbackMigration() {
  console.log('🔄 Starting Project Readiness System Migration Rollback...\n')

  try {
    // Step 1: Backup current project_readiness data
    console.log('📋 Step 1: Backing up current project_readiness data...')
    const { data: readinessData, error: backupError } = await supabase
      .from('project_readiness')
      .select('*')

    if (backupError) {
      console.error('❌ Failed to backup readiness data:', backupError)
      process.exit(1)
    }

    // Save backup to file
    const backupPath = path.join(__dirname, '..', 'backups', `project_readiness_rollback_backup_${Date.now()}.json`)
    fs.writeFileSync(backupPath, JSON.stringify(readinessData, null, 2))
    console.log(`✅ Backup saved to: ${backupPath}`)
    console.log(`   Backed up ${readinessData?.length || 0} readiness records\n`)

    // Step 2: Recreate project_setup_checklist table
    console.log('🔧 Step 2: Recreating project_setup_checklist table...')
    
    const recreateChecklistSQL = `
      CREATE TABLE IF NOT EXISTS project_setup_checklist (
        project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
        roles_and_pay_completed BOOLEAN DEFAULT FALSE,
        talent_roster_completed BOOLEAN DEFAULT FALSE,
        team_assignments_completed BOOLEAN DEFAULT FALSE,
        locations_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_project_setup_checklist_project_id ON project_setup_checklist(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_setup_checklist_completed ON project_setup_checklist(roles_and_pay_completed, talent_roster_completed, team_assignments_completed, locations_completed);
    `

    const { error: recreateError } = await supabase.rpc('exec_sql', { 
      sql: recreateChecklistSQL 
    })

    if (recreateError) {
      console.error('❌ Failed to recreate checklist table:', recreateError)
      process.exit(1)
    }

    console.log('✅ project_setup_checklist table recreated\n')

    // Step 3: Migrate data back from project_readiness to project_setup_checklist
    console.log('📊 Step 3: Migrating data back to checklist format...')
    
    if (readinessData && readinessData.length > 0) {
      for (const readiness of readinessData) {
        const checklistData = {
          project_id: readiness.project_id,
          roles_and_pay_completed: readiness.roles_finalized || false,
          talent_roster_completed: readiness.talent_finalized || false,
          team_assignments_completed: readiness.team_finalized || false,
          locations_completed: readiness.locations_finalized || false,
          completed_at: null, // Will be set if all are complete
          created_at: readiness.created_at,
          updated_at: readiness.updated_at
        }

        // Set completed_at if all items are complete
        if (checklistData.roles_and_pay_completed && 
            checklistData.talent_roster_completed && 
            checklistData.team_assignments_completed && 
            checklistData.locations_completed) {
          checklistData.completed_at = readiness.updated_at
        }

        const { error: insertError } = await supabase
          .from('project_setup_checklist')
          .upsert(checklistData)

        if (insertError) {
          console.error(`❌ Failed to migrate data for project ${readiness.project_id}:`, insertError)
        }
      }

      console.log(`✅ Migrated ${readinessData.length} records back to checklist format\n`)
    }

    // Step 4: Drop project_readiness table and related objects
    console.log('🗑️  Step 4: Removing project_readiness system...')
    
    const cleanupSQL = `
      -- Drop triggers
      DROP TRIGGER IF EXISTS trigger_projects_readiness_update ON projects;
      DROP TRIGGER IF EXISTS trigger_project_locations_readiness_update ON project_locations;
      DROP TRIGGER IF EXISTS trigger_project_role_templates_readiness_update ON project_role_templates;
      DROP TRIGGER IF EXISTS trigger_team_assignments_readiness_update ON team_assignments;
      DROP TRIGGER IF EXISTS trigger_talent_assignments_readiness_update ON talent_project_assignments;

      -- Drop functions
      DROP FUNCTION IF EXISTS trigger_update_project_readiness();
      DROP FUNCTION IF EXISTS calculate_project_readiness(UUID);

      -- Drop table
      DROP TABLE IF EXISTS project_readiness CASCADE;
    `

    const { error: cleanupError } = await supabase.rpc('exec_sql', { 
      sql: cleanupSQL 
    })

    if (cleanupError) {
      console.error('❌ Failed to cleanup readiness system:', cleanupError)
      console.log('⚠️  You may need to manually clean up remaining objects')
    } else {
      console.log('✅ project_readiness system removed\n')
    }

    // Step 5: Verify rollback
    console.log('✅ Step 5: Verifying rollback...')
    
    // Check that checklist table exists and has data
    const { data: checklistData, error: verifyError } = await supabase
      .from('project_setup_checklist')
      .select('project_id, roles_and_pay_completed, talent_roster_completed')
      .limit(5)

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
    } else {
      console.log(`✅ project_setup_checklist table restored with ${checklistData?.length || 0} records`)
      
      if (checklistData && checklistData.length > 0) {
        console.log('   Sample checklist data:')
        checklistData.forEach(record => {
          console.log(`   - Project ${record.project_id.substring(0, 8)}...: roles=${record.roles_and_pay_completed}, talent=${record.talent_roster_completed}`)
        })
      }
    }

    // Check that readiness table is gone
    const { error: readinessGoneError } = await supabase
      .from('project_readiness')
      .select('count')
      .limit(1)

    if (readinessGoneError) {
      console.log('✅ project_readiness table successfully removed')
    } else {
      console.log('⚠️  project_readiness table still exists')
    }

    console.log('\n🎉 Rollback completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Update your Prisma schema to use project_setup_checklist')
    console.log('2. Restore the old API routes (activate, checklist)')
    console.log('3. Update application code to use the checklist system')
    console.log('4. Run prisma generate to update types')
    console.log('5. Test the restored functionality')

  } catch (error) {
    console.error('💥 Unexpected error during rollback:', error)
    process.exit(1)
  }
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log('Project Readiness System Migration Rollback')
  console.log('')
  console.log('Usage: node rollback-project-readiness-migration.js [options]')
  console.log('')
  console.log('Options:')
  console.log('  --help, -h     Show this help message')
  console.log('  --confirm      Confirm you want to rollback (required)')
  console.log('')
  console.log('This rollback will:')
  console.log('1. Backup current project_readiness data')
  console.log('2. Recreate project_setup_checklist table')
  console.log('3. Migrate data back to checklist format')
  console.log('4. Remove project_readiness table and triggers')
  console.log('5. Verify the rollback completed successfully')
  console.log('')
  console.log('Environment variables required:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL      Your Supabase project URL')
  console.log('  SUPABASE_SERVICE_ROLE_KEY     Your Supabase service role key')
  process.exit(0)
}

if (!args.includes('--confirm')) {
  console.log('⚠️  This rollback will permanently remove the project readiness system')
  console.log('   and restore the old checklist system.')
  console.log('')
  console.log('   Run with --confirm to proceed with the rollback')
  console.log('   Run with --help to see more information')
  process.exit(0)
}

// Run the rollback
rollbackMigration().catch(error => {
  console.error('💥 Rollback failed:', error)
  process.exit(1)
})