/**
 * Execute coordinator role migration using direct SQL execution
 * This script runs the migration step by step using individual SQL commands
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

async function executeSQL(sql, description) {
  console.log(`\n🔄 ${description}...`);
  
  try {
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error(`❌ Error in ${description}:`, error);
      throw error;
    }
    
    console.log(`✅ ${description} completed successfully`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to execute ${description}:`, error.message);
    throw error;
  }
}

async function checkPreMigrationState() {
  console.log('\n📊 Checking pre-migration state...');
  
  try {
    // Check current role counts
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (profilesError) throw profilesError;
    
    const { data: templatesData, error: templatesError } = await supabase
      .from('project_role_templates')
      .select('role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (templatesError) throw templatesError;
    
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('team_assignments')
      .select('role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (assignmentsError) throw assignmentsError;
    
    console.log('📈 Pre-migration counts:');
    console.log(`   - Profiles with talent_logistics_coordinator: ${profilesData.length}`);
    console.log(`   - Role templates with talent_logistics_coordinator: ${templatesData.length}`);
    console.log(`   - Team assignments with talent_logistics_coordinator: ${assignmentsData.length}`);
    
    return {
      profiles: profilesData.length,
      templates: templatesData.length,
      assignments: assignmentsData.length
    };
  } catch (error) {
    console.error('❌ Error checking pre-migration state:', error.message);
    throw error;
  }
}

async function executeCoordinatorMigration() {
  console.log('🚀 Starting Coordinator Role Migration');
  console.log('=====================================');
  
  try {
    // Step 1: Check pre-migration state
    const preMigrationCounts = await checkPreMigrationState();
    
    if (preMigrationCounts.profiles === 0 && preMigrationCounts.templates === 0 && preMigrationCounts.assignments === 0) {
      console.log('ℹ️  No talent_logistics_coordinator roles found. Migration may already be complete.');
      return;
    }
    
    // Step 2: Update profiles table
    console.log('\n🔄 Updating profiles table...');
    const { data: profilesUpdate, error: profilesError } = await supabase
      .from('profiles')
      .update({ role: 'coordinator' })
      .eq('role', 'talent_logistics_coordinator')
      .select();
    
    if (profilesError) throw profilesError;
    console.log(`✅ Updated ${profilesUpdate.length} profiles to coordinator role`);
    
    // Step 3: Update project_role_templates table
    console.log('\n🔄 Updating project_role_templates table...');
    const { data: templatesUpdate, error: templatesError } = await supabase
      .from('project_role_templates')
      .update({ role: 'coordinator' })
      .eq('role', 'talent_logistics_coordinator')
      .select();
    
    if (templatesError) throw templatesError;
    console.log(`✅ Updated ${templatesUpdate.length} project role templates to coordinator role`);
    
    // Step 4: Update team_assignments table
    console.log('\n🔄 Updating team_assignments table...');
    const { data: assignmentsUpdate, error: assignmentsError } = await supabase
      .from('team_assignments')
      .update({ role: 'coordinator' })
      .eq('role', 'talent_logistics_coordinator')
      .select();
    
    if (assignmentsError) throw assignmentsError;
    console.log(`✅ Updated ${assignmentsUpdate.length} team assignments to coordinator role`);
    
    // Step 5: Verify no old role names remain
    console.log('\n🔍 Verifying migration completion...');
    
    const { data: remainingProfiles, error: verifyProfilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'talent_logistics_coordinator');
    
    if (verifyProfilesError) throw verifyProfilesError;
    
    const { data: remainingTemplates, error: verifyTemplatesError } = await supabase
      .from('project_role_templates')
      .select('id')
      .eq('role', 'talent_logistics_coordinator');
    
    if (verifyTemplatesError) throw verifyTemplatesError;
    
    const { data: remainingAssignments, error: verifyAssignmentsError } = await supabase
      .from('team_assignments')
      .select('id')
      .eq('role', 'talent_logistics_coordinator');
    
    if (verifyAssignmentsError) throw verifyAssignmentsError;
    
    if (remainingProfiles.length > 0 || remainingTemplates.length > 0 || remainingAssignments.length > 0) {
      throw new Error(`Migration incomplete: ${remainingProfiles.length} profiles, ${remainingTemplates.length} templates, ${remainingAssignments.length} assignments still have old role name`);
    }
    
    console.log('✅ Verification passed: No old role names remain');
    
    // Step 6: Check post-migration state
    console.log('\n📊 Checking post-migration state...');
    
    const { data: coordinatorProfiles, error: coordError } = await supabase
      .from('profiles')
      .select('role')
      .eq('role', 'coordinator');
    
    if (coordError) throw coordError;
    
    const { data: coordinatorTemplates, error: templError } = await supabase
      .from('project_role_templates')
      .select('role')
      .eq('role', 'coordinator');
    
    if (templError) throw templError;
    
    const { data: coordinatorAssignments, error: assignError } = await supabase
      .from('team_assignments')
      .select('role')
      .eq('role', 'coordinator');
    
    if (assignError) throw assignError;
    
    console.log('📈 Post-migration counts:');
    console.log(`   - Profiles with coordinator: ${coordinatorProfiles.length}`);
    console.log(`   - Role templates with coordinator: ${coordinatorTemplates.length}`);
    console.log(`   - Team assignments with coordinator: ${coordinatorAssignments.length}`);
    
    // Verify counts match
    if (coordinatorProfiles.length !== preMigrationCounts.profiles ||
        coordinatorTemplates.length !== preMigrationCounts.templates ||
        coordinatorAssignments.length !== preMigrationCounts.assignments) {
      throw new Error('Migration count mismatch detected!');
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ All data integrity checks passed');
    console.log('✅ Record counts match pre-migration state');
    console.log(`✅ Successfully migrated ${preMigrationCounts.profiles + preMigrationCounts.templates + preMigrationCounts.assignments} records`);
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.log('\n🔄 To investigate or rollback, check the database state manually');
    process.exit(1);
  }
}

// Run the migration
executeCoordinatorMigration();