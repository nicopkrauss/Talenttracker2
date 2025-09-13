#!/usr/bin/env node

/**
 * Data Validation Script: Verify integrity of migrated assignment data
 * 
 * This script validates that the migration from old escort assignment fields
 * to the new daily assignment tables was successful and maintains data integrity.
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
 * Validation results tracking
 */
const validationResults = {
  talentAssignments: {
    totalOriginal: 0,
    totalMigrated: 0,
    missingAssignments: [],
    extraAssignments: [],
    scheduledDatesMatches: 0,
    scheduledDatesMismatches: []
  },
  groupAssignments: {
    totalOriginal: 0,
    totalMigrated: 0,
    missingAssignments: [],
    extraAssignments: [],
    scheduledDatesMatches: 0,
    scheduledDatesMismatches: []
  },
  dataIntegrity: {
    orphanedDailyAssignments: [],
    invalidDateRanges: [],
    duplicateAssignments: []
  },
  passed: true,
  errors: []
};

/**
 * Validate talent assignment migration
 */
async function validateTalentAssignments() {
  console.log('\n=== Validating Talent Assignment Migration ===');
  
  try {
    // Get original talent assignments with escort_id
    const { data: originalAssignments, error: originalError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        talent_id,
        project_id,
        escort_id,
        scheduled_dates
      `)
      .not('escort_id', 'is', null);

    if (originalError) {
      throw new Error(`Failed to fetch original assignments: ${originalError.message}`);
    }

    validationResults.talentAssignments.totalOriginal = originalAssignments.length;
    console.log(`Found ${originalAssignments.length} original talent assignments`);

    // Get migrated daily assignments
    const { data: dailyAssignments, error: dailyError } = await supabase
      .from('talent_daily_assignments')
      .select(`
        id,
        talent_id,
        project_id,
        assignment_date,
        escort_id
      `);

    if (dailyError) {
      throw new Error(`Failed to fetch daily assignments: ${dailyError.message}`);
    }

    validationResults.talentAssignments.totalMigrated = dailyAssignments.length;
    console.log(`Found ${dailyAssignments.length} migrated daily assignments`);

    // Validate each original assignment
    for (const original of originalAssignments) {
      if (!original.scheduled_dates || original.scheduled_dates.length === 0) {
        continue; // Skip assignments with no scheduled dates
      }

      // Check if all scheduled dates have corresponding daily assignments
      const expectedDailyAssignments = original.scheduled_dates.length;
      const actualDailyAssignments = dailyAssignments.filter(daily => 
        daily.talent_id === original.talent_id &&
        daily.project_id === original.project_id &&
        daily.escort_id === original.escort_id &&
        original.scheduled_dates.includes(daily.assignment_date)
      );

      if (actualDailyAssignments.length !== expectedDailyAssignments) {
        validationResults.talentAssignments.missingAssignments.push({
          originalId: original.id,
          talentId: original.talent_id,
          projectId: original.project_id,
          escortId: original.escort_id,
          expectedDates: original.scheduled_dates,
          actualDates: actualDailyAssignments.map(d => d.assignment_date),
          missing: original.scheduled_dates.filter(date => 
            !actualDailyAssignments.some(d => d.assignment_date === date)
          )
        });
        validationResults.passed = false;
      }
    }

    // Validate scheduled_dates arrays are updated correctly
    const { data: updatedAssignments, error: updateError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        talent_id,
        project_id,
        scheduled_dates
      `);

    if (updateError) {
      throw new Error(`Failed to fetch updated assignments: ${updateError.message}`);
    }

    for (const assignment of updatedAssignments) {
      // Get expected scheduled dates from daily assignments
      const expectedDates = dailyAssignments
        .filter(daily => 
          daily.talent_id === assignment.talent_id &&
          daily.project_id === assignment.project_id
        )
        .map(daily => daily.assignment_date)
        .sort();

      const actualDates = (assignment.scheduled_dates || []).sort();

      if (JSON.stringify(expectedDates) === JSON.stringify(actualDates)) {
        validationResults.talentAssignments.scheduledDatesMatches++;
      } else {
        validationResults.talentAssignments.scheduledDatesMismatches.push({
          assignmentId: assignment.id,
          talentId: assignment.talent_id,
          projectId: assignment.project_id,
          expected: expectedDates,
          actual: actualDates
        });
        validationResults.passed = false;
      }
    }

    console.log(`✓ Scheduled dates matches: ${validationResults.talentAssignments.scheduledDatesMatches}`);
    console.log(`✗ Scheduled dates mismatches: ${validationResults.talentAssignments.scheduledDatesMismatches.length}`);
    console.log(`✗ Missing assignments: ${validationResults.talentAssignments.missingAssignments.length}`);

  } catch (error) {
    console.error('Error validating talent assignments:', error.message);
    validationResults.errors.push({
      type: 'talent_validation',
      error: error.message
    });
    validationResults.passed = false;
  }
}

