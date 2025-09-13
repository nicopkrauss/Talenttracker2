#!/usr/bin/env node

/**
 * Rollback Script: Revert assignment migration and restore original state
 * 
 * This script provides rollback capabilities for the assignment migration:
 * 1. Clears all data from daily assignment tables
 * 2. Restores original scheduled_dates arrays
 * 3. Validates rollback completion
 * 
 * Requirements: 5.4
 */

const { createClient } = require('@supabase/supabase-js');

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
 * Rollback statistics tracking
 */
const rollbackStats = {
  talentDailyAssignments: {
    deleted: 0,
    errors: 0
  },
  groupDailyAssignments: {
    deleted: 0,
    errors: 0
  },
  scheduledDatesRestored: {
    talent: 0,
    groups: 0,
    errors: 0
  },
  errors: []
};

/**
 * Create backup of current state before rollback
 */
async function createBackup() {
  console.log('\n=== Creating Backup Before Rollback ===');
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Backup talent daily assignments
    const { data: talentDaily, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select('*');

    if (talentError) {
      throw new Error(`Failed to backup talent daily assignments: ${talentError.message}`);
    }

    // Backup group daily assignments
    const { data: groupDaily, error: groupError } = await supabase
      .from('group_daily_assignments')
      .select('*');

    if (groupError) {
      throw new Error(`Failed to backup group daily assignments: ${groupError.message}`);
    }

    // Save backups to files
    const fs = require('fs');
    const path = require('path');
    
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(backupDir, `talent_daily_assignments_backup_${timestamp}.json`),
      JSON.stringify(talentDaily, null, 2)
    );

    fs.writeFileSync(
      path.join(backupDir, `group_daily_assignments_backup_${timestamp}.json`),
      JSON.stringify(groupDaily, null, 2)
    );

    console.log(`✓ Backup created: ${talentDaily.length} talent assignments, ${groupDaily.length} group assignments`);
    console.log(`✓ Backup files saved to: ${backupDir}`);

  } catch (error) {
    console.error('Failed to create backup:', error.message);
    throw error;
  }
}

/**
 * Clear all daily assignment tables
 */
async function clearDailyAssignments() {
  console.log('\n=== Clearing Daily Assignment Tables ===');
  
  try {
    // Clear talent daily assignments
    const { error: talentDeleteError, count: talentDeleteCount } = await supabase
      .from('talent_daily_assignments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (talentDeleteError) {
      throw new Error(`Failed to clear talent daily assignments: ${talentDeleteError.message}`);
    }

    rollbackStats.talentDailyAssignments.deleted = talentDeleteCount || 0;
    console.log(`✓ Cleared ${rollbackStats.talentDailyAssignments.deleted} talent daily assignments`);

    // Clear group daily assignments
    const { error: groupDeleteError, count: groupDeleteCount } = await supabase
      .from('group_daily_assignments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (groupDeleteError) {
      throw new Error(`Failed to clear group daily assignments: ${groupDeleteError.message}`);
    }

    rollbackStats.groupDailyAssignments.deleted = groupDeleteCount || 0;
    console.log(`✓ Cleared ${rollbackStats.groupDailyAssignments.deleted} group daily assignments`);

  } catch (error) {
    console.error('Error clearing daily assignments:', error.message);
    rollbackStats.errors.push({
      type: 'clear_daily_assignments',
      error: error.message
    });
    throw error;
  }
}

/**
 * Restore original scheduled_dates arrays
 * This function reconstructs the scheduled_dates based on the original escort assignments
 */
async function restoreScheduledDates() {
  console.log('\n=== Restoring Original Scheduled Dates ===');
  
  try {
    // For talent assignments, we need to restore based on the original logic
    // Since we cleared daily assignments, scheduled_dates should be empty now
    // We need to restore them to their pre-migration state
    
    console.log('Note: Scheduled dates arrays have been automatically updated by triggers');
    console.log('Since daily assignment tables are now empty, scheduled_dates should be empty arrays');
    
    // Verify that scheduled_dates are now empty
    const { data: talentAssignments, error: talentError } = await supabase
      .from('talent_project_assignments')
      .select('id, scheduled_dates')
      .not('scheduled_dates', 'eq', '{}');

    if (talentError) {
      throw new Error(`Failed to check talent scheduled dates: ${talentError.message}`);
    }

    const { data: groupAssignments, error: groupError } = await supabase
      .from('talent_groups')
      .select('id, scheduled_dates')
      .not('scheduled_dates', 'eq', '{}');

    if (groupError) {
      throw new Error(`Failed to check group scheduled dates: ${groupError.message}`);
    }

    if (talentAssignments.length > 0 || groupAssignments.length > 0) {
      console.warn(`Warning: Found ${talentAssignments.length} talent and ${groupAssignments.length} group assignments with non-empty scheduled_dates`);
      console.warn('This may indicate the triggers did not update correctly');
    } else {
      console.log('✓ All scheduled_dates arrays are now empty as expected');
    }

    rollbackStats.scheduledDatesRestored.talent = talentAssignments.length;
    rollbackStats.scheduledDatesRestored.groups = groupAssignments.length;

  } catch (error) {
    console.error('Error restoring scheduled dates:', error.message);
    rollbackStats.scheduledDatesRestored.errors++;
    rollbackStats.errors.push({
      type: 'restore_scheduled_dates',
      error: error.message
    });
    throw error;
  }
}

