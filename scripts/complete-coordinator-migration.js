/**
 * Complete coordinator role migration using step-by-step approach
 * This script handles both enum creation and data migration
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

async function checkCurrentState() {
  console.log('\n📊 Checking current database state...');
  
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
    
    // Check if coordinator roles already exist
    const { data: coordinatorProfiles, error: coordProfilesError } = await supabase
      .from('profiles')
      .select('role')
      .eq('role', 'coordinator');
    
    if (coordProfilesError) throw coordProfilesError;
    
    const { data: coordinatorTemplates, error: coordTemplatesError } = await supabase
      .from('project_role_templates')
      .select('role')
      .eq('role', 'coordinator');
    
    if (coordTemplatesError) throw coordTemplatesError;
    
    const { data: coordinatorAssignments, error: coordAssignmentsError } = await supabase
      .from('team_assignments')
      .select('role')
      .eq('role', 'coordinator');
    
    if (coordAssignmentsError) throw coordAssignmentsError;
    
    console.log('📈 Current state:');
    console.log(`   - Profiles with talent_logistics_coordinator: ${profilesData.length}`);
    console.log(`   - Role templates with talent_logistics_coordinator: ${templatesData.length}`);
    console.log(`   - Team assignments with talent_logistics_coordinator: ${assignmentsData.length}`);
    console.log(`   - Profiles with coordinator: ${coordinatorProfiles.length}`);
    console.log(`   - Role templates with coordinator: ${coordinatorTemplates.length}`);
    console.log(`   - Team assignments with coordinator: ${coordinatorAssignments.length}`);
    
    return {
      oldRoles: {
        profiles: profilesData.length,
        templates: templatesData.length,
        assignments: assignmentsData.length
      },
      newRoles: {
        profiles: coordinatorProfiles.length,
        templates: coordinatorTemplates.length,
        assignments: coordinatorAssignments.length
      }
    };
  } catch (error) {
    console.error('❌ Error checking current state:', error.message);
    throw error;
  }
}

async function testCoordinatorEnum() {
  console.log('\n🧪 Testing coordinator enum availability...');
  
  try {
    // Try to create a test profile with coordinator role to see if enum exists
    // We'll use a fake UUID that won't conflict
    const testId = '00000000-0000-0000-0000-000000000000';
    
    // First, try to insert (this will fail if enum doesn't exist)
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        full_name: 'Test Coordinator',
        email: 'test@example.com',
        role: 'coordinator',
        status: 'pending'
      })
      .select();
    
    if (error) {
      if (error.message.includes('invalid input value for enum')) {
        console.log('❌ coordinator enum value does not exist in system_role');
        return false;
      } else if (error.message.includes('duplicate key')) {
        console.log('✅ coordinator enum exists (got expected duplicate key error)');
        return true;
      } else {
        console.log('⚠️  Unexpected error testing enum:', error.message);
        return false;
      }
    } else {
      // If insert succeeded, clean it up
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testId);
      
      console.log('✅ coordinator enum exists and works');
      return true;
    }
  } catch (error) {
    console.log('⚠️  Error testing coordinator enum:', error.message);
    return false;
  }
}

async function migrateDataManually() {
  console.log('\n🔄 Attempting manual data migration...');
  
  try {
    // Since we can't add enum values via the client, we'll provide manual instructions
    console.log('📝 Manual migration steps required:');
    console.log('');
    console.log('1. Connect to your Supabase database using the SQL Editor or psql');
    console.log('2. Run the following SQL commands:');
    console.log('');
    console.log('   -- Add coordinator to system_role enum');
    console.log("   ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'coordinator';");
    console.log('');
    console.log('   -- Add coordinator to project_role enum');
    console.log("   ALTER TYPE project_role ADD VALUE IF NOT EXISTS 'coordinator';");
    console.log('');
    console.log('   -- Update profiles table');
    console.log("   UPDATE profiles SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';");
    console.log('');
    console.log('   -- Update project_role_templates table');
    console.log("   UPDATE project_role_templates SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';");
    console.log('');
    console.log('   -- Update team_assignments table');
    console.log("   UPDATE team_assignments SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';");
    console.log('');
    console.log('3. After running these commands, run this script again to verify the migration');
    console.log('');
    
    return false; // Indicates manual steps are needed
  } catch (error) {
    console.error('❌ Error in manual migration setup:', error.message);
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration completion...');
  
  try {
    // Check that no old role names remain
    const { data: remainingProfiles, error: verifyProfilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (verifyProfilesError) throw verifyProfilesError;
    
    const { data: remainingTemplates, error: verifyTemplatesError } = await supabase
      .from('project_role_templates')
      .select('id, role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (verifyTemplatesError) throw verifyTemplatesError;
    
    const { data: remainingAssignments, error: verifyAssignmentsError } = await supabase
      .from('team_assignments')
      .select('id, role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (verifyAssignmentsError) throw verifyAssignmentsError;
    
    // Check coordinator roles exist
    const { data: coordinatorProfiles, error: coordProfilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'coordinator');
    
    if (coordProfilesError) throw coordProfilesError;
    
    const { data: coordinatorTemplates, error: coordTemplatesError } = await supabase
      .from('project_role_templates')
      .select('id, role')
      .eq('role', 'coordinator');
    
    if (coordTemplatesError) throw coordTemplatesError;
    
    const { data: coordinatorAssignments, error: coordAssignmentsError } = await supabase
      .from('team_assignments')
      .select('id, role')
      .eq('role', 'coordinator');
    
    if (coordAssignmentsError) throw coordAssignmentsError;
    
    console.log('📊 Migration verification results:');
    console.log(`   - Remaining talent_logistics_coordinator profiles: ${remainingProfiles.length}`);
    console.log(`   - Remaining talent_logistics_coordinator templates: ${remainingTemplates.length}`);
    console.log(`   - Remaining talent_logistics_coordinator assignments: ${remainingAssignments.length}`);
    console.log(`   - New coordinator profiles: ${coordinatorProfiles.length}`);
    console.log(`   - New coordinator templates: ${coordinatorTemplates.length}`);
    console.log(`   - New coordinator assignments: ${coordinatorAssignments.length}`);
    
    const migrationComplete = remainingProfiles.length === 0 && 
                             remainingTemplates.length === 0 && 
                             remainingAssignments.length === 0;
    
    if (migrationComplete) {
      console.log('\n✅ Migration verification PASSED');
      console.log('   - No old role names remain in database');
      console.log('   - All data has been successfully migrated to coordinator role');
      return true;
    } else {
      console.log('\n❌ Migration verification FAILED');
      console.log('   - Old role names still exist in database');
      console.log('   - Manual intervention may be required');
      
      if (remainingProfiles.length > 0) {
        console.log(`   - Profiles still using old role: ${remainingProfiles.map(p => p.full_name).join(', ')}`);
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error verifying migration:', error.message);
    throw error;
  }
}

async function completeCoordinatorMigration() {
  console.log('🚀 Complete Coordinator Role Migration');
  console.log('=====================================');
  
  try {
    // Step 1: Check current state
    const currentState = await checkCurrentState();
    
    // Step 2: Test if coordinator enum exists
    const enumExists = await testCoordinatorEnum();
    
    if (!enumExists) {
      console.log('\n⚠️  Coordinator enum values do not exist');
      await migrateDataManually();
      return;
    }
    
    // Step 3: If enum exists, try to migrate data
    if (currentState.oldRoles.profiles > 0 || currentState.oldRoles.templates > 0 || currentState.oldRoles.assignments > 0) {
      console.log('\n🔄 Migrating data to coordinator role...');
      
      // Update profiles
      if (currentState.oldRoles.profiles > 0) {
        const { data: profilesUpdate, error: profilesError } = await supabase
          .from('profiles')
          .update({ role: 'coordinator' })
          .eq('role', 'talent_logistics_coordinator')
          .select();
        
        if (profilesError) throw profilesError;
        console.log(`✅ Updated ${profilesUpdate.length} profiles to coordinator role`);
      }
      
      // Update project_role_templates
      if (currentState.oldRoles.templates > 0) {
        const { data: templatesUpdate, error: templatesError } = await supabase
          .from('project_role_templates')
          .update({ role: 'coordinator' })
          .eq('role', 'talent_logistics_coordinator')
          .select();
        
        if (templatesError) throw templatesError;
        console.log(`✅ Updated ${templatesUpdate.length} project role templates to coordinator role`);
      }
      
      // Update team_assignments
      if (currentState.oldRoles.assignments > 0) {
        const { data: assignmentsUpdate, error: assignmentsError } = await supabase
          .from('team_assignments')
          .update({ role: 'coordinator' })
          .eq('role', 'talent_logistics_coordinator')
          .select();
        
        if (assignmentsError) throw assignmentsError;
        console.log(`✅ Updated ${assignmentsUpdate.length} team assignments to coordinator role`);
      }
    } else {
      console.log('\n ℹ️ No old role data found to migrate');
    }
    
    // Step 4: Verify migration
    const migrationSuccess = await verifyMigration();
    
    if (migrationSuccess) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('✅ All data integrity checks passed');
      console.log('✅ Database migration is complete');
    } else {
      console.log('\n⚠️  Migration verification failed');
      console.log('   Manual review may be required');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.log('\n🔄 Check database state and try manual migration if needed');
    process.exit(1);
  }
}

// Run the complete migration
completeCoordinatorMigration();