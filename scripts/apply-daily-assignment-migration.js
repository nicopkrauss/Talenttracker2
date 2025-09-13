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

async function applyDailyAssignmentMigration() {
  console.log('🚀 Applying Daily Assignment Tables Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/027_create_daily_assignment_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('📋 Migration will create:');
    console.log('  - talent_daily_assignments table');
    console.log('  - group_daily_assignments table');
    console.log('  - Performance indexes');
    console.log('  - Automatic scheduled_dates maintenance triggers');
    console.log('  - Date range validation constraints');
    console.log('  - Row Level Security policies\n');

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
        
        // Execute each statement individually
        const { error } = await supabase.rpc('exec', { 
          sql: statement + ';' 
        });

        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          errorCount++;
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

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
      
      // Verify the tables were created
      await verifyMigration();
    } else {
      console.log('\n⚠️  Migration completed with errors. Please check the output above.');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
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

// Alternative approach if exec RPC doesn't work
async function showMigrationInstructions() {
  console.log('\n📋 Manual Migration Instructions:');
  console.log('If the automated migration fails, please:');
  console.log('1. Open your Supabase SQL Editor');
  console.log('2. Copy and paste the contents of migrations/027_create_daily_assignment_tables.sql');
  console.log('3. Execute the SQL manually');
  console.log('4. Run this script again to verify the results\n');
}

async function main() {
  try {
    await applyDailyAssignmentMigration();
  } catch (error) {
    console.error('Script execution failed:', error);
    await showMigrationInstructions();
  }
}

main();