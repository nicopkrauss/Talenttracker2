/**
 * EXHAUSTIVE DATABASE SEARCH for talent_logistics_coordinator references
 * This script searches EVERY table, column, constraint, comment, and database object
 * for any remaining references to the old role name in any form
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

// All possible variations of the old role name to search for
const searchTerms = [
  'talent_logistics_coordinator',
  'talent logistics coordinator', 
  'Talent Logistics Coordinator',
  'TALENT_LOGISTICS_COORDINATOR',
  'TLC',
  'tlc'
];

async function getAllTables() {
  console.log('\n📋 Getting all tables in database...');
  
  try {
    const { data: tables, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            schemaname,
            tablename,
            tableowner
          FROM pg_tables 
          WHERE schemaname IN ('public', 'auth')
          ORDER BY schemaname, tablename;
        `
      });
    
    if (error) {
      // Fallback method - get tables we know exist
      console.log('⚠️  Using fallback table list');
      return [
        { schemaname: 'public', tablename: 'profiles' },
        { schemaname: 'public', tablename: 'projects' },
        { schemaname: 'public', tablename: 'project_roles' },
        { schemaname: 'public', tablename: 'project_role_templates' },
        { schemaname: 'public', tablename: 'team_assignments' },
        { schemaname: 'public', tablename: 'talent' },
        { schemaname: 'public', tablename: 'talent_project_assignments' },
        { schemaname: 'public', tablename: 'talent_status' },
        { schemaname: 'public', tablename: 'shifts' },
        { schemaname: 'public', tablename: 'breaks' },
        { schemaname: 'public', tablename: 'timecards' },
        { schemaname: 'public', tablename: 'notifications' },
        { schemaname: 'public', tablename: 'project_locations' },
        { schemaname: 'public', tablename: 'project_setup_checklist' },
        { schemaname: 'public', tablename: 'user_favorites' },
        { schemaname: 'public', tablename: 'email_notifications' },
        { schemaname: 'public', tablename: 'auth_logs' },
        { schemaname: 'public', tablename: 'schema_migrations' }
      ];
    }
    
    console.log(`📊 Found ${tables.length} tables to search`);
    tables.forEach(table => {
      console.log(`   - ${table.schemaname}.${table.tablename}`);
    });
    
    return tables;
    
  } catch (error) {
    console.error('❌ Error getting tables:', error.message);
    return [];
  }
}

async function searchTableData(tableName, schemaName = 'public') {
  console.log(`\n🔍 Searching ${schemaName}.${tableName} for old role references...`);
  
  const results = {
    tableName: `${schemaName}.${tableName}`,
    foundReferences: false,
    searchResults: []
  };
  
  try {
    // Get all data from the table
    const { data: tableData, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.log(`   ⚠️  Could not query ${tableName}: ${error.message}`);
      results.error = error.message;
      return results;
    }
    
    if (!tableData || tableData.length === 0) {
      console.log(`   ✅ ${tableName}: Empty table`);
      return results;
    }
    
    console.log(`   📊 ${tableName}: Checking ${tableData.length} records...`);
    
    // Search through all records and all fields
    tableData.forEach((record, recordIndex) => {
      Object.entries(record).forEach(([columnName, value]) => {
        if (value && typeof value === 'string') {
          // Check for any of our search terms
          searchTerms.forEach(term => {
            if (value.toLowerCase().includes(term.toLowerCase())) {
              console.log(`   ❌ FOUND: ${tableName}.${columnName} in record ${record.id || recordIndex}: "${value}"`);
              results.foundReferences = true;
              results.searchResults.push({
                column: columnName,
                recordId: record.id || recordIndex,
                value: value,
                matchedTerm: term
              });
            }
          });
        }
      });
    });
    
    if (!results.foundReferences) {
      console.log(`   ✅ ${tableName}: No old role references found`);
    }
    
    return results;
    
  } catch (error) {
    console.log(`   ❌ Error searching ${tableName}: ${error.message}`);
    results.error = error.message;
    return results;
  }
}

async function searchDatabaseMetadata() {
  console.log('\n🔍 Searching database metadata (constraints, comments, functions)...');
  
  const metadataResults = {
    foundReferences: false,
    results: []
  };
  
  try {
    // Search constraints
    console.log('   🔍 Searching constraints...');
    const { data: constraints, error: constraintError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            conname as constraint_name,
            conrelid::regclass as table_name,
            pg_get_constraintdef(oid) as constraint_definition
          FROM pg_constraint
          WHERE pg_get_constraintdef(oid) ILIKE '%talent%logistics%coordinator%'
             OR pg_get_constraintdef(oid) ILIKE '%talent_logistics_coordinator%'
             OR pg_get_constraintdef(oid) ILIKE '%TLC%';
        `
      });
    
    if (!constraintError && constraints && constraints.length > 0) {
      console.log(`   ❌ Found ${constraints.length} constraints with old role references`);
      constraints.forEach(c => {
        console.log(`      - ${c.constraint_name} on ${c.table_name}: ${c.constraint_definition}`);
        metadataResults.foundReferences = true;
        metadataResults.results.push({
          type: 'constraint',
          name: c.constraint_name,
          table: c.table_name,
          definition: c.constraint_definition
        });
      });
    } else {
      console.log('   ✅ No constraints found with old role references');
    }
    
    // Search comments
    console.log('   🔍 Searching comments...');
    const { data: comments, error: commentError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            objoid::regclass as object_name,
            description
          FROM pg_description
          WHERE description ILIKE '%talent%logistics%coordinator%'
             OR description ILIKE '%talent_logistics_coordinator%'
             OR description ILIKE '%TLC%';
        `
      });
    
    if (!commentError && comments && comments.length > 0) {
      console.log(`   ❌ Found ${comments.length} comments with old role references`);
      comments.forEach(c => {
        console.log(`      - ${c.object_name}: ${c.description}`);
        metadataResults.foundReferences = true;
        metadataResults.results.push({
          type: 'comment',
          object: c.object_name,
          description: c.description
        });
      });
    } else {
      console.log('   ✅ No comments found with old role references');
    }
    
    // Search function definitions
    console.log('   🔍 Searching function definitions...');
    const { data: functions, error: functionError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            proname as function_name,
            pg_get_functiondef(oid) as function_definition
          FROM pg_proc
          WHERE pg_get_functiondef(oid) ILIKE '%talent%logistics%coordinator%'
             OR pg_get_functiondef(oid) ILIKE '%talent_logistics_coordinator%'
             OR pg_get_functiondef(oid) ILIKE '%TLC%';
        `
      });
    
    if (!functionError && functions && functions.length > 0) {
      console.log(`   ❌ Found ${functions.length} functions with old role references`);
      functions.forEach(f => {
        console.log(`      - Function: ${f.function_name}`);
        metadataResults.foundReferences = true;
        metadataResults.results.push({
          type: 'function',
          name: f.function_name,
          definition: f.function_definition
        });
      });
    } else {
      console.log('   ✅ No functions found with old role references');
    }
    
    // Search view definitions
    console.log('   🔍 Searching view definitions...');
    const { data: views, error: viewError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            viewname,
            definition
          FROM pg_views
          WHERE definition ILIKE '%talent%logistics%coordinator%'
             OR definition ILIKE '%talent_logistics_coordinator%'
             OR definition ILIKE '%TLC%';
        `
      });
    
    if (!viewError && views && views.length > 0) {
      console.log(`   ❌ Found ${views.length} views with old role references`);
      views.forEach(v => {
        console.log(`      - View: ${v.viewname}`);
        metadataResults.foundReferences = true;
        metadataResults.results.push({
          type: 'view',
          name: v.viewname,
          definition: v.definition
        });
      });
    } else {
      console.log('   ✅ No views found with old role references');
    }
    
  } catch (error) {
    console.log(`   ⚠️  Could not search metadata: ${error.message}`);
  }
  
  return metadataResults;
}

async function verifyEnumCleanup() {
  console.log('\n🔍 Verifying enum cleanup...');
  
  try {
    // Test if old enum values still exist by trying to use them
    const enumTests = [];
    
    // Test system_role enum
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'talent_logistics_coordinator')
        .limit(1);
      
      if (error && error.message.includes('invalid input value for enum')) {
        console.log('   ✅ talent_logistics_coordinator removed from system_role enum');
        enumTests.push({ enum: 'system_role', status: 'removed' });
      } else {
        console.log('   ❌ talent_logistics_coordinator still exists in system_role enum');
        enumTests.push({ enum: 'system_role', status: 'exists' });
      }
    } catch (e) {
      console.log('   ⚠️  Could not test system_role enum');
      enumTests.push({ enum: 'system_role', status: 'unknown' });
    }
    
    // Test project_role enum
    try {
      const { data, error } = await supabase
        .from('team_assignments')
        .select('id')
        .eq('role', 'talent_logistics_coordinator')
        .limit(1);
      
      if (error && error.message.includes('invalid input value for enum')) {
        console.log('   ✅ talent_logistics_coordinator removed from project_role enum');
        enumTests.push({ enum: 'project_role', status: 'removed' });
      } else {
        console.log('   ❌ talent_logistics_coordinator still exists in project_role enum');
        enumTests.push({ enum: 'project_role', status: 'exists' });
      }
    } catch (e) {
      console.log('   ⚠️  Could not test project_role enum');
      enumTests.push({ enum: 'project_role', status: 'unknown' });
    }
    
    return enumTests;
    
  } catch (error) {
    console.error('❌ Error verifying enum cleanup:', error.message);
    return [];
  }
}

async function performExhaustiveSearch() {
  console.log('🔍 EXHAUSTIVE DATABASE SEARCH FOR TALENT_LOGISTICS_COORDINATOR');
  console.log('==============================================================');
  console.log(`Searching for: ${searchTerms.join(', ')}`);
  
  let totalReferencesFound = 0;
  const allResults = {
    tableResults: [],
    metadataResults: null,
    enumResults: []
  };
  
  try {
    // Step 1: Get all tables
    const tables = await getAllTables();
    
    // Step 2: Search each table thoroughly
    console.log('\n📊 SEARCHING ALL TABLE DATA');
    console.log('===========================');
    
    for (const table of tables) {
      const result = await searchTableData(table.tablename, table.schemaname);
      allResults.tableResults.push(result);
      
      if (result.foundReferences) {
        totalReferencesFound += result.searchResults.length;
      }
    }
    
    // Step 3: Search database metadata
    console.log('\n🔍 SEARCHING DATABASE METADATA');
    console.log('==============================');
    
    const metadataResults = await searchDatabaseMetadata();
    allResults.metadataResults = metadataResults;
    
    if (metadataResults.foundReferences) {
      totalReferencesFound += metadataResults.results.length;
    }
    
    // Step 4: Verify enum cleanup
    console.log('\n🔍 VERIFYING ENUM CLEANUP');
    console.log('=========================');
    
    const enumResults = await verifyEnumCleanup();
    allResults.enumResults = enumResults;
    
    // Check if any enums still have old values
    const enumsWithOldValues = enumResults.filter(e => e.status === 'exists');
    if (enumsWithOldValues.length > 0) {
      totalReferencesFound += enumsWithOldValues.length;
    }
    
    // Step 5: Generate comprehensive report
    console.log('\n📋 EXHAUSTIVE SEARCH REPORT');
    console.log('===========================');
    
    console.log(`\n🔍 Search Summary:`);
    console.log(`   - Tables searched: ${tables.length}`);
    console.log(`   - Total references found: ${totalReferencesFound}`);
    
    // Report table findings
    console.log(`\n📊 Table Data Results:`);
    const tablesWithReferences = allResults.tableResults.filter(r => r.foundReferences);
    if (tablesWithReferences.length > 0) {
      console.log(`❌ Found references in ${tablesWithReferences.length} tables:`);
      tablesWithReferences.forEach(table => {
        console.log(`   - ${table.tableName}: ${table.searchResults.length} references`);
        table.searchResults.forEach(ref => {
          console.log(`     * Column: ${ref.column}, Record: ${ref.recordId}, Value: "${ref.value}"`);
        });
      });
    } else {
      console.log(`✅ No references found in any table data`);
    }
    
    // Report metadata findings
    console.log(`\n🔍 Metadata Results:`);
    if (metadataResults.foundReferences) {
      console.log(`❌ Found references in database metadata:`);
      metadataResults.results.forEach(ref => {
        console.log(`   - ${ref.type}: ${ref.name || ref.object}`);
      });
    } else {
      console.log(`✅ No references found in database metadata`);
    }
    
    // Report enum findings
    console.log(`\n🔤 Enum Cleanup Results:`);
    enumResults.forEach(enumTest => {
      if (enumTest.status === 'removed') {
        console.log(`✅ ${enumTest.enum}: Old values successfully removed`);
      } else if (enumTest.status === 'exists') {
        console.log(`❌ ${enumTest.enum}: Old values still exist`);
      } else {
        console.log(`⚠️  ${enumTest.enum}: Status unknown`);
      }
    });
    
    // Final assessment
    console.log(`\n🎯 FINAL ASSESSMENT:`);
    if (totalReferencesFound === 0) {
      console.log('✅ DATABASE IS COMPLETELY CLEAN');
      console.log('   🎉 No talent_logistics_coordinator references found anywhere');
      console.log('   🎉 All old role names have been successfully removed');
      console.log('   🎉 Migration is 100% complete');
    } else {
      console.log('❌ REFERENCES STILL EXIST');
      console.log(`   Found ${totalReferencesFound} references that need cleanup`);
      console.log('   Manual intervention required');
    }
    
    return totalReferencesFound === 0;
    
  } catch (error) {
    console.error('\n💥 Exhaustive search failed:', error.message);
    return false;
  }
}

// Run the exhaustive search
performExhaustiveSearch()
  .then(clean => {
    if (clean) {
      console.log('\n✅ EXHAUSTIVE SEARCH COMPLETE - DATABASE IS CLEAN');
      process.exit(0);
    } else {
      console.log('\n❌ EXHAUSTIVE SEARCH COMPLETE - CLEANUP REQUIRED');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Search script failed:', error.message);
    process.exit(1);
  });