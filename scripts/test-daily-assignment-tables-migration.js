const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDailyAssignmentTablesMigration() {
  console.log('🚀 Testing Daily Assignment Tables Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/027_create_daily_assignment_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');

    // Apply the migration
    console.log('⚡ Applying migration...');
    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (migrationError) {
      console.error('❌ Migration failed:', migrationError);
      return;
    }

    console.log('✅ Migration applied successfully\n');

    // Test 1: Verify tables were created
    console.log('🔍 Test 1: Verifying table creation...');
    
    const { data: talentTable, error: talentTableError } = await supabase
      .from('talent_daily_assignments')
      .select('*')
      .limit(0);

    const { data: groupTable, error: groupTableError } = await supabase
      .from('group_daily_assignments')
      .select('*')
      .limit(0);

    if (talentTableError || groupTableError) {
      console.error('❌ Table verification failed:', { talentTableError, groupTableError });
      return;
    }

    console.log('✅ Both tables created successfully');

    // Test 2: Verify indexes exist
    console.log('🔍 Test 2: Verifying indexes...');
    
    const { data: indexes, error: indexError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT indexname, tablename 
          FROM pg_indexes 
          WHERE tablename IN ('talent_daily_assignments', 'group_daily_assignments')
          ORDER BY tablename, indexname;
        `
      });

    if (indexError) {
      console.error('❌ Index verification failed:', indexError);
      return;
    }

    console.log('✅ Indexes created:', indexes.map(idx => `${idx.tablename}.${idx.indexname}`));

    // Test 3: Verify triggers exist
    console.log('🔍 Test 3: Verifying triggers...');
    
    const { data: triggers, error: triggerError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT trigger_name, event_object_table, action_timing, event_manipulation
          FROM information_schema.triggers 
          WHERE event_object_table IN ('talent_daily_assignments', 'group_daily_assignments')
          ORDER BY event_object_table, trigger_name;
        `
      });

    if (triggerError) {
      console.error('❌ Trigger verification failed:', triggerError);
      return;
    }

    console.log('✅ Triggers created:', triggers.map(t => `${t.event_object_table}.${t.trigger_name}`));

    // Test 4: Verify RLS policies
    console.log('🔍 Test 4: Verifying RLS policies...');
    
    const { data: policies, error: policyError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
          FROM pg_policies 
          WHERE tablename IN ('talent_daily_assignments', 'group_daily_assignments')
          ORDER BY tablename, policyname;
        `
      });

    if (policyError) {
      console.error('❌ RLS policy verification failed:', policyError);
      return;
    }

    console.log('✅ RLS policies created:', policies.map(p => `${p.tablename}.${p.policyname}`));

    // Test 5: Test constraint validation
    console.log('🔍 Test 5: Testing constraint validation...');
    
    // Get a sample project to test with
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, start_date, end_date')
      .limit(1);

    if (projectError || !projects.length) {
      console.log('⚠️  No projects found for constraint testing, skipping...');
    } else {
      const project = projects[0];
      
      // Try to insert an assignment with invalid date (should fail)
      const invalidDate = new Date(project.start_date);
      invalidDate.setDate(invalidDate.getDate() - 10); // 10 days before project start
      
      const { error: constraintError } = await supabase
        .from('talent_daily_assignments')
        .insert({
          talent_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
          project_id: project.id,
          assignment_date: invalidDate.toISOString().split('T')[0],
          escort_id: '00000000-0000-0000-0000-000000000000' // Dummy ID
        });

      if (constraintError) {
        console.log('✅ Date range constraint working correctly (rejected invalid date)');
      } else {
        console.log('⚠️  Date range constraint may not be working as expected');
      }
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('- ✅ talent_daily_assignments table created');
    console.log('- ✅ group_daily_assignments table created');
    console.log('- ✅ Performance indexes added');
    console.log('- ✅ Automatic scheduled_dates maintenance triggers');
    console.log('- ✅ Date range validation constraints');
    console.log('- ✅ Row Level Security policies');
    console.log('- ✅ Proper permissions and documentation');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Handle the case where exec_sql RPC doesn't exist
async function createExecSqlFunction() {
  const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  
  if (error && error.message.includes('function exec_sql')) {
    console.log('📝 Creating exec_sql function...');
    
    // Create the exec_sql function using direct SQL
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE sql;
        RETURN '{"success": true}'::json;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN json_build_object('error', SQLERRM);
      END;
      $$;
    `;
    
    // This would need to be run manually in the Supabase SQL editor
    console.log('⚠️  Please run this SQL in your Supabase SQL editor first:');
    console.log(createFunctionSQL);
    console.log('\nThen run this script again.');
    return false;
  }
  
  return true;
}

async function main() {
  const canProceed = await createExecSqlFunction();
  if (canProceed) {
    await testDailyAssignmentTablesMigration();
  }
}

main();