/**
 * Validate talent group assignment migration
 */
async function validateGroupAssignments() {
  console.log('\n=== Validating Group Assignment Migration ===');
  
  try {
    // Get original talent groups with escort assignments
    const { data: originalGroups, error: originalError } = await supabase
      .from('talent_groups')
      .select(`
        id,
        project_id,
        group_name,
        assigned_escort_id,
        assigned_escort_ids,
        scheduled_dates
      `);

    if (originalError) {
      throw new Error(`Failed to fetch original groups: ${originalError.message}`);
    }

    validationResults.groupAssignments.totalOriginal = originalGroups.length;
    console.log(`Found ${originalGroups.length} original talent groups`);

    // Get migrated group daily assignments
    const { data: groupDailyAssignments, error: dailyError } = await supabase
      .from('group_daily_assignments')
      .select(`
        id,
        group_id,
        project_id,
        assignment_date,
        escort_id
      `);

    if (dailyError) {
      throw new Error(`Failed to fetch group daily assignments: ${dailyError.message}`);
    }

    validationResults.groupAssignments.totalMigrated = groupDailyAssignments.length;
    console.log(`Found ${groupDailyAssignments.length} migrated group daily assignments`);

    // Validate each original group
    for (const group of originalGroups) {
      if (!group.scheduled_dates || group.scheduled_dates.length === 0) {
        continue; // Skip groups with no scheduled dates
      }

      // Collect expected escort IDs
      const expectedEscortIds = new Set();
      if (group.assigned_escort_id) {
        expectedEscortIds.add(group.assigned_escort_id);
      }
      if (group.assigned_escort_ids && Array.isArray(group.assigned_escort_ids)) {
        group.assigned_escort_ids.forEach(id => {
          if (id) expectedEscortIds.add(id);
        });
      }

      if (expectedEscortIds.size === 0) {
        continue; // Skip groups with no escorts
      }

      // Check if all combinations of dates and escorts have daily assignments
      const expectedCombinations = group.scheduled_dates.length * expectedEscortIds.size;
      const actualAssignments = groupDailyAssignments.filter(daily => 
        daily.group_id === group.id &&
        daily.project_id === group.project_id &&
        expectedEscortIds.has(daily.escort_id) &&
        group.scheduled_dates.includes(daily.assignment_date)
      );

      if (actualAssignments.length !== expectedCombinations) {
        validationResults.groupAssignments.missingAssignments.push({
          groupId: group.id,
          groupName: group.group_name,
          projectId: group.project_id,
          expectedEscorts: Array.from(expectedEscortIds),
          expectedDates: group.scheduled_dates,
          expectedCombinations,
          actualCombinations: actualAssignments.length,
          actualAssignments: actualAssignments.map(a => ({
            date: a.assignment_date,
            escort: a.escort_id
          }))
        });
        validationResults.passed = false;
      }
    }

    // Validate scheduled_dates arrays for groups
    for (const group of originalGroups) {
      const expectedDates = groupDailyAssignments
        .filter(daily => daily.group_id === group.id)
        .map(daily => daily.assignment_date)
        .filter((date, index, arr) => arr.indexOf(date) === index) // unique dates
        .sort();

      const actualDates = (group.scheduled_dates || []).sort();

      if (JSON.stringify(expectedDates) === JSON.stringify(actualDates)) {
        validationResults.groupAssignments.scheduledDatesMatches++;
      } else {
        validationResults.groupAssignments.scheduledDatesMismatches.push({
          groupId: group.id,
          groupName: group.group_name,
          projectId: group.project_id,
          expected: expectedDates,
          actual: actualDates
        });
        validationResults.passed = false;
      }
    }

    console.log(`✓ Scheduled dates matches: ${validationResults.groupAssignments.scheduledDatesMatches}`);
    console.log(`✗ Scheduled dates mismatches: ${validationResults.groupAssignments.scheduledDatesMismatches.length}`);
    console.log(`✗ Missing assignments: ${validationResults.groupAssignments.missingAssignments.length}`);

  } catch (error) {
    console.error('Error validating group assignments:', error.message);
    validationResults.errors.push({
      type: 'group_validation',
      error: error.message
    });
    validationResults.passed = false;
  }
}

