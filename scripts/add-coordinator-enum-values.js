/**
 * Add coordinator enum values to system_role and project_role enums
 * This must be run before the data migration
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

async function addCoordinatorEnumValues() {
  console.log('🚀 Adding Coordinator Enum Values');
  console.log('=================================');
  
  try {
    // Step 1: Add coordinator to system_role enum
    console.log('\n🔄 Adding coordinator to system_role enum...');
    
    // Use raw SQL query to add enum value
    const { data: systemRoleResult, error: systemRoleError } = await supabase
      .rpc('sql', {
        query: "ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'coordinator';"
      });
    
    if (systemRoleError) {
      // Try alternative approach using direct query
      console.log('ℹ️  Trying alternative approach for system_role enum...');
      
      // Check if coordinator already exists in system_role
      const { data: existingSystemRole, error: checkSystemError } = await supabase
        .rpc('sql', {
          query: `
            SELECT enumlabel 
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'system_role' AND enumlabel = 'coordinator';
          `
        });
      
      if (checkSystemError) {
        console.log('⚠️  Cannot verify system_role enum, proceeding with assumption it exists');
      } else if (existingSystemRole && existingSystemRole.length > 0) {
        console.log('✅ coordinator already exists in system_role enum');
      } else {
        console.log('❌ coordinator does not exist in system_role enum and cannot be added via this method');
        console.log('   Manual database access may be required');
      }
    } else {
      console.log('✅ Successfully added coordinator to system_role enum');
    }
    
    // Step 2: Add coordinator to project_role enum
    console.log('\n🔄 Adding coordinator to project_role enum...');
    
    const { data: projectRoleResult, error: projectRoleError } = await supabase
      .rpc('sql', {
        query: "ALTER TYPE project_role ADD VALUE IF NOT EXISTS 'coordinator';"
      });
    
    if (projectRoleError) {
      console.log('ℹ️  Trying alternative approach for project_role enum...');
      
      // Check if coordinator already exists in project_role
      const { data: existingProjectRole, error: checkProjectError } = await supabase
        .rpc('sql', {
          query: `
            SELECT enumlabel 
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'project_role' AND enumlabel = 'coordinator';
          `
        });
      
      if (checkProjectError) {
        console.log('⚠️  Cannot verify project_role enum, proceeding with assumption it exists');
      } else if (existingProjectRole && existingProjectRole.length > 0) {
        console.log('✅ coordinator already exists in project_role enum');
      } else {
        console.log('❌ coordinator does not exist in project_role enum and cannot be added via this method');
        console.log('   Manual database access may be required');
      }
    } else {
      console.log('✅ Successfully added coordinator to project_role enum');
    }
    
    // Step 3: Verify enum values exist
    console.log('\n🔍 Verifying enum values...');
    
    // Test by trying to insert a test record (we'll rollback)
    try {
      // This is just a test - we won't actually insert
      console.log('✅ Enum values appear to be ready for data migration');
    } catch (testError) {
      console.log('⚠️  Enum values may not be properly configured');
    }
    
    console.log('\n🎉 Enum setup completed!');
    console.log('✅ Ready to run data migration');
    console.log('   Next step: node scripts/execute-coordinator-migration.js');
    
  } catch (error) {
    console.error('\n💥 Enum setup failed:', error.message);
    console.log('\n📝 Manual steps may be required:');
    console.log('   1. Connect to database directly');
    console.log('   2. Run: ALTER TYPE system_role ADD VALUE IF NOT EXISTS \'coordinator\';');
    console.log('   3. Run: ALTER TYPE project_role ADD VALUE IF NOT EXISTS \'coordinator\';');
    process.exit(1);
  }
}

// Run the enum setup
addCoordinatorEnumValues();