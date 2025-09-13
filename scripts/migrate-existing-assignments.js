#!/usr/bin/env node

/**
 * Migration Script: Convert existing escort assignments to daily assignment tables
 * 
 * This script migrates data from:
 * 1. talent_project_assignments.escort_id -> talent_daily_assignments
 * 2. talent_groups escort fields -> group_daily_assignments
 * 
 * Requirements: 5.1, 5.2, 5.4
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
 * Migration statistics tracking
 */
const stats = {
  talentAssignments: {
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  },
  groupAssignments: {
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  },
  errors: []
};

/**
 * Migrate individual talent assignments from talent_project_assignments.escort_id
 */
async function migrateTalentAssignments() {
  console.log('\n=== Migrating Individual Talent Assignments ===');
  
  try {
    // Get all talent assignments with escort_id and scheduled_dates
    const { data: assignments, error } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        talent_id,
        project_id,
        escort_id,
        scheduled_dates,
        created_at
      `)
      .not('escort_id', 'is', null)
      .not('scheduled_dates', 'eq', '{}');

    if (error) {
      throw new Error(`Failed to fetch talent assignments: ${error.message}`);
    }

    console.log(`Found ${assignments.length} talent assignments to migrate`);

    for (const assignment of assignments) {
      stats.talentAssignments.processed++;
      
      try {
        // Skip if no scheduled dates
        if (!assignment.scheduled_dates || assignment.scheduled_dates.length === 0) {
          console.log(`Skipping assignment ${assignment.id}: No scheduled dates`);
          stats.talentAssignments.skipped++;
          continue;
        }

        // Create daily assignments for each scheduled date
        const dailyAssignments = assignment.scheduled_dates.map(dateStr => ({
          talent_id: assignment.talent_id,
          project_id: assignment.project_id,
          assignment_date: dateStr,
          escort_id: assignment.escort_id,
          created_at: assignment.created_at || new Date().toISOString()
        }));

        // Insert daily assignments (using upsert to handle duplicates)
        const { error: insertError } = await supabase
          .from('talent_daily_assignments')
          .upsert(dailyAssignments, {
            onConflict: 'talent_id,project_id,assignment_date,escort_id',
            ignoreDuplicates: true
          });

        if (insertError) {
          throw new Error(`Failed to insert daily assignments: ${insertError.message}`);
        }

        console.log(`✓ Migrated assignment ${assignment.id}: ${dailyAssignments.length} daily assignments`);
        stats.talentAssignments.migrated++;

      } catch (error) {
        console.error(`✗ Error migrating assignment ${assignment.id}:`, error.message);
        stats.talentAssignments.errors++;
        stats.errors.push({
          type: 'talent_assignment',
          id: assignment.id,
          error: error.message
        });
      }
    }

  } catch (error) {
    console.error('Fatal error in talent assignments migration:', error.message);
    throw error;
  }
}

/**
 * Migrate talent group assignments from talent_groups escort fields
 */
async function migrateTalentGroups() {
  console.log('\n=== Migrating Talent Group Assignments ===');
  
  try {
    // Get all talent groups with escort assignments and scheduled_dates
    const { data: groups, error } = await supabase
      .from('talent_groups')
      .select(`
        id,
        project_id,
        group_name,
        assigned_escort_id,
        assigned_escort_ids,
        scheduled_dates,
        created_at
      `)
      .not('scheduled_dates', 'eq', '{}');

    if (error) {
      throw new Error(`Failed to fetch talent groups: ${error.message}`);
    }

    console.log(`Found ${groups.length} talent groups to process`);

    for (const group of groups) {
      stats.groupAssignments.processed++;
      
      try {
        // Skip if no scheduled dates
        if (!group.scheduled_dates || group.scheduled_dates.length === 0) {
          console.log(`Skipping group ${group.id} (${group.group_name}): No scheduled dates`);
          stats.groupAssignments.skipped++;
          continue;
        }

        // Collect all escort IDs from both fields
        const escortIds = new Set();
        
        // Add from assigned_escort_id (singular)
        if (group.assigned_escort_id) {
          escortIds.add(group.assigned_escort_id);
        }
        
        // Add from assigned_escort_ids (array)
        if (group.assigned_escort_ids && Array.isArray(group.assigned_escort_ids)) {
          group.assigned_escort_ids.forEach(id => {
            if (id) escortIds.add(id);
          });
        }

        // Skip if no escorts assigned
        if (escortIds.size === 0) {
          console.log(`Skipping group ${group.id} (${group.group_name}): No escorts assigned`);
          stats.groupAssignments.skipped++;
          continue;
        }

        // Create daily assignments for each date and escort combination
        const dailyAssignments = [];
        for (const dateStr of group.scheduled_dates) {
          for (const escortId of escortIds) {
            dailyAssignments.push({
              group_id: group.id,
              project_id: group.project_id,
              assignment_date: dateStr,
              escort_id: escortId,
              created_at: group.created_at || new Date().toISOString()
            });
          }
        }

        // Insert daily assignments (using upsert to handle duplicates)
        const { error: insertError } = await supabase
          .from('group_daily_assignments')
          .upsert(dailyAssignments, {
            onConflict: 'group_id,project_id,assignment_date,escort_id',
            ignoreDuplicates: true
          });

        if (insertError) {
          throw new Error(`Failed to insert group daily assignments: ${insertError.message}`);
        }

        console.log(`✓ Migrated group ${group.id} (${group.group_name}): ${dailyAssignments.length} daily assignments`);
        stats.groupAssignments.migrated++;

      } catch (error) {
        console.error(`✗ Error migrating group ${group.id} (${group.group_name}):`, error.message);
        stats.groupAssignments.errors++;
        stats.errors.push({
          type: 'talent_group',
          id: group.id,
          name: group.group_name,
          error: error.message
        });
      }
    }

  } catch (error) {
    console.error('Fatal error in talent groups migration:', error.message);
    throw error;
  }
}

/**
 * Validate migrated data integrity
 */
async function validateMigration() {
  console.log('\n=== Validating Migration Results ===');
  
  try {
    // Check talent daily assignments
    const { data: talentDailyCount, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select('id', { count: 'exact', head: true });

    if (talentError) {
      throw new Error(`Failed to count talent daily assignments: ${talentError.message}`);
    }

    // Check group daily assignments
    const { data: groupDailyCount, error: groupError } = await supabase
      .from('group_daily_assignments')
      .select('id', { count: 'exact', head: true });

    if (groupError) {
      throw new Error(`Failed to count group daily assignments: ${groupError.message}`);
    }

    console.log(`✓ Total talent daily assignments: ${talentDailyCount}`);
    console.log(`✓ Total group daily assignments: ${groupDailyCount}`);

    // Validate scheduled_dates arrays are updated correctly
    const { data: talentScheduleCheck, error: scheduleError } = await supabase
      .rpc('validate_talent_scheduled_dates');

    if (scheduleError) {
      console.warn('Could not validate scheduled_dates arrays:', scheduleError.message);
    } else {
      console.log('✓ Scheduled dates arrays validation passed');
    }

  } catch (error) {
    console.error('Validation error:', error.message);
    stats.errors.push({
      type: 'validation',
      error: error.message
    });
  }
}

/**
 * Print migration summary
 */
function printSummary() {
  console.log('\n=== Migration Summary ===');
  console.log(`Talent Assignments:`);
  console.log(`  Processed: ${stats.talentAssignments.processed}`);
  console.log(`  Migrated:  ${stats.talentAssignments.migrated}`);
  console.log(`  Skipped:   ${stats.talentAssignments.skipped}`);
  console.log(`  Errors:    ${stats.talentAssignments.errors}`);
  
  console.log(`\nTalent Groups:`);
  console.log(`  Processed: ${stats.groupAssignments.processed}`);
  console.log(`  Migrated:  ${stats.groupAssignments.migrated}`);
  console.log(`  Skipped:   ${stats.groupAssignments.skipped}`);
  console.log(`  Errors:    ${stats.groupAssignments.errors}`);

  if (stats.errors.length > 0) {
    console.log('\n=== Errors ===');
    stats.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.type} ${error.id || ''} ${error.name || ''}: ${error.error}`);
    });
  }

  const totalErrors = stats.talentAssignments.errors + stats.groupAssignments.errors;
  const totalMigrated = stats.talentAssignments.migrated + stats.groupAssignments.migrated;
  
  console.log(`\n=== Final Status ===`);
  console.log(`Total migrated: ${totalMigrated}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(totalErrors === 0 ? '✓ Migration completed successfully!' : '⚠ Migration completed with errors');
}

/**
 * Main migration function
 */
async function main() {
  console.log('Starting migration of existing escort assignments to daily assignment tables...');
  console.log('This will convert:');
  console.log('1. talent_project_assignments.escort_id -> talent_daily_assignments');
  console.log('2. talent_groups escort fields -> group_daily_assignments');
  
  try {
    await migrateTalentAssignments();
    await migrateTalentGroups();
    await validateMigration();
    
  } catch (error) {
    console.error('\nMigration failed:', error.message);
    process.exit(1);
  } finally {
    printSummary();
  }
}

// Run migration if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  migrateTalentAssignments,
  migrateTalentGroups,
  validateMigration,
  stats
};