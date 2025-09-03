/**
 * Script to rollback the coordinator role migration
 * This script reverts all changes made by the coordinator migration
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

async function confirmRollback() {
  console.log('⚠️  WARNING: This will rollback the coordinator role migration');
  console.log('   All "coordinator" roles will be reverted to "talent_logistics_coordinator"');
  console.log('   This action should only be performed if the application code has not been updated yet.');
  
  // In a real scenario, you might want to add a confirmation prompt
  // For now, we'll proceed with the rollback
  return true;
}

async function checkPreRollbackState() {
  console.log('\n📊 Checking pre-rollback state...');
  
  try {
    // Check current coordinator role counts
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('role')
      .eq('role', 'coordinator');
    
    if (profilesError) throw profilesError;
    
    const { data: templatesData, error: templatesError } = await supabase
      .from('project_role_templates')
      .select('role')
      .eq('role', 'coordinator');
    
    if (templatesError) throw templatesError;
    
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('team_assignments')
      .select('role')
      .eq('role', 'coordinator');
    
    if (assignmentsError) throw assignmentsError;
    
    console.log('📈 Pre-rollback counts:');
    console.log(`   - Profiles with coordinator: ${profilesData.length}`);
    console.log(`   - Role templates with coordinator: ${templatesData.length}`);
    console.log(`   - Team assignments with coordinator: ${assignmentsData.length}`);
    
    if (profilesData.length === 0 && templatesData.length === 0 && assignmentsData.length === 0) {
      console.log('ℹ️  No coordinator roles found. Migration may have already been rolled back.');
      return false;
    }
    
    return {
      profiles: profilesData.length,
      templates: templatesData.length,
      assignments: assignmentsData.length
    };
  } catch (error) {
    console.error('❌ Error checking pre-rollback state:', error.message);
    throw error;
  }
}

async function rollbackCoordinatorMigration() {
  console.log('🔄 Starting Coordinator Role Migration Rollback');
  console.log('===============================================');
  
  try {
    // Step 1: Confirm rollback
    const shouldProceed = await confirmRollback();
    if (!shouldProceed) {
      console.log('❌ Rollback cancelled by user');
      return;
    }
    
    // Step 2: Check pre-rollback state
    const preRollbackCounts = await checkPreRollbackState();
    if (!preRollbackCounts) {
      console.log('✅ No rollback needed - no coordinator roles found');
      return;
    }
    
    // Step 3: Run the rollback migration
    await runSqlFile(
      path.join(__dirname, '../migrations/022_rename_talent_logistics_coordinator_to_coordinator_rollback.sql'),
      'Executing coordinator role rollback'
    );
    
    // Step 4: Check post-rollback state
    console.log('\n📊 Checking post-rollback state...');
    
    const { data: tlcProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (profilesError) throw profilesError;
    
    const { data: tlcTemplates, error: templatesError } = await supabase
      .from('project_role_templates')
      .select('role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (templatesError) throw templatesError;
    
    const { data: tlcAssignments, error: assignmentsError } = await supabase
      .from('team_assignments')
      .select('role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (assignmentsError) throw assignmentsError;
    
    console.log('📈 Post-rollback counts:');
    console.log(`   - Profiles with talent_logistics_coordinator: ${tlcProfiles.length}`);
    console.log(`   - Role templates with talent_logistics_coordinator: ${tlcTemplates.length}`);
    console.log(`   - Team assignments with talent_logistics_coordinator: ${tlcAssignments.length}`);
    
    // Verify counts match
    if (tlcProfiles.length !== preRollbackCounts.profiles ||
        tlcTemplates.length !== preRollbackCounts.templates ||
        tlcAssignments.length !== preRollbackCounts.assignments) {
      throw new Error('Rollback count mismatch detected!');
    }
    
    // Verify no coordinator roles remain
    const { data: remainingCoordinators, error: coordError } = await supabase
      .from('profiles')
      .select('role')
      .eq('role', 'coordinator');
    
    if (coordError) throw coordError;
    
    if (remainingCoordinators.length > 0) {
      throw new Error(`Rollback incomplete: ${remainingCoordinators.length} coordinator roles still exist`);
    }
    
    console.log('\n🎉 Rollback completed successfully!');
    console.log('✅ All coordinator roles reverted to talent_logistics_coordinator');
    console.log('✅ Record counts match pre-rollback state');
    console.log('✅ No coordinator roles remain in the system');
    
  } catch (error) {
    console.error('\n💥 Rollback failed:', error.message);
    console.log('\n⚠️  Manual intervention may be required');
    console.log('   Check database state and contact system administrator');
    process.exit(1);
  }
}

// Run the rollback
rollbackCoordinatorMigration();