#!/usr/bin/env node

/**
 * Assignment Migration Runner
 * 
 * This script provides a simple interface to run the assignment migration
 * with proper error handling and user confirmation.
 * 
 * Requirements: 5.1, 5.2, 5.4
 */

const { createClient } = require('@supabase/supabase-js');

// Handle command line arguments first (before checking env vars)
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Assignment Migration Runner');
  console.log('');
  console.log('Usage: node run-assignment-migration.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --test         Run in test mode (dry run)');
  console.log('  --force        Skip confirmation prompts');
  console.log('');
  console.log('Environment Variables:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL      Supabase project URL');
  console.log('  SUPABASE_SERVICE_ROLE_KEY     Supabase service role key');
  console.log('');
  console.log('Related Scripts:');
  console.log('  validate-assignment-migration.js  Validate migration results');
  console.log('  rollback-assignment-migration.js  Rollback migration');
  console.log('  test-assignment-migration.js      Run comprehensive tests');
  process.exit(0);
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check if migration has already been run
 */
async function checkMigrationStatus() {
  try {
    const { data: talentDaily, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select('id', { count: 'exact', head: true });

    if (talentError) {
      throw new Error(`Failed to check talent daily assignments: ${talentError.message}`);
    }

    const { data: groupDaily, error: groupError } = await supabase
      .from('group_daily_assignments')
      .select('id', { count: 'exact', head: true });

    if (groupError) {
      throw new Error(`Failed to check group daily assignments: ${groupError.message}`);
    }

    return {
      talentDailyCount: talentDaily,
      groupDailyCount: groupDaily,
      hasExistingData: talentDaily > 0 || groupDaily > 0
    };

  } catch (error) {
    console.error('Failed to check migration status:', error.message);
    throw error;
  }
}

/**
 * Get summary of data to be migrated
 */
async function getMigrationSummary() {
  try {
    // Count talent assignments with escort_id
    const { data: talentCount, error: talentError } = await supabase
      .from('talent_project_assignments')
      .select('id', { count: 'exact', head: true })
      .not('escort_id', 'is', null)
      .not('scheduled_dates', 'eq', '{}');

    if (talentError) {
      throw new Error(`Failed to count talent assignments: ${talentError.message}`);
    }

    // Count talent groups with escort assignments
    const { data: groupCount, error: groupError } = await supabase
      .from('talent_groups')
      .select('id', { count: 'exact', head: true })
      .not('scheduled_dates', 'eq', '{}')
      .or('assigned_escort_id.not.is.null,assigned_escort_ids.not.eq.{}');

    if (groupError) {
      throw new Error(`Failed to count talent groups: ${groupError.message}`);
    }

    return {
      talentAssignments: talentCount,
      talentGroups: groupCount
    };

  } catch (error) {
    console.error('Failed to get migration summary:', error.message);
    throw error;
  }
}

/**
 * Confirm migration with user
 */
function confirmMigration(summary, status) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n=== Assignment Migration Confirmation ===');
    
    if (status.hasExistingData) {
      console.log('⚠️  WARNING: Daily assignment tables already contain data!');
      console.log(`   Talent daily assignments: ${status.talentDailyCount}`);
      console.log(`   Group daily assignments: ${status.groupDailyCount}`);
      console.log('\nThis migration will ADD to existing data, not replace it.');
      console.log('If you want to start fresh, run the rollback script first.');
    }

    console.log('\nData to be migrated:');
    console.log(`   Talent assignments with escorts: ${summary.talentAssignments}`);
    console.log(`   Talent groups with escorts: ${summary.talentGroups}`);
    
    console.log('\nThis migration will:');
    console.log('1. Convert talent_project_assignments.escort_id to daily assignments');
    console.log('2. Convert talent_groups escort fields to daily assignments');
    console.log('3. Automatically update scheduled_dates arrays via triggers');
    console.log('4. Preserve all existing data in original tables');
    
    rl.question('\nProceed with migration? (type "yes" to confirm): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Run the complete migration process
 */
async function runMigration() {
  console.log('\n=== Running Assignment Migration ===');
  
  try {
    // Import migration functions
    const migration = require('./migrate-existing-assignments');
    
    console.log('Starting migration process...');
    
    // Run talent assignments migration
    console.log('\nMigrating talent assignments...');
    await migration.migrateTalentAssignments();
    
    // Run talent groups migration
    console.log('\nMigrating talent groups...');
    await migration.migrateTalentGroups();
    
    // Run validation
    console.log('\nValidating migration results...');
    await migration.validateMigration();
    
    console.log('\n✓ Migration completed successfully!');
    
    // Print final statistics
    console.log('\nMigration Statistics:');
    console.log(`Talent Assignments - Processed: ${migration.stats.talentAssignments.processed}, Migrated: ${migration.stats.talentAssignments.migrated}, Errors: ${migration.stats.talentAssignments.errors}`);
    console.log(`Talent Groups - Processed: ${migration.stats.groupAssignments.processed}, Migrated: ${migration.stats.groupAssignments.migrated}, Errors: ${migration.stats.groupAssignments.errors}`);
    
    return true;

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    console.error('\nThe system may be in an inconsistent state.');
    console.error('Consider running the rollback script to restore the original state.');
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Assignment Migration Runner');
  console.log('===========================');
  console.log('This script migrates existing escort assignments to the new daily assignment tables.');
  
  try {
    // Check current migration status
    console.log('\nChecking current migration status...');
    const status = await checkMigrationStatus();
    
    // Get summary of data to migrate
    console.log('Analyzing data to be migrated...');
    const summary = await getMigrationSummary();
    
    if (summary.talentAssignments === 0 && summary.talentGroups === 0) {
      console.log('\n✓ No data found to migrate.');
      console.log('All talent assignments and groups either have no escort assignments or no scheduled dates.');
      process.exit(0);
    }
    
    // Confirm with user
    const confirmed = await confirmMigration(summary, status);
    if (!confirmed) {
      console.log('\nMigration cancelled by user.');
      process.exit(0);
    }
    
    // Run migration
    const success = await runMigration();
    
    if (success) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Test the new assignment functionality in your application');
      console.log('2. Once confirmed working, you can remove the old escort fields');
      console.log('3. Update your application code to use the new daily assignment tables');
    } else {
      console.log('\n❌ Migration failed. Please check the errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  }
}



if (args.includes('--test')) {
  console.log('Test mode not implemented in this script.');
  console.log('Use: node test-assignment-migration.js');
  process.exit(0);
}

// Run migration if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  checkMigrationStatus,
  getMigrationSummary,
  runMigration
};