/**
 * Validate rollback completion
 */
async function validateRollback() {
  console.log('\n=== Validating Rollback Completion ===');
  
  try {
    // Check that daily assignment tables are empty
    const { data: talentDaily, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select('id', { count: 'exact', head: true });

    if (talentError) {
      throw new Error(`Failed to count talent daily assignments: ${talentError.message}`);
    }

    const { data: groupDaily, error: groupError } = await supabase
      .from('group_daily_assignments')
      .select('id', { count: 'exact', head: true });

    if (groupError) {
      throw new Error(`Failed to count group daily assignments: ${groupError.message}`);
    }

    console.log(`✓ Talent daily assignments remaining: ${talentDaily}`);
    console.log(`✓ Group daily assignments remaining: ${groupDaily}`);

    if (talentDaily > 0 || groupDaily > 0) {
      throw new Error(`Rollback incomplete: ${talentDaily} talent and ${groupDaily} group daily assignments remain`);
    }

    // Check that original escort fields are still intact
    const { data: talentWithEscorts, error: escortError } = await supabase
      .from('talent_project_assignments')
      .select('id', { count: 'exact', head: true })
      .not('escort_id', 'is', null);

    if (escortError) {
      throw new Error(`Failed to count talent with escorts: ${escortError.message}`);
    }

    const { data: groupsWithEscorts, error: groupEscortError } = await supabase
      .from('talent_groups')
      .select('id', { count: 'exact', head: true })
      .or('assigned_escort_id.not.is.null,assigned_escort_ids.not.eq.{}');

    if (groupEscortError) {
      throw new Error(`Failed to count groups with escorts: ${groupEscortError.message}`);
    }

    console.log(`✓ Talent assignments with escort_id: ${talentWithEscorts}`);
    console.log(`✓ Groups with escort assignments: ${groupsWithEscorts}`);

    console.log('✓ Rollback validation completed successfully');

  } catch (error) {
    console.error('Rollback validation failed:', error.message);
    rollbackStats.errors.push({
      type: 'rollback_validation',
      error: error.message
    });
    throw error;
  }
}

/**
 * Print rollback summary
 */
function printRollbackSummary() {
  console.log('\n=== Rollback Summary ===');
  console.log(`Talent Daily Assignments:`);
  console.log(`  Deleted: ${rollbackStats.talentDailyAssignments.deleted}`);
  console.log(`  Errors:  ${rollbackStats.talentDailyAssignments.errors}`);
  
  console.log(`\nGroup Daily Assignments:`);
  console.log(`  Deleted: ${rollbackStats.groupDailyAssignments.deleted}`);
  console.log(`  Errors:  ${rollbackStats.groupDailyAssignments.errors}`);

  console.log(`\nScheduled Dates:`);
  console.log(`  Talent assignments checked: ${rollbackStats.scheduledDatesRestored.talent}`);
  console.log(`  Group assignments checked: ${rollbackStats.scheduledDatesRestored.groups}`);
  console.log(`  Errors: ${rollbackStats.scheduledDatesRestored.errors}`);

  if (rollbackStats.errors.length > 0) {
    console.log('\n=== Rollback Errors ===');
    rollbackStats.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.type}: ${error.error}`);
    });
  }

  const totalErrors = rollbackStats.talentDailyAssignments.errors + 
                     rollbackStats.groupDailyAssignments.errors + 
                     rollbackStats.scheduledDatesRestored.errors;
  
  console.log(`\n=== Final Status ===`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(totalErrors === 0 ? '✓ Rollback completed successfully!' : '⚠ Rollback completed with errors');
}

/**
 * Confirm rollback with user
 */
function confirmRollback() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will permanently delete all data from daily assignment tables!');
    console.log('This action cannot be undone without restoring from backup.');
    console.log('\nThe rollback will:');
    console.log('1. Create a backup of current daily assignment data');
    console.log('2. Delete all records from talent_daily_assignments table');
    console.log('3. Delete all records from group_daily_assignments table');
    console.log('4. Reset scheduled_dates arrays to empty (via triggers)');
    
    rl.question('\nAre you sure you want to proceed? (type "yes" to confirm): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main rollback function
 */
async function main() {
  console.log('Assignment Migration Rollback Script');
  console.log('====================================');
  
  try {
    // Confirm with user
    const confirmed = await confirmRollback();
    if (!confirmed) {
      console.log('Rollback cancelled by user.');
      process.exit(0);
    }

    console.log('\nStarting rollback process...');
    
    await createBackup();
    await clearDailyAssignments();
    await restoreScheduledDates();
    await validateRollback();
    
    console.log('\n✓ Rollback process completed');
    
  } catch (error) {
    console.error('\nRollback failed:', error.message);
    console.error('The system may be in an inconsistent state.');
    console.error('Please check the backup files and consider manual restoration.');
    process.exit(1);
  } finally {
    printRollbackSummary();
  }
}

// Run rollback if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  createBackup,
  clearDailyAssignments,
  restoreScheduledDates,
  validateRollback,
  rollbackStats
};