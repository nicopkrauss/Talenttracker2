/**
 * Script to run the coordinator role migration safely
 * This script executes the migration and verification in sequence
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function runSqlFile(filePath, description) {
  console.log(`\n🔄 ${description}...`);
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
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

async function runCoordinatorMigration() {
  console.log('🚀 Starting Coordinator Role Migration');
  console.log('=====================================');
  
  try {
    // Step 1: Check pre-migration state
    const preMigrationCounts = await checkPreMigrationState();
    
    // Step 2: Run the main migration
    await runSqlFile(
      path.join(__dirname, '../migrations/022_rename_talent_logistics_coordinator_to_coordinator.sql'),
      'Executing coordinator role migration'
    );
    
    // Step 3: Run verification
    await runSqlFile(
      path.join(__dirname, '../migrations/022_verify_coordinator_migration.sql'),
      'Verifying migration integrity'
    );
    
    // Step 4: Check post-migration state
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
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.log('\n🔄 To rollback this migration, run:');
    console.log('   node scripts/rollback-coordinator-migration.js');
    process.exit(1);
  }
}

// Run the migration
runCoordinatorMigration();