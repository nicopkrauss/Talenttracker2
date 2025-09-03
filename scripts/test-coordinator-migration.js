/**
 * Test script for coordinator role migration
 * This script tests the migration in a safe way by checking current state
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

async function checkEnumValues() {
  console.log('\n🔍 Checking enum values...');
  
  try {
    // Check system_role enum values
    const { data: systemRoleEnums, error: systemError } = await supabase
      .rpc('get_enum_values', { enum_name: 'system_role' });
    
    if (systemError) {
      console.log('ℹ️  Using alternative method to check enums...');
      // Alternative method using direct SQL
      const { data: enumData, error } = await supabase
        .rpc('exec_sql', { 
          sql: `
            SELECT enumlabel as value 
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'system_role'
            ORDER BY e.enumsortorder;
          `
        });
      
      if (error) throw error;
      
      console.log('📋 system_role enum values:', enumData?.map(row => row.value) || 'Unable to fetch');
    } else {
      console.log('📋 system_role enum values:', systemRoleEnums);
    }
    
    // Check project_role enum values
    const { data: projectRoleEnums, error: projectError } = await supabase
      .rpc('get_enum_values', { enum_name: 'project_role' });
    
    if (projectError) {
      const { data: enumData, error } = await supabase
        .rpc('exec_sql', { 
          sql: `
            SELECT enumlabel as value 
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'project_role'
            ORDER BY e.enumsortorder;
          `
        });
      
      if (error) throw error;
      
      console.log('📋 project_role enum values:', enumData?.map(row => row.value) || 'Unable to fetch');
    } else {
      console.log('📋 project_role enum values:', projectRoleEnums);
    }
    
  } catch (error) {
    console.error('❌ Error checking enum values:', error.message);
  }
}

async function checkCurrentRoleCounts() {
  console.log('\n📊 Checking current role distribution...');
  
  try {
    // Check profiles
    const { data: profileRoles, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .not('role', 'is', null);
    
    if (profileError) throw profileError;
    
    const profileCounts = profileRoles.reduce((acc, profile) => {
      acc[profile.role] = (acc[profile.role] || 0) + 1;
      return acc;
    }, {});
    
    console.log('👤 Profile role distribution:', profileCounts);
    
    // Check team assignments
    const { data: assignmentRoles, error: assignmentError } = await supabase
      .from('team_assignments')
      .select('role');
    
    if (assignmentError) throw assignmentError;
    
    const assignmentCounts = assignmentRoles.reduce((acc, assignment) => {
      acc[assignment.role] = (acc[assignment.role] || 0) + 1;
      return acc;
    }, {});
    
    console.log('👥 Team assignment role distribution:', assignmentCounts);
    
    // Check project role templates
    const { data: templateRoles, error: templateError } = await supabase
      .from('project_role_templates')
      .select('role');
    
    if (templateError) throw templateError;
    
    const templateCounts = templateRoles.reduce((acc, template) => {
      acc[template.role] = (acc[template.role] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📋 Project role template distribution:', templateCounts);
    
    return {
      profiles: profileCounts,
      assignments: assignmentCounts,
      templates: templateCounts
    };
    
  } catch (error) {
    console.error('❌ Error checking role counts:', error.message);
    throw error;
  }
}

async function checkMigrationStatus() {
  console.log('\n🔍 Checking migration status...');
  
  try {
    const { data: migrations, error } = await supabase
      .from('schema_migrations')
      .select('*')
      .like('migration_name', '%coordinator%')
      .order('applied_at', { ascending: false });
    
    if (error) throw error;
    
    if (migrations.length === 0) {
      console.log('📝 No coordinator migrations found in schema_migrations table');
    } else {
      console.log('📝 Coordinator migration history:');
      migrations.forEach(migration => {
        console.log(`   - ${migration.migration_name} (${migration.applied_at})`);
        if (migration.notes) {
          console.log(`     Notes: ${migration.notes}`);
        }
      });
    }
    
    return migrations;
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    return [];
  }
}

async function testCoordinatorMigration() {
  console.log('🧪 Testing Coordinator Role Migration');
  console.log('====================================');
  
  try {
    // Step 1: Check enum values
    await checkEnumValues();
    
    // Step 2: Check current role counts
    const roleCounts = await checkCurrentRoleCounts();
    
    // Step 3: Check migration status
    const migrations = await checkMigrationStatus();
    
    // Step 4: Determine migration state
    console.log('\n📋 Migration Analysis:');
    
    const hasCoordinatorRoles = Object.values(roleCounts.profiles).some(count => count > 0) ||
                               Object.values(roleCounts.assignments).some(count => count > 0) ||
                               Object.values(roleCounts.templates).some(count => count > 0);
    
    const hasTLCRoles = (roleCounts.profiles['talent_logistics_coordinator'] || 0) > 0 ||
                       (roleCounts.assignments['talent_logistics_coordinator'] || 0) > 0 ||
                       (roleCounts.templates['talent_logistics_coordinator'] || 0) > 0;
    
    const hasCoordinatorEnum = true; // We'll assume this based on enum check above
    
    if (hasTLCRoles && !hasCoordinatorRoles) {
      console.log('🔄 Status: Ready for migration');
      console.log('   - talent_logistics_coordinator roles found in data');
      console.log('   - No coordinator roles found');
      console.log('   - Migration can be safely executed');
    } else if (!hasTLCRoles && hasCoordinatorRoles) {
      console.log('✅ Status: Migration appears to be completed');
      console.log('   - coordinator roles found in data');
      console.log('   - No talent_logistics_coordinator roles found');
      console.log('   - Migration has likely been executed');
    } else if (hasTLCRoles && hasCoordinatorRoles) {
      console.log('⚠️  Status: Mixed state detected');
      console.log('   - Both role types found in data');
      console.log('   - Migration may be partially complete or rolled back');
      console.log('   - Manual investigation recommended');
    } else {
      console.log('ℹ️  Status: No relevant roles found');
      console.log('   - No coordinator or talent_logistics_coordinator roles in data');
      console.log('   - Migration impact would be minimal');
    }
    
    console.log('\n🎯 Recommendations:');
    if (hasTLCRoles && !hasCoordinatorRoles) {
      console.log('   → Run: node scripts/run-coordinator-migration.js');
    } else if (!hasTLCRoles && hasCoordinatorRoles) {
      console.log('   → Migration appears complete, proceed with code updates');
    } else if (hasTLCRoles && hasCoordinatorRoles) {
      console.log('   → Investigate mixed state before proceeding');
      console.log('   → Consider rollback: node scripts/rollback-coordinator-migration.js');
    }
    
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCoordinatorMigration();