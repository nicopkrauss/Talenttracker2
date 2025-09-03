/**
 * Remove old talent_logistics_coordinator enum values from database
 * This script creates the SQL commands needed to remove the old enum values
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

async function testEnumValues() {
  console.log('\n🧪 Testing if old enum values still exist...');
  
  try {
    // Test if we can still reference the old enum value
    // This will fail if the enum value has been removed
    
    // Test system_role enum
    console.log('🔍 Testing system_role enum...');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'talent_logistics_coordinator')
        .limit(1);
      
      if (error) {
        if (error.message.includes('invalid input value for enum')) {
          console.log('✅ talent_logistics_coordinator removed from system_role enum');
        } else {
          console.log('⚠️  Unexpected error:', error.message);
        }
      } else {
        console.log('❌ talent_logistics_coordinator still exists in system_role enum');
        return { systemRoleHasOld: true, projectRoleHasOld: false };
      }
    } catch (e) {
      console.log('⚠️  Error testing system_role:', e.message);
    }
    
    // Test project_role enum
    console.log('🔍 Testing project_role enum...');
    try {
      const { data, error } = await supabase
        .from('team_assignments')
        .select('id')
        .eq('role', 'talent_logistics_coordinator')
        .limit(1);
      
      if (error) {
        if (error.message.includes('invalid input value for enum')) {
          console.log('✅ talent_logistics_coordinator removed from project_role enum');
        } else {
          console.log('⚠️  Unexpected error:', error.message);
        }
      } else {
        console.log('❌ talent_logistics_coordinator still exists in project_role enum');
        return { systemRoleHasOld: false, projectRoleHasOld: true };
      }
    } catch (e) {
      console.log('⚠️  Error testing project_role:', e.message);
    }
    
    return { systemRoleHasOld: false, projectRoleHasOld: false };
    
  } catch (error) {
    console.error('❌ Error testing enum values:', error.message);
    return null;
  }
}

async function generateEnumCleanupSQL() {
  console.log('\n📝 Generating enum cleanup SQL...');
  
  // Since we can't directly remove enum values, we need to recreate the enums
  const cleanupSQL = `
-- ============================================================================
-- ENUM CLEANUP: Remove talent_logistics_coordinator from enums
-- Execute these commands to remove old enum values
-- WARNING: This is a complex operation that recreates the enum types
-- ============================================================================

-- Step 1: Create new enum types without the old values
CREATE TYPE system_role_new AS ENUM ('admin', 'in_house', 'supervisor', 'coordinator', 'talent_escort');
CREATE TYPE project_role_new AS ENUM ('supervisor', 'coordinator', 'talent_escort');

-- Step 2: Update all columns to use new enum types
-- Note: This assumes all data has already been migrated to 'coordinator'

-- Update profiles table
ALTER TABLE profiles 
ALTER COLUMN role TYPE system_role_new 
USING role::text::system_role_new;

-- Update project_roles table (if it exists and has role column)
-- ALTER TABLE project_roles 
-- ALTER COLUMN role TYPE project_role_new 
-- USING role::text::project_role_new;

-- Update project_role_templates table
ALTER TABLE project_role_templates 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;

-- Update team_assignments table
ALTER TABLE team_assignments 
ALTER COLUMN role TYPE project_role_new 
USING role::text::project_role_new;

-- Step 3: Drop old enum types and rename new ones
DROP TYPE system_role;
DROP TYPE project_role;
ALTER TYPE system_role_new RENAME TO system_role;
ALTER TYPE project_role_new RENAME TO project_role;

-- Step 4: Verify cleanup
-- These queries should fail with "invalid input value for enum" if cleanup was successful
-- SELECT COUNT(*) FROM profiles WHERE role = 'talent_logistics_coordinator';
-- SELECT COUNT(*) FROM team_assignments WHERE role = 'talent_logistics_coordinator';

-- ============================================================================
-- IMPORTANT NOTES:
-- 1. This operation will briefly lock the affected tables
-- 2. All applications should be stopped during this operation
-- 3. Test this on a backup/staging database first
-- 4. This assumes all data has been migrated to 'coordinator' already
-- ============================================================================
`;

  return cleanupSQL;
}

async function createEnumCleanupFiles() {
  console.log('\n📄 Creating enum cleanup files...');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Generate the cleanup SQL
    const cleanupSQL = await generateEnumCleanupSQL();
    
    // Write to file
    const sqlFilePath = path.join(__dirname, '../migrations/cleanup-old-enum-values.sql');
    fs.writeFileSync(sqlFilePath, cleanupSQL);
    
    console.log(`✅ Created enum cleanup file: ${sqlFilePath}`);
    
    // Create a safer step-by-step version
    const stepByStepSQL = `
-- ============================================================================
-- STEP-BY-STEP ENUM CLEANUP (SAFER APPROACH)
-- Execute each step separately and verify before proceeding
-- ============================================================================

-- STEP 1: Verify no data uses old enum values
SELECT 'profiles' as table_name, COUNT(*) as old_role_count 
FROM profiles WHERE role = 'talent_logistics_coordinator'
UNION ALL
SELECT 'team_assignments', COUNT(*) 
FROM team_assignments WHERE role = 'talent_logistics_coordinator'
UNION ALL
SELECT 'project_role_templates', COUNT(*) 
FROM project_role_templates WHERE role = 'talent_logistics_coordinator';

-- If any counts are > 0, DO NOT proceed with enum cleanup

-- STEP 2: Create backup of current enum definitions (for reference)
SELECT 'system_role' as enum_name, enumlabel as value, enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'system_role'
UNION ALL
SELECT 'project_role', enumlabel, enumsortorder
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'project_role'
ORDER BY enum_name, sort_order;

-- STEP 3: Test enum recreation (you can copy from cleanup-old-enum-values.sql)
-- Only proceed if Step 1 shows 0 counts for all tables
`;
    
    const stepFilePath = path.join(__dirname, '../migrations/enum-cleanup-steps.sql');
    fs.writeFileSync(stepFilePath, stepByStepSQL);
    
    console.log(`✅ Created step-by-step guide: ${stepFilePath}`);
    
    return {
      cleanupFile: sqlFilePath,
      stepsFile: stepFilePath
    };
    
  } catch (error) {
    console.error('❌ Error creating cleanup files:', error.message);
    throw error;
  }
}

async function removeOldEnumValues() {
  console.log('🧹 Remove Old Enum Values from Database');
  console.log('=======================================');
  
  try {
    // Step 1: Test if old enum values exist
    const enumTest = await testEnumValues();
    
    if (!enumTest) {
      console.log('⚠️  Could not determine enum state');
    } else if (!enumTest.systemRoleHasOld && !enumTest.projectRoleHasOld) {
      console.log('✅ Old enum values appear to be already removed');
      console.log('   No cleanup necessary');
      return true;
    }
    
    // Step 2: Create cleanup files
    const files = await createEnumCleanupFiles();
    
    // Step 3: Provide instructions
    console.log('\n🔧 ENUM CLEANUP REQUIRED');
    console.log('========================');
    console.log('');
    console.log('Old enum values may still exist in the database schema.');
    console.log('To completely remove them, you need to recreate the enum types.');
    console.log('');
    console.log('⚠️  WARNING: This is a complex operation that requires careful execution');
    console.log('');
    console.log('RECOMMENDED APPROACH:');
    console.log('1. First run the verification queries in enum-cleanup-steps.sql');
    console.log('2. Ensure all counts are 0 (no old role data exists)');
    console.log('3. Stop all applications using the database');
    console.log('4. Execute the cleanup SQL from cleanup-old-enum-values.sql');
    console.log('5. Restart applications and test');
    console.log('');
    console.log('FILES CREATED:');
    console.log(`📄 ${files.stepsFile}`);
    console.log(`📄 ${files.cleanupFile}`);
    console.log('');
    console.log('ALTERNATIVE: Leave old enum values in place');
    console.log('- The old enum values don\'t hurt anything if no data uses them');
    console.log('- You can safely leave them and clean up in a future maintenance window');
    console.log('- The migration is functionally complete without removing the enum values');
    
    return false; // Indicates manual action needed
    
  } catch (error) {
    console.error('\n💥 Enum cleanup preparation failed:', error.message);
    return false;
  }
}

// Run the enum cleanup preparation
removeOldEnumValues()
  .then(complete => {
    if (complete) {
      console.log('\n✅ Enum cleanup complete or not needed');
      process.exit(0);
    } else {
      console.log('\n📋 Manual enum cleanup required - see generated files');
      process.exit(0); // Not an error, just requires manual action
    }
  })
  .catch(error => {
    console.error('\n💥 Cleanup script failed:', error.message);
    process.exit(1);
  });