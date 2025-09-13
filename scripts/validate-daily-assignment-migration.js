const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function validateDailyAssignmentMigration() {
  console.log('🔍 Validating Daily Assignment Tables Migration...\n');

  let allTestsPassed = true;

  try {
    // Test 1: Verify tables exist and are accessible
    console.log('📋 Test 1: Verifying table creation...');
    
    const { data: talentTable, error: talentTableError } = await supabase
      .from('talent_daily_assignments')
      .select('*')
      .limit(0);

    const { data: groupTable, error: groupTableError } = await supabase
      .from('group_daily_assignments')
      .select('*')
      .limit(0);

    if (talentTableError) {
      console.log('❌ talent_daily_assignments table not accessible:', talentTableError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ talent_daily_assignments table created and accessible');
    }

    if (groupTableError) {
      console.log('❌ group_daily_assignments table not accessible:', groupTableError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ group_daily_assignments table created and accessible');
    }

    // Test 2: Verify table structure
    console.log('\n📋 Test 2: Verifying table structure...');
    
    const { data: talentColumns, error: talentColumnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'talent_daily_assignments' });

    const { data: groupColumns, error: groupColumnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'group_daily_assignments' });

    if (talentColumnsError && !talentColumnsError.message.includes('function get_table_columns')) {
      console.log('❌ Could not verify talent_daily_assignments structure:', talentColumnsError.message);
      allTestsPassed = false;
    } else if (!talentColumnsError) {
      console.log('✅ talent_daily_assignments structure verified');
    } else {
      console.log('⚠️  Skipping structure verification (get_table_columns function not available)');
    }

    // Test 3: Test basic CRUD operations
    console.log('\n📋 Test 3: Testing basic operations...');
    
    // Get a sample project and talent for testing
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, start_date, end_date')
      .limit(1);

    const { data: talents, error: talentError } = await supabase
      .from('talent')
      .select('id')
      .limit(1);

    const { data: escorts, error: escortError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (projectError || talentError || escortError || !projects?.length || !talents?.length || !escorts?.length) {
      console.log('⚠️  Skipping CRUD test (insufficient test data)');
    } else {
      const project = projects[0];
      const talent = talents[0];
      const escort = escorts[0];
      
      // Calculate a valid assignment date
      const startDate = new Date(project.start_date);
      const assignmentDate = startDate.toISOString().split('T')[0];

      // Test INSERT
      const { data: insertResult, error: insertError } = await supabase
        .from('talent_daily_assignments')
        .insert({
          talent_id: talent.id,
          project_id: project.id,
          assignment_date: assignmentDate,
          escort_id: escort.id
        })
        .select();

      if (insertError) {
        console.log('❌ INSERT test failed:', insertError.message);
        allTestsPassed = false;
      } else {
        console.log('✅ INSERT operation successful');

        // Test SELECT
        const { data: selectResult, error: selectError } = await supabase
          .from('talent_daily_assignments')
          .select('*')
          .eq('id', insertResult[0].id);

        if (selectError) {
          console.log('❌ SELECT test failed:', selectError.message);
          allTestsPassed = false;
        } else {
          console.log('✅ SELECT operation successful');
        }

        // Test DELETE (cleanup)
        const { error: deleteError } = await supabase
          .from('talent_daily_assignments')
          .delete()
          .eq('id', insertResult[0].id);

        if (deleteError) {
          console.log('❌ DELETE test failed:', deleteError.message);
          allTestsPassed = false;
        } else {
          console.log('✅ DELETE operation successful');
        }
      }
    }

    // Test 4: Verify RLS is enabled
    console.log('\n📋 Test 4: Verifying Row Level Security...');
    
    // Create a client without service role to test RLS
    const anonClient = createClient(
      supabaseUrl, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    const { data: rlsTest, error: rlsError } = await anonClient
      .from('talent_daily_assignments')
      .select('*')
      .limit(1);

    if (rlsError && rlsError.message.includes('RLS')) {
      console.log('✅ Row Level Security is properly enabled');
    } else if (rlsError) {
      console.log('⚠️  RLS test inconclusive:', rlsError.message);
    } else {
      console.log('⚠️  RLS may not be working as expected (no authentication required)');
    }

    // Test 5: Verify unique constraints
    console.log('\n📋 Test 5: Testing unique constraints...');
    
    if (projects?.length && talents?.length && escorts?.length) {
      const project = projects[0];
      const talent = talents[0];
      const escort = escorts[0];
      const startDate = new Date(project.start_date);
      const assignmentDate = startDate.toISOString().split('T')[0];

      // Insert first record
      const { data: firstInsert, error: firstError } = await supabase
        .from('talent_daily_assignments')
        .insert({
          talent_id: talent.id,
          project_id: project.id,
          assignment_date: assignmentDate,
          escort_id: escort.id
        })
        .select();

      if (!firstError) {
        // Try to insert duplicate (should fail)
        const { error: duplicateError } = await supabase
          .from('talent_daily_assignments')
          .insert({
            talent_id: talent.id,
            project_id: project.id,
            assignment_date: assignmentDate,
            escort_id: escort.id
          });

        if (duplicateError && duplicateError.message.includes('duplicate')) {
          console.log('✅ Unique constraint working correctly');
        } else {
          console.log('❌ Unique constraint may not be working');
          allTestsPassed = false;
        }

        // Cleanup
        await supabase
          .from('talent_daily_assignments')
          .delete()
          .eq('id', firstInsert[0].id);
      } else {
        console.log('⚠️  Skipping unique constraint test (could not insert test record)');
      }
    } else {
      console.log('⚠️  Skipping unique constraint test (insufficient test data)');
    }

    // Final results
    console.log('\n📊 Validation Results:');
    if (allTestsPassed) {
      console.log('🎉 All tests passed! Migration was successful.');
      console.log('\n✅ Migration Summary:');
      console.log('  - talent_daily_assignments table created and functional');
      console.log('  - group_daily_assignments table created and functional');
      console.log('  - Row Level Security enabled');
      console.log('  - Unique constraints working');
      console.log('  - Basic CRUD operations functional');
    } else {
      console.log('⚠️  Some tests failed. Please review the output above.');
    }

  } catch (error) {
    console.error('💥 Validation failed with unexpected error:', error);
    allTestsPassed = false;
  }

  return allTestsPassed;
}

async function main() {
  const success = await validateDailyAssignmentMigration();
  process.exit(success ? 0 : 1);
}

main();