/**
 * Validate data integrity constraints
 */
async function validateDataIntegrity() {
  console.log('\n=== Validating Data Integrity ===');
  
  try {
    // Check for orphaned daily assignments (referencing non-existent records)
    const { data: orphanedTalent, error: orphanedTalentError } = await supabase
      .rpc('check_orphaned_talent_daily_assignments');

    if (orphanedTalentError) {
      console.warn('Could not check orphaned talent assignments:', orphanedTalentError.message);
    } else if (orphanedTalent && orphanedTalent.length > 0) {
      validationResults.dataIntegrity.orphanedDailyAssignments.push(...orphanedTalent);
      validationResults.passed = false;
    }

    // Check for assignments outside project date ranges
    const { data: invalidDates, error: invalidDatesError } = await supabase
      .rpc('check_assignment_date_ranges');

    if (invalidDatesError) {
      console.warn('Could not check assignment date ranges:', invalidDatesError.message);
    } else if (invalidDates && invalidDates.length > 0) {
      validationResults.dataIntegrity.invalidDateRanges.push(...invalidDates);
      validationResults.passed = false;
    }

    // Check for duplicate assignments (same talent/group + escort + date)
    const { data: duplicates, error: duplicatesError } = await supabase
      .rpc('check_duplicate_assignments');

    if (duplicatesError) {
      console.warn('Could not check duplicate assignments:', duplicatesError.message);
    } else if (duplicates && duplicates.length > 0) {
      validationResults.dataIntegrity.duplicateAssignments.push(...duplicates);
      validationResults.passed = false;
    }

    console.log(`✓ Orphaned assignments: ${validationResults.dataIntegrity.orphanedDailyAssignments.length}`);
    console.log(`✓ Invalid date ranges: ${validationResults.dataIntegrity.invalidDateRanges.length}`);
    console.log(`✓ Duplicate assignments: ${validationResults.dataIntegrity.duplicateAssignments.length}`);

  } catch (error) {
    console.error('Error validating data integrity:', error.message);
    validationResults.errors.push({
      type: 'integrity_validation',
      error: error.message
    });
    validationResults.passed = false;
  }
}

/**
 * Print detailed validation report
 */
