/**
 * Verify coordinator role migration completion
 * Run this script after executing the manual SQL migration
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

async function verifyCoordinatorMigration() {
  console.log('🔍 Verifying Coordinator Role Migration');
  console.log('=======================================');
  
  try {
    // Step 1: Check for remaining old role names
    console.log('\n📊 Checking for remaining old role names...');
    
    const { data: remainingProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (profilesError) {
      if (profilesError.message.includes('invalid input value for enum')) {
        console.log('❌ talent_logistics_coordinator enum value still exists in system_role');
        console.log('   This suggests the enum cleanup step hasn\'t been completed yet');
      } else {
        throw profilesError;
      }
    }
    
    const { data: remainingTemplates, error: templatesError } = await supabase
      .from('project_role_templates')
      .select('id, role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (templatesError) {
      if (templatesError.message.includes('invalid input value for enum')) {
        console.log('❌ talent_logistics_coordinator enum value still exists in project_role');
      } else {
        throw templatesError;
      }
    }
    
    const { data: remainingAssignments, error: assignmentsError } = await supabase
      .from('team_assignments')
      .select('id, role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (assignmentsError) {
      if (assignmentsError.message.includes('invalid input value for enum')) {
        console.log('❌ talent_logistics_coordinator enum value still exists in project_role (team_assignments)');
      } else {
        throw assignmentsError;
      }
    }
    
    // Step 2: Check for new coordinator roles
    console.log('\n📈 Checking migrated coordinator roles...');
    
    const { data: coordinatorProfiles, error: coordProfilesError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'coordinator');
    
    if (coordProfilesError) {
      if (coordProfilesError.message.includes('invalid input value for enum')) {
        console.log('❌ coordinator enum value does not exist in system_role');
        console.log('   The enum addition step may not have been completed');
        return false;
      } else {
        throw coordProfilesError;
      }
    }
    
    const { data: coordinatorTemplates, error: coordTemplatesError } = await supabase
      .from('project_role_templates')
      .select('id, role')
      .eq('role', 'coordinator');
    
    if (coordTemplatesError) {
      if (coordTemplatesError.message.includes('invalid input value for enum')) {
        console.log('❌ coordinator enum value does not exist in project_role');
        return false;
      } else {
        throw coordTemplatesError;
      }
    }
    
    const { data: coordinatorAssignments, error: coordAssignmentsError } = await supabase
      .from('team_assignments')
      .select('id, role')
      .eq('role', 'coordinator');
    
    if (coordAssignmentsError) {
      if (coordAssignmentsError.message.includes('invalid input value for enum')) {
        console.log('❌ coordinator enum value does not exist in project_role (team_assignments)');
        return false;
      } else {
        throw coordAssignmentsError;
      }
    }
    
    // Step 3: Report results
    console.log('\n📋 Migration Verification Results:');
    console.log('==================================');
    
    const remainingOldRoles = (remainingProfiles?.length || 0) + 
                             (remainingTemplates?.length || 0) + 
                             (remainingAssignments?.length || 0);
    
    const newCoordinatorRoles = (coordinatorProfiles?.length || 0) + 
                               (coordinatorTemplates?.length || 0) + 
                               (coordinatorAssignments?.length || 0);
    
    console.log(`📊 Old role records remaining: ${remainingOldRoles}`);
    console.log(`   - Profiles: ${remainingProfiles?.length || 0}`);
    console.log(`   - Templates: ${remainingTemplates?.length || 0}`);
    console.log(`   - Assignments: ${remainingAssignments?.length || 0}`);
    
    console.log(`📊 New coordinator records: ${newCoordinatorRoles}`);
    console.log(`   - Profiles: ${coordinatorProfiles?.length || 0}`);
    console.log(`   - Templates: ${coordinatorTemplates?.length || 0}`);
    console.log(`   - Assignments: ${coordinatorAssignments?.length || 0}`);
    
    // Step 4: Determine migration status
    if (remainingOldRoles === 0 && newCoordinatorRoles > 0) {
      console.log('\n✅ MIGRATION SUCCESSFUL');
      console.log('   ✓ No old role names remain in database');
      console.log('   ✓ Coordinator roles found in database');
      console.log('   ✓ Data migration completed successfully');
      
      // Step 5: Test data integrity
      console.log('\n🔍 Testing data integrity...');
      
      // Test that we can query coordinator roles without errors
      const { data: testQuery, error: testError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('role', 'coordinator')
        .limit(1);
      
      if (testError) {
        console.log('⚠️  Warning: Error querying coordinator roles:', testError.message);
      } else {
        console.log('✅ Data integrity test passed');
      }
      
      console.log('\n🎉 Database migration completed successfully!');
      console.log('   Next steps:');
      console.log('   1. All application code has already been updated');
      console.log('   2. Test the application to ensure coordinator role works correctly');
      console.log('   3. Consider removing old enum values in a future migration');
      
      return true;
      
    } else if (remainingOldRoles > 0 && newCoordinatorRoles === 0) {
      console.log('\n❌ MIGRATION NOT STARTED');
      console.log('   ✗ Old role names still exist');
      console.log('   ✗ No coordinator roles found');
      console.log('   → Run the manual SQL migration commands');
      
      return false;
      
    } else if (remainingOldRoles > 0 && newCoordinatorRoles > 0) {
      console.log('\n⚠️  MIGRATION PARTIALLY COMPLETE');
      console.log('   ⚠ Both old and new role names exist');
      console.log('   → Check if migration was interrupted');
      console.log('   → Re-run the UPDATE commands from the SQL migration');
      
      return false;
      
    } else {
      console.log('\n❓ UNCLEAR MIGRATION STATE');
      console.log('   → Manual investigation required');
      console.log('   → Check database schema and data manually');
      
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 Verification failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure the manual SQL commands were executed successfully');
    console.log('   2. Check Supabase dashboard for any error messages');
    console.log('   3. Verify database connection and permissions');
    return false;
  }
}

// Run the verification
verifyCoordinatorMigration()
  .then(success => {
    if (success) {
      console.log('\n✅ Verification completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Verification failed - manual intervention required');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Verification script failed:', error.message);
    process.exit(1);
  });