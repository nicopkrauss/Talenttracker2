/**
 * Check project_roles table data before enum cleanup
 * This script examines what data exists in the project_roles table
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

async function checkProjectRolesTable() {
  console.log('🔍 Checking project_roles Table');
  console.log('==============================');
  
  try {
    // Check if table exists and what data it contains
    const { data: projectRoles, error: projectRolesError } = await supabase
      .from('project_roles')
      .select('*');
    
    if (projectRolesError) {
      console.error('❌ Error querying project_roles table:', projectRolesError.message);
      return;
    }
    
    console.log(`📊 Found ${projectRoles.length} records in project_roles table`);
    
    if (projectRoles.length > 0) {
      // Group by role to see distribution
      const roleDistribution = projectRoles.reduce((acc, role) => {
        acc[role.role] = (acc[role.role] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📋 Role distribution in project_roles:');
      Object.entries(roleDistribution).forEach(([role, count]) => {
        console.log(`   - ${role}: ${count} records`);
      });
      
      // Check for old role name specifically
      const oldRoleCount = projectRoles.filter(r => r.role === 'talent_logistics_coordinator').length;
      
      if (oldRoleCount > 0) {
        console.log(`\n❌ Found ${oldRoleCount} records with talent_logistics_coordinator in project_roles`);
        console.log('   These need to be migrated before enum cleanup');
        
        // Show the specific records
        const oldRoleRecords = projectRoles.filter(r => r.role === 'talent_logistics_coordinator');
        console.log('\n📋 Records with old role name:');
        oldRoleRecords.forEach(record => {
          console.log(`   - ID: ${record.id}, Role: ${record.role}, Project: ${record.project_id || 'N/A'}`);
        });
        
        return { needsMigration: true, oldRoleCount, records: oldRoleRecords };
      } else {
        console.log('\n✅ No talent_logistics_coordinator records found in project_roles');
        return { needsMigration: false, oldRoleCount: 0 };
      }
    } else {
      console.log('ℹ️  project_roles table is empty');
      return { needsMigration: false, oldRoleCount: 0 };
    }
    
  } catch (error) {
    console.error('❌ Error checking project_roles table:', error.message);
    return null;
  }
}

async function generateProjectRolesMigration(records) {
  console.log('\n📝 Generating project_roles migration SQL...');
  
  const migrationSQL = `
-- ============================================================================
-- PROJECT_ROLES TABLE MIGRATION
-- Execute this BEFORE the enum cleanup
-- ============================================================================

-- Update project_roles table data
UPDATE project_roles 
SET role = 'coordinator' 
WHERE role = 'talent_logistics_coordinator';

-- Verify migration
SELECT role, COUNT(*) as count
FROM project_roles 
GROUP BY role
ORDER BY role;

-- Check for remaining old role names (should return 0)
SELECT COUNT(*) as remaining_old_roles
FROM project_roles 
WHERE role = 'talent_logistics_coordinator';
`;

  const fs = require('fs');
  const path = require('path');
  
  const sqlFilePath = path.join(__dirname, '../migrations/migrate-project-roles-data.sql');
  fs.writeFileSync(sqlFilePath, migrationSQL);
  
  console.log(`✅ Created project_roles migration: ${sqlFilePath}`);
  
  return sqlFilePath;
}

async function main() {
  try {
    const result = await checkProjectRolesTable();
    
    if (!result) {
      console.log('\n❌ Could not check project_roles table');
      return;
    }
    
    if (result.needsMigration) {
      console.log('\n🔧 ACTION REQUIRED:');
      console.log('==================');
      console.log('The project_roles table contains records with talent_logistics_coordinator.');
      console.log('You need to migrate this data before running the enum cleanup.');
      console.log('');
      
      const migrationFile = await generateProjectRolesMigration(result.records);
      
      console.log('STEPS TO COMPLETE:');
      console.log('1. Execute the SQL commands in:', migrationFile);
      console.log('2. Verify all counts are 0 for old role names');
      console.log('3. Then run the enum cleanup: migrations/cleanup-old-enum-values-fixed.sql');
      
    } else {
      console.log('\n✅ PROJECT_ROLES TABLE READY');
      console.log('============================');
      console.log('No migration needed for project_roles table.');
      console.log('You can proceed directly with enum cleanup:');
      console.log('   Execute: migrations/cleanup-old-enum-values-fixed.sql');
    }
    
  } catch (error) {
    console.error('\n💥 Check failed:', error.message);
    process.exit(1);
  }
}

main();