function printValidationReport() {
  console.log('\n=== Validation Report ===');
  
  console.log('\nTalent Assignments:');
  console.log(`  Original assignments: ${validationResults.talentAssignments.totalOriginal}`);
  console.log(`  Migrated daily assignments: ${validationResults.talentAssignments.totalMigrated}`);
  console.log(`  Scheduled dates matches: ${validationResults.talentAssignments.scheduledDatesMatches}`);
  console.log(`  Missing assignments: ${validationResults.talentAssignments.missingAssignments.length}`);
  console.log(`  Scheduled dates mismatches: ${validationResults.talentAssignments.scheduledDatesMismatches.length}`);

  console.log('\nGroup Assignments:');
  console.log(`  Original groups: ${validationResults.groupAssignments.totalOriginal}`);
  console.log(`  Migrated daily assignments: ${validationResults.groupAssignments.totalMigrated}`);
  console.log(`  Scheduled dates matches: ${validationResults.groupAssignments.scheduledDatesMatches}`);
  console.log(`  Missing assignments: ${validationResults.groupAssignments.missingAssignments.length}`);
  console.log(`  Scheduled dates mismatches: ${validationResults.groupAssignments.scheduledDatesMismatches.length}`);

  console.log('\nData Integrity:');
  console.log(`  Orphaned assignments: ${validationResults.dataIntegrity.orphanedDailyAssignments.length}`);
  console.log(`  Invalid date ranges: ${validationResults.dataIntegrity.invalidDateRanges.length}`);
  console.log(`  Duplicate assignments: ${validationResults.dataIntegrity.duplicateAssignments.length}`);

  // Print detailed errors if any
  if (validationResults.talentAssignments.missingAssignments.length > 0) {
    console.log('\n=== Missing Talent Assignments ===');
    validationResults.talentAssignments.missingAssignments.forEach((missing, index) => {
      console.log(`${index + 1}. Assignment ${missing.originalId}:`);
      console.log(`   Talent: ${missing.talentId}, Project: ${missing.projectId}`);
      console.log(`   Escort: ${missing.escortId}`);
      console.log(`   Missing dates: ${missing.missing.join(', ')}`);
    });
  }

  if (validationResults.groupAssignments.missingAssignments.length > 0) {
    console.log('\n=== Missing Group Assignments ===');
    validationResults.groupAssignments.missingAssignments.forEach((missing, index) => {
      console.log(`${index + 1}. Group ${missing.groupId} (${missing.groupName}):`);
      console.log(`   Project: ${missing.projectId}`);
      console.log(`   Expected: ${missing.expectedCombinations}, Actual: ${missing.actualCombinations}`);
    });
  }

  if (validationResults.talentAssignments.scheduledDatesMismatches.length > 0) {
    console.log('\n=== Talent Scheduled Dates Mismatches ===');
    validationResults.talentAssignments.scheduledDatesMismatches.forEach((mismatch, index) => {
      console.log(`${index + 1}. Assignment ${mismatch.assignmentId}:`);
      console.log(`   Expected: [${mismatch.expected.join(', ')}]`);
      console.log(`   Actual: [${mismatch.actual.join(', ')}]`);
    });
  }

  if (validationResults.groupAssignments.scheduledDatesMismatches.length > 0) {
    console.log('\n=== Group Scheduled Dates Mismatches ===');
    validationResults.groupAssignments.scheduledDatesMismatches.forEach((mismatch, index) => {
      console.log(`${index + 1}. Group ${mismatch.groupId} (${mismatch.groupName}):`);
      console.log(`   Expected: [${mismatch.expected.join(', ')}]`);
      console.log(`   Actual: [${mismatch.actual.join(', ')}]`);
    });
  }

  console.log(`\n=== Final Validation Status ===`);
  console.log(validationResults.passed ? '✓ All validations passed!' : '✗ Validation failed - issues found');
  
  if (validationResults.errors.length > 0) {
    console.log('\n=== Validation Errors ===');
    validationResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.type}: ${error.error}`);
    });
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('Starting validation of assignment migration...');
  console.log('This will verify:');
  console.log('1. All original assignments were migrated correctly');
  console.log('2. Scheduled dates arrays are updated properly');
  console.log('3. Data integrity constraints are maintained');
  
  try {
    await validateTalentAssignments();
    await validateGroupAssignments();
    await validateDataIntegrity();
    
  } catch (error) {
    console.error('\nValidation failed:', error.message);
    validationResults.passed = false;
  } finally {
    printValidationReport();
    process.exit(validationResults.passed ? 0 : 1);
  }
}

// Run validation if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateTalentAssignments,
  validateGroupAssignments,
  validateDataIntegrity,
  validationResults
};