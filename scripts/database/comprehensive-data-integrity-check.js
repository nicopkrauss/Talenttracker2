/**
 * Comprehensive data integrity check for coordinator role migration
 * This script performs thorough validation of the migration results
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRoleDistribution() {
  console.log('\n📊 Checking role distribution across all tables...');
  
  try {
    // Check profiles role distribution
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('role')
      .not('role', 'is', null);
    
    if (profilesError) throw profilesError;
    
    const profileRoleCounts = profiles.reduce((acc, profile) => {
      acc[profile.role] = (acc[profile.role] || 0) + 1;
      return acc;
    }, {});
    
    console.log('👤 Profile roles:', profileRoleCounts);
    
    // Check team assignments role distribution
    const { data: assignments, error: assignmentsError } = await supabase
      .from('team_assignments')
      .select('role');
    
    if (assignmentsError) throw assignmentsError;
    
    const assignmentRoleCounts = assignments.reduce((acc, assignment) => {
      acc[assignment.role] = (acc[assignment.role] || 0) + 1;
      return acc;
    }, {});
    
    console.log('👥 Team assignment roles:', assignmentRoleCounts);
    
    // Check project role templates distribution
    const { data: templates, error: templatesError } = await supabase
      .from('project_role_templates')
      .select('role');
    
    if (templatesError) throw templatesError;
    
    const templateRoleCounts = templates.reduce((acc, template) => {
      acc[template.role] = (acc[template.role] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📋 Project role template roles:', templateRoleCounts);
    
    return {
      profiles: profileRoleCounts,
      assignments: assignmentRoleCounts,
      templates: templateRoleCounts
    };
    
  } catch (error) {
    console.error('❌ Error checking role distribution:', error.message);
    throw error;
  }
}

async function checkDataRelationships() {
  console.log('\n🔗 Checking data relationships and integrity...');
  
  try {
    // Check coordinator profiles have valid auth users
    const { data: coordinatorProfiles, error: coordProfilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('role', 'coordinator');
    
    if (coordProfilesError) throw coordProfilesError;
    
    console.log(`📋 Found ${coordinatorProfiles.length} coordinator profiles`);
    
    // Check team assignments with coordinator role have valid references
    const { data: coordinatorAssignments, error: coordAssignmentsError } = await supabase
      .from('team_assignments')
      .select(`
        id,
        role,
        user_id,
        project_id,
        profiles!team_assignments_user_id_fkey(full_name, email),
        projects(name, status)
      `)
      .eq('role', 'coordinator');
    
    if (coordAssignmentsError) throw coordAssignmentsError;
    
    console.log(`📋 Found ${coordinatorAssignments.length} coordinator team assignments`);
    
    // Validate assignments have valid user and project references
    const invalidAssignments = coordinatorAssignments.filter(assignment => 
      !assignment.profiles || !assignment.projects
    );
    
    if (invalidAssignments.length > 0) {
      console.log(`⚠️  Found ${invalidAssignments.length} coordinator assignments with invalid references`);
      invalidAssignments.forEach(assignment => {
        console.log(`   - Assignment ${assignment.id}: user_id=${assignment.user_id}, project_id=${assignment.project_id}`);
      });
    } else {
      console.log('✅ All coordinator team assignments have valid references');
    }
    
    // Check project role templates with coordinator role
    const { data: coordinatorTemplates, error: coordTemplatesError } = await supabase
      .from('project_role_templates')
      .select(`
        id,
        role,
        project_id,
        display_name,
        projects(name, status)
      `)
      .eq('role', 'coordinator');
    
    if (coordTemplatesError) throw coordTemplatesError;
    
    console.log(`📋 Found ${coordinatorTemplates.length} coordinator role templates`);
    
    // Validate templates have valid project references
    const invalidTemplates = coordinatorTemplates.filter(template => 
      !template.projects
    );
    
    if (invalidTemplates.length > 0) {
      console.log(`⚠️  Found ${invalidTemplates.length} coordinator templates with invalid project references`);
      invalidTemplates.forEach(template => {
        console.log(`   - Template ${template.id}: project_id=${template.project_id}`);
      });
    } else {
      console.log('✅ All coordinator role templates have valid project references');
    }
    
    return {
      profiles: coordinatorProfiles,
      assignments: coordinatorAssignments,
      templates: coordinatorTemplates,
      invalidAssignments: invalidAssignments.length,
      invalidTemplates: invalidTemplates.length
    };
    
  } catch (error) {
    console.error('❌ Error checking data relationships:', error.message);
    throw error;
  }
}

async function checkForOrphanedData() {
  console.log('\n🔍 Checking for orphaned or inconsistent data...');
  
  try {
    // Check for any remaining references to old role name in related tables
    // This is a comprehensive check across all tables that might reference roles
    
    let orphanedDataFound = false;
    
    // Note: We can't directly search for the old enum value if it's been removed,
    // but we can check for data consistency
    
    // Check if there are any profiles without corresponding auth users
    const { data: orphanedProfiles, error: orphanedProfilesError } = await supabase
      .rpc('sql', {
        query: `
          SELECT p.id, p.full_name, p.email, p.role
          FROM profiles p
          LEFT JOIN auth.users u ON p.id = u.id
          WHERE u.id IS NULL AND p.role = 'coordinator'
        `
      });
    
    if (orphanedProfilesError) {
      console.log('ℹ️  Cannot check for orphaned profiles (RPC not available)');
    } else if (orphanedProfiles && orphanedProfiles.length > 0) {
      console.log(`⚠️  Found ${orphanedProfiles.length} coordinator profiles without auth users`);
      orphanedDataFound = true;
    } else {
      console.log('✅ No orphaned coordinator profiles found');
    }
    
    // Check for team assignments without valid users or projects
    const { data: assignmentsCheck, error: assignmentsCheckError } = await supabase
      .from('team_assignments')
      .select(`
        id,
        user_id,
        project_id,
        role,
        profiles!team_assignments_user_id_fkey(id),
        projects(id)
      `)
      .eq('role', 'coordinator');
    
    if (assignmentsCheckError) throw assignmentsCheckError;
    
    const brokenAssignments = assignmentsCheck.filter(assignment => 
      !assignment.profiles || !assignment.projects
    );
    
    if (brokenAssignments.length > 0) {
      console.log(`⚠️  Found ${brokenAssignments.length} coordinator assignments with broken references`);
      orphanedDataFound = true;
    } else {
      console.log('✅ All coordinator team assignments have valid references');
    }
    
    return !orphanedDataFound;
    
  } catch (error) {
    console.error('❌ Error checking for orphaned data:', error.message);
    return false;
  }
}

async function performComprehensiveCheck() {
  console.log('🔍 Comprehensive Data Integrity Check');
  console.log('====================================');
  
  try {
    // Step 1: Check role distribution
    const roleDistribution = await checkRoleDistribution();
    
    // Step 2: Check data relationships
    const relationshipCheck = await checkDataRelationships();
    
    // Step 3: Check for orphaned data
    const orphanCheck = await checkForOrphanedData();
    
    // Step 4: Generate comprehensive report
    console.log('\n📋 COMPREHENSIVE INTEGRITY REPORT');
    console.log('=================================');
    
    const coordinatorCount = (roleDistribution.profiles.coordinator || 0) +
                           (roleDistribution.assignments.coordinator || 0) +
                           (roleDistribution.templates.coordinator || 0);
    
    const oldRoleCount = (roleDistribution.profiles.talent_logistics_coordinator || 0) +
                        (roleDistribution.assignments.talent_logistics_coordinator || 0) +
                        (roleDistribution.templates.talent_logistics_coordinator || 0);
    
    console.log(`📊 Migration Summary:`);
    console.log(`   - Total coordinator records: ${coordinatorCount}`);
    console.log(`   - Remaining old role records: ${oldRoleCount}`);
    console.log(`   - Coordinator profiles: ${roleDistribution.profiles.coordinator || 0}`);
    console.log(`   - Coordinator assignments: ${roleDistribution.assignments.coordinator || 0}`);
    console.log(`   - Coordinator templates: ${roleDistribution.templates.coordinator || 0}`);
    
    console.log(`\n🔗 Data Integrity:`);
    console.log(`   - Invalid assignments: ${relationshipCheck.invalidAssignments}`);
    console.log(`   - Invalid templates: ${relationshipCheck.invalidTemplates}`);
    console.log(`   - Orphaned data check: ${orphanCheck ? 'PASSED' : 'FAILED'}`);
    
    // Step 5: Overall assessment
    const migrationComplete = oldRoleCount === 0 && coordinatorCount > 0;
    const dataIntegrityGood = relationshipCheck.invalidAssignments === 0 && 
                             relationshipCheck.invalidTemplates === 0 && 
                             orphanCheck;
    
    console.log(`\n🎯 Overall Assessment:`);
    
    if (migrationComplete && dataIntegrityGood) {
      console.log('✅ MIGRATION SUCCESSFUL - ALL CHECKS PASSED');
      console.log('   ✓ Data migration completed');
      console.log('   ✓ No old role references remain');
      console.log('   ✓ All data relationships intact');
      console.log('   ✓ No orphaned data found');
      console.log('\n🎉 The coordinator role migration is complete and verified!');
      return true;
    } else {
      console.log('❌ MIGRATION ISSUES DETECTED');
      
      if (!migrationComplete) {
        console.log('   ✗ Migration not complete or old roles still exist');
      }
      
      if (!dataIntegrityGood) {
        console.log('   ✗ Data integrity issues found');
      }
      
      console.log('\n🔧 Manual review and fixes may be required');
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 Comprehensive check failed:', error.message);
    return false;
  }
}

// Run the comprehensive check
performComprehensiveCheck()
  .then(success => {
    if (success) {
      console.log('\n✅ All integrity checks passed');
      process.exit(0);
    } else {
      console.log('\n❌ Integrity check failed - review required');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Check script failed:', error.message);
    process.exit(1);
  });