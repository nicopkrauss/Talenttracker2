#!/usr/bin/env node

/**
 * Test Script: Comprehensive testing of assignment migration
 * 
 * This script tests the complete migration workflow:
 * 1. Creates test data in the old format
 * 2. Runs the migration
 * 3. Validates the results
 * 4. Tests rollback functionality
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
 * Test data and results tracking
 */
const testData = {
  projects: [],
  talents: [],
  profiles: [],
  talentAssignments: [],
  talentGroups: [],
  createdIds: {
    projects: [],
    talents: [],
    profiles: [],
    talentAssignments: [],
    talentGroups: []
  }
};

const testResults = {
  setup: { passed: false, errors: [] },
  migration: { passed: false, errors: [] },
  validation: { passed: false, errors: [] },
  rollback: { passed: false, errors: [] },
  cleanup: { passed: false, errors: [] }
};

/**
 * Generate test UUID
 */
function generateTestId() {
  return 'test-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Create test data in the old format
 */
async function setupTestData() {
  console.log('\n=== Setting Up Test Data ===');
  
  try {
    // Create test project
    const testProject = {
      id: generateTestId(),
      name: 'Test Migration Project',
      production_company: 'Test Company',
      location: 'Test Location',
      description: 'Test project for migration',
      start_date: '2024-01-01',
      end_date: '2024-01-10',
      status: 'active'
    };

    const { error: projectError } = await supabase
      .from('projects')
      .insert(testProject);

    if (projectError) {
      throw new Error(`Failed to create test project: ${projectError.message}`);
    }

    testData.createdIds.projects.push(testProject.id);
    console.log(`✓ Created test project: ${testProject.id}`);

    // Create test profiles (escorts)
    const testProfiles = [
      {
        id: generateTestId(),
        full_name: 'Test Escort 1',
        email: 'escort1@test.com',
        status: 'active'
      },
      {
        id: generateTestId(),
        full_name: 'Test Escort 2',
        email: 'escort2@test.com',
        status: 'active'
      },
      {
        id: generateTestId(),
        full_name: 'Test Escort 3',
        email: 'escort3@test.com',
        status: 'active'
      }
    ];

    for (const profile of testProfiles) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profile);

      if (profileError) {
        throw new Error(`Failed to create test profile: ${profileError.message}`);
      }

      testData.createdIds.profiles.push(profile.id);
    }
    console.log(`✓ Created ${testProfiles.length} test profiles`);

    // Create test talents
    const testTalents = [
      {
        id: generateTestId(),
        first_name: 'Test',
        last_name: 'Talent 1',
        rep_name: 'Rep 1',
        rep_email: 'rep1@test.com'
      },
      {
        id: generateTestId(),
        first_name: 'Test',
        last_name: 'Talent 2',
        rep_name: 'Rep 2',
        rep_email: 'rep2@test.com'
      }
    ];

    for (const talent of testTalents) {
      const { error: talentError } = await supabase
        .from('talent')
        .insert(talent);

      if (talentError) {
        throw new Error(`Failed to create test talent: ${talentError.message}`);
      }

      testData.createdIds.talents.push(talent.id);
    }
    console.log(`✓ Created ${testTalents.length} test talents`);

    // Create test talent assignments with old format
    const testTalentAssignments = [
      {
        id: generateTestId(),
        talent_id: testTalents[0].id,
        project_id: testProject.id,
        escort_id: testProfiles[0].id,
        scheduled_dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
        status: 'active'
      },
      {
        id: generateTestId(),
        talent_id: testTalents[1].id,
        project_id: testProject.id,
        escort_id: testProfiles[1].id,
        scheduled_dates: ['2024-01-02', '2024-01-03', '2024-01-04'],
        status: 'active'
      }
    ];

    for (const assignment of testTalentAssignments) {
      const { error: assignmentError } = await supabase
        .from('talent_project_assignments')
        .insert(assignment);

      if (assignmentError) {
        throw new Error(`Failed to create test talent assignment: ${assignmentError.message}`);
      }

      testData.createdIds.talentAssignments.push(assignment.id);
    }
    console.log(`✓ Created ${testTalentAssignments.length} test talent assignments`);

    // Create test talent groups with old format
    const testTalentGroups = [
      {
        id: generateTestId(),
        project_id: testProject.id,
        group_name: 'Test Group 1',
        members: JSON.stringify([{ id: testTalents[0].id, name: 'Test Talent 1' }]),
        assigned_escort_id: testProfiles[0].id,
        scheduled_dates: ['2024-01-05', '2024-01-06']
      },
      {
        id: generateTestId(),
        project_id: testProject.id,
        group_name: 'Test Group 2',
        members: JSON.stringify([{ id: testTalents[1].id, name: 'Test Talent 2' }]),
        assigned_escort_ids: [testProfiles[1].id, testProfiles[2].id],
        scheduled_dates: ['2024-01-07', '2024-01-08']
      }
    ];

    for (const group of testTalentGroups) {
      const { error: groupError } = await supabase
        .from('talent_groups')
        .insert(group);

      if (groupError) {
        throw new Error(`Failed to create test talent group: ${groupError.message}`);
      }

      testData.createdIds.talentGroups.push(group.id);
    }
    console.log(`✓ Created ${testTalentGroups.length} test talent groups`);

    testResults.setup.passed = true;
    console.log('✓ Test data setup completed successfully');

  } catch (error) {
    console.error('Test data setup failed:', error.message);
    testResults.setup.errors.push(error.message);
    throw error;
  }
}

/**
 * Run the migration and test it
 */
async function testMigration() {
  console.log('\n=== Testing Migration ===');
  
  try {
    // Import and run the migration
    const migration = require('./migrate-existing-assignments');
    
    await migration.migrateTalentAssignments();
    await migration.migrateTalentGroups();
    
    // Verify migration results
    const { data: talentDaily, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select('*')
      .in('project_id', testData.createdIds.projects);

    if (talentError) {
      throw new Error(`Failed to fetch migrated talent assignments: ${talentError.message}`);
    }

    const { data: groupDaily, error: groupError } = await supabase
      .from('group_daily_assignments')
      .select('*')
      .in('project_id', testData.createdIds.projects);

    if (groupError) {
      throw new Error(`Failed to fetch migrated group assignments: ${groupError.message}`);
    }

    console.log(`✓ Migrated ${talentDaily.length} talent daily assignments`);
    console.log(`✓ Migrated ${groupDaily.length} group daily assignments`);

    // Expected counts:
    // Talent 1: 3 dates = 3 daily assignments
    // Talent 2: 3 dates = 3 daily assignments
    // Group 1: 2 dates × 1 escort = 2 daily assignments
    // Group 2: 2 dates × 2 escorts = 4 daily assignments
    // Total expected: 6 talent + 6 group = 12 daily assignments

    const expectedTalentDaily = 6; // 3 + 3
    const expectedGroupDaily = 6;  // 2 + 4

    if (talentDaily.length !== expectedTalentDaily) {
      throw new Error(`Expected ${expectedTalentDaily} talent daily assignments, got ${talentDaily.length}`);
    }

    if (groupDaily.length !== expectedGroupDaily) {
      throw new Error(`Expected ${expectedGroupDaily} group daily assignments, got ${groupDaily.length}`);
    }

    testResults.migration.passed = true;
    console.log('✓ Migration test completed successfully');

  } catch (error) {
    console.error('Migration test failed:', error.message);
    testResults.migration.errors.push(error.message);
    throw error;
  }
}

/**
 * Test validation functionality
 */
async function testValidation() {
  console.log('\n=== Testing Validation ===');
  
  try {
    // Import and run validation
    const validation = require('./validate-assignment-migration');
    
    await validation.validateTalentAssignments();
    await validation.validateGroupAssignments();
    await validation.validateDataIntegrity();

    if (!validation.validationResults.passed) {
      throw new Error('Validation failed - see validation results for details');
    }

    testResults.validation.passed = true;
    console.log('✓ Validation test completed successfully');

  } catch (error) {
    console.error('Validation test failed:', error.message);
    testResults.validation.errors.push(error.message);
    throw error;
  }
}

/**
 * Test rollback functionality
 */
async function testRollback() {
  console.log('\n=== Testing Rollback ===');
  
  try {
    // Import and run rollback (without user confirmation)
    const rollback = require('./rollback-assignment-migration');
    
    await rollback.createBackup();
    await rollback.clearDailyAssignments();
    await rollback.restoreScheduledDates();
    await rollback.validateRollback();

    // Verify rollback worked
    const { data: talentDaily, error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select('id', { count: 'exact', head: true })
      .in('project_id', testData.createdIds.projects);

    if (talentError) {
      throw new Error(`Failed to check talent daily assignments after rollback: ${talentError.message}`);
    }

    const { data: groupDaily, error: groupError } = await supabase
      .from('group_daily_assignments')
      .select('id', { count: 'exact', head: true })
      .in('project_id', testData.createdIds.projects);

    if (groupError) {
      throw new Error(`Failed to check group daily assignments after rollback: ${groupError.message}`);
    }

    if (talentDaily > 0 || groupDaily > 0) {
      throw new Error(`Rollback incomplete: ${talentDaily} talent and ${groupDaily} group assignments remain`);
    }

    testResults.rollback.passed = true;
    console.log('✓ Rollback test completed successfully');

  } catch (error) {
    console.error('Rollback test failed:', error.message);
    testResults.rollback.errors.push(error.message);
    throw error;
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('\n=== Cleaning Up Test Data ===');
  
  try {
    // Delete in reverse order of creation to respect foreign key constraints
    
    // Delete talent groups
    if (testData.createdIds.talentGroups.length > 0) {
      const { error: groupError } = await supabase
        .from('talent_groups')
        .delete()
        .in('id', testData.createdIds.talentGroups);

      if (groupError) {
        console.warn(`Failed to delete test talent groups: ${groupError.message}`);
      } else {
        console.log(`✓ Deleted ${testData.createdIds.talentGroups.length} test talent groups`);
      }
    }

    // Delete talent assignments
    if (testData.createdIds.talentAssignments.length > 0) {
      const { error: assignmentError } = await supabase
        .from('talent_project_assignments')
        .delete()
        .in('id', testData.createdIds.talentAssignments);

      if (assignmentError) {
        console.warn(`Failed to delete test talent assignments: ${assignmentError.message}`);
      } else {
        console.log(`✓ Deleted ${testData.createdIds.talentAssignments.length} test talent assignments`);
      }
    }

    // Delete talents
    if (testData.createdIds.talents.length > 0) {
      const { error: talentError } = await supabase
        .from('talent')
        .delete()
        .in('id', testData.createdIds.talents);

      if (talentError) {
        console.warn(`Failed to delete test talents: ${talentError.message}`);
      } else {
        console.log(`✓ Deleted ${testData.createdIds.talents.length} test talents`);
      }
    }

    // Delete profiles
    if (testData.createdIds.profiles.length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .in('id', testData.createdIds.profiles);

      if (profileError) {
        console.warn(`Failed to delete test profiles: ${profileError.message}`);
      } else {
        console.log(`✓ Deleted ${testData.createdIds.profiles.length} test profiles`);
      }
    }

    // Delete projects
    if (testData.createdIds.projects.length > 0) {
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .in('id', testData.createdIds.projects);

      if (projectError) {
        console.warn(`Failed to delete test projects: ${projectError.message}`);
      } else {
        console.log(`✓ Deleted ${testData.createdIds.projects.length} test projects`);
      }
    }

    // Clean up any remaining daily assignments
    const { error: dailyCleanupError } = await supabase
      .from('talent_daily_assignments')
      .delete()
      .in('project_id', testData.createdIds.projects);

    if (dailyCleanupError) {
      console.warn(`Failed to cleanup daily assignments: ${dailyCleanupError.message}`);
    }

    const { error: groupDailyCleanupError } = await supabase
      .from('group_daily_assignments')
      .delete()
      .in('project_id', testData.createdIds.projects);

    if (groupDailyCleanupError) {
      console.warn(`Failed to cleanup group daily assignments: ${groupDailyCleanupError.message}`);
    }

    testResults.cleanup.passed = true;
    console.log('✓ Test data cleanup completed');

  } catch (error) {
    console.error('Cleanup failed:', error.message);
    testResults.cleanup.errors.push(error.message);
  }
}

/**
 * Print comprehensive test results
 */
function printTestResults() {
  console.log('\n=== Test Results Summary ===');
  
  const phases = [
    { name: 'Setup', result: testResults.setup },
    { name: 'Migration', result: testResults.migration },
    { name: 'Validation', result: testResults.validation },
    { name: 'Rollback', result: testResults.rollback },
    { name: 'Cleanup', result: testResults.cleanup }
  ];

  phases.forEach(phase => {
    const status = phase.result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${phase.name}: ${status}`);
    
    if (phase.result.errors.length > 0) {
      phase.result.errors.forEach(error => {
        console.log(`  Error: ${error}`);
      });
    }
  });

  const allPassed = phases.every(phase => phase.result.passed);
  console.log(`\n=== Overall Result ===`);
  console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
  
  return allPassed;
}

/**
 * Main test function
 */
async function main() {
  console.log('Assignment Migration Test Suite');
  console.log('===============================');
  console.log('This will test the complete migration workflow with test data');
  
  let allTestsPassed = false;
  
  try {
    await setupTestData();
    await testMigration();
    await testValidation();
    await testRollback();
    
    allTestsPassed = true;
    
  } catch (error) {
    console.error('\nTest suite failed:', error.message);
  } finally {
    await cleanupTestData();
    allTestsPassed = printTestResults() && allTestsPassed;
    process.exit(allTestsPassed ? 0 : 1);
  }
}

// Run tests if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  setupTestData,
  testMigration,
  testValidation,
  testRollback,
  cleanupTestData,
  testResults
};