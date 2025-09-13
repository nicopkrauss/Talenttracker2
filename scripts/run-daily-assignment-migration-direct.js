const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function runDailyAssignmentMigration() {
  console.log('🚀 Running Daily Assignment Tables Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/027_create_daily_assignment_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`⚡ Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length === 0) continue;

      try {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        
        // Execute each statement using rpc
        const { data, error } = await supabase.rpc('exec', { 
          sql: statement + ';' 
        });

        if (error) {
          // Try alternative method if exec doesn't work
          if (error.message.includes('function exec')) {
            console.log('   Trying alternative execution method...');
            
            // For simple statements, try using the from() method
            if (statement.toUpperCase().startsWith('CREATE TABLE')) {
              // This won't work for CREATE TABLE, but let's log it
              console.log(`   ⚠️  Cannot execute CREATE TABLE via client: ${statement.substring(0, 50)}...`);
              console.log('   Please run this statement manually in Supabase SQL Editor');
              errorCount++;
            } else {
              console.log(`   ⚠️  Cannot execute statement via client: ${statement.substring(0, 50)}...`);
              console.log('   Please run this statement manually in Supabase SQL Editor');
              errorCount++;
            }
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.error(`💥 Unexpected error in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Results:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n📋 Manual Execution Required:');
      console.log('Since some statements failed, please copy and paste the following SQL into your Supabase SQL Editor:\n');
      console.log('================================================================================');
      console.log(migrationSQL);
      console.log('================================================================================\n');
    } else {
      console.log('\n🎉 Migration completed successfully!');
      
      // Verify the tables were created
      await verifyMigration();
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    console.log('\n📋 Manual Execution Required:');
    console.log('Please copy and paste the migration SQL into your Supabase SQL Editor.');
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration results...');

  try {
    // Test talent_daily_assignments table
    const { error: talentError } = await supabase
      .from('talent_daily_assignments')
      .select('*')
      .limit(0);

    if (talentError) {
      console.log('❌ talent_daily_assignments table not accessible:', talentError.message);
    } else {
      console.log('✅ talent_daily_assignments table created successfully');
    }

    // Test group_daily_assignments table
    const { error: groupError } = await supabase
      .from('group_daily_assignments')
      .select('*')
      .limit(0);

    if (groupError) {
      console.log('❌ group_daily_assignments table not accessible:', groupError.message);
    } else {
      console.log('✅ group_daily_assignments table created successfully');
    }

  } catch (error) {
    console.log('⚠️  Verification failed:', error.message);
  }
}

async function main() {
  await runDailyAssignmentMigration();
}

main();