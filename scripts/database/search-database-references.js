/**
 * Comprehensive search for talent_logistics_coordinator references in database
 * This script searches for any remaining references to the old role name
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

async function searchEnumValues() {
  console.log('\n🔍 Searching for talent_logistics_coordinator in enum definitions...');
  
  try {
    // Search for enum values in system_role
    const { data: systemRoleEnums, error: systemError } = await supabase
      .rpc('sql', {
        query: `
          SELECT enumlabel, enumsortorder
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'system_role'
          ORDER BY e.enumsortorder;
        `
      });
    
    if (systemError) {
      console.log('⚠️  Cannot query system_role enum directly');
    } else {
      console.log('📋 system_role enum values:', systemRoleEnums?.map(e => e.enumlabel) || 'Unable to fetch');
      
      const hasTLCInSystemRole = systemRoleEnums?.some(e => e.enumlabel === 'talent_logistics_coordinator');
      if (hasTLCInSystemRole) {
        console.log('❌ Found talent_logistics_coordinator in system_role enum');
      } else {
        console.log('✅ No talent_logistics_coordinator found in system_role enum');
      }
    }
    
    // Search for enum values in project_role
    const { data: projectRoleEnums, error: projectError } = await supabase
      .rpc('sql', {
        query: `
          SELECT enumlabel, enumsortorder
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'project_role'
          ORDER BY e.enumsortorder;
        `
      });
    
    if (projectError) {
      console.log('⚠️  Cannot query project_role enum directly');
    } else {
      console.log('📋 project_role enum values:', projectRoleEnums?.map(e => e.enumlabel) || 'Unable to fetch');
      
      const hasTLCInProjectRole = projectRoleEnums?.some(e => e.enumlabel === 'talent_logistics_coordinator');
      if (hasTLCInProjectRole) {
        console.log('❌ Found talent_logistics_coordinator in project_role enum');
      } else {
        console.log('✅ No talent_logistics_coordinator found in project_role enum');
      }
    }
    
    return {
      systemRoleHasTLC: systemRoleEnums?.some(e => e.enumlabel === 'talent_logistics_coordinator') || false,
      projectRoleHasTLC: projectRoleEnums?.some(e => e.enumlabel === 'talent_logistics_coordinator') || false,
      systemRoleEnums: systemRoleEnums?.map(e => e.enumlabel) || [],
      projectRoleEnums: projectRoleEnums?.map(e => e.enumlabel) || []
    };
    
  } catch (error) {
    console.error('❌ Error searching enum values:', error.message);
    return null;
  }
}

async function searchTableData() {
  console.log('\n🔍 Searching for talent_logistics_coordinator in table data...');
  
  const tables = [
    'profiles',
    'project_roles', 
    'project_role_templates',
    'team_assignments'
  ];
  
  const results = {};
  
  for (const table of tables) {
    try {
      console.log(`\n📊 Checking ${table} table...`);
      
      // Try to query for old role name
      const { data, error } = await supabase
        .from(table)
        .select('id, role')
        .eq('role', 'talent_logistics_coordinator');
      
      if (error) {
        if (error.message.includes('invalid input value for enum')) {
          console.log(`✅ ${table}: Cannot query talent_logistics_coordinator (enum value removed)`);
          results[table] = { status: 'enum_removed', count: 0 };
        } else {
          console.log(`⚠️  ${table}: Error querying - ${error.message}`);
          results[table] = { status: 'error', error: error.message };
        }
      } else {
        console.log(`📋 ${table}: Found ${data.length} records with talent_logistics_coordinator`);
        results[table] = { status: 'found', count: data.length, records: data };
      }
      
    } catch (error) {
      console.log(`❌ ${table}: Exception - ${error.message}`);
      results[table] = { status: 'exception', error: error.message };
    }
  }
  
  return results;
}

async function searchConstraintsAndIndexes() {
  console.log('\n🔍 Searching for talent_logistics_coordinator in constraints and indexes...');
  
  try {
    // Search for check constraints that might reference the old role
    const { data: constraints, error: constraintError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            conname as constraint_name,
            conrelid::regclass as table_name,
            pg_get_constraintdef(oid) as constraint_definition
          FROM pg_constraint
          WHERE pg_get_constraintdef(oid) ILIKE '%talent_logistics_coordinator%';
        `
      });
    
    if (constraintError) {
      console.log('⚠️  Cannot search constraints directly');
    } else {
      if (constraints && constraints.length > 0) {
        console.log('❌ Found constraints referencing talent_logistics_coordinator:');
        constraints.forEach(c => {
          console.log(`   - ${c.constraint_name} on ${c.table_name}: ${c.constraint_definition}`);
        });
      } else {
        console.log('✅ No constraints found referencing talent_logistics_coordinator');
      }
    }
    
    // Search for comments or descriptions
    const { data: comments, error: commentError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            objoid::regclass as object_name,
            description
          FROM pg_description
          WHERE description ILIKE '%talent_logistics_coordinator%';
        `
      });
    
    if (commentError) {
      console.log('⚠️  Cannot search comments directly');
    } else {
      if (comments && comments.length > 0) {
        console.log('❌ Found comments referencing talent_logistics_coordinator:');
        comments.forEach(c => {
          console.log(`   - ${c.object_name}: ${c.description}`);
        });
      } else {
        console.log('✅ No comments found referencing talent_logistics_coordinator');
      }
    }
    
    return {
      constraints: constraints || [],
      comments: comments || []
    };
    
  } catch (error) {
    console.error('❌ Error searching constraints and indexes:', error.message);
    return null;
  }
}

async function performComprehensiveSearch() {
  console.log('🔍 Comprehensive Database Search for talent_logistics_coordinator');
  console.log('================================================================');
  
  try {
    // Step 1: Search enum definitions
    const enumResults = await searchEnumValues();
    
    // Step 2: Search table data
    const tableResults = await searchTableData();
    
    // Step 3: Search constraints and indexes
    const constraintResults = await searchConstraintsAndIndexes();
    
    // Step 4: Generate comprehensive report
    console.log('\n📋 COMPREHENSIVE SEARCH REPORT');
    console.log('==============================');
    
    let foundReferences = false;
    
    // Report enum findings
    if (enumResults) {
      console.log('\n🔤 Enum Definitions:');
      if (enumResults.systemRoleHasTLC) {
        console.log('❌ system_role enum contains talent_logistics_coordinator');
        foundReferences = true;
      } else {
        console.log('✅ system_role enum does not contain talent_logistics_coordinator');
      }
      
      if (enumResults.projectRoleHasTLC) {
        console.log('❌ project_role enum contains talent_logistics_coordinator');
        foundReferences = true;
      } else {
        console.log('✅ project_role enum does not contain talent_logistics_coordinator');
      }
      
      console.log(`📋 Current system_role values: ${enumResults.systemRoleEnums.join(', ')}`);
      console.log(`📋 Current project_role values: ${enumResults.projectRoleEnums.join(', ')}`);
    }
    
    // Report table findings
    console.log('\n📊 Table Data:');
    Object.entries(tableResults).forEach(([table, result]) => {
      if (result.status === 'found' && result.count > 0) {
        console.log(`❌ ${table}: ${result.count} records still have talent_logistics_coordinator`);
        foundReferences = true;
      } else if (result.status === 'enum_removed') {
        console.log(`✅ ${table}: Cannot query old role (enum value properly removed)`);
      } else if (result.status === 'error') {
        console.log(`⚠️  ${table}: ${result.error}`);
      }
    });
    
    // Report constraint findings
    if (constraintResults) {
      console.log('\n🔗 Constraints and Comments:');
      if (constraintResults.constraints.length > 0) {
        console.log(`❌ Found ${constraintResults.constraints.length} constraints referencing old role`);
        foundReferences = true;
      } else {
        console.log('✅ No constraints reference talent_logistics_coordinator');
      }
      
      if (constraintResults.comments.length > 0) {
        console.log(`❌ Found ${constraintResults.comments.length} comments referencing old role`);
        foundReferences = true;
      } else {
        console.log('✅ No comments reference talent_logistics_coordinator');
      }
    }
    
    // Final assessment
    console.log('\n🎯 Final Assessment:');
    if (!foundReferences) {
      console.log('✅ NO REFERENCES FOUND - Database cleanup appears complete');
      console.log('   All talent_logistics_coordinator references have been removed');
    } else {
      console.log('❌ REFERENCES FOUND - Additional cleanup required');
      console.log('   Some talent_logistics_coordinator references still exist');
      
      // Generate cleanup recommendations
      console.log('\n🔧 Cleanup Recommendations:');
      
      if (enumResults?.systemRoleHasTLC || enumResults?.projectRoleHasTLC) {
        console.log('   1. Remove old enum values (requires enum recreation)');
      }
      
      Object.entries(tableResults).forEach(([table, result]) => {
        if (result.status === 'found' && result.count > 0) {
          console.log(`   2. Clean up ${result.count} records in ${table} table`);
        }
      });
      
      if (constraintResults?.constraints.length > 0) {
        console.log('   3. Update or remove constraints referencing old role');
      }
      
      if (constraintResults?.comments.length > 0) {
        console.log('   4. Update comments referencing old role');
      }
    }
    
    return !foundReferences;
    
  } catch (error) {
    console.error('\n💥 Comprehensive search failed:', error.message);
    return false;
  }
}

// Run the comprehensive search
performComprehensiveSearch()
  .then(clean => {
    if (clean) {
      console.log('\n✅ Database is clean of talent_logistics_coordinator references');
      process.exit(0);
    } else {
      console.log('\n❌ Database cleanup required');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Search script failed:', error.message);
    process.exit(1);
  });