/**
 * Coordinator Role Migration Instructions
 * This script provides the exact SQL commands needed to complete the migration
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

async function checkCurrentState() {
  console.log('📊 Checking current database state...');
  
  try {
    // Check current role counts for old role name
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (profilesError) throw profilesError;
    
    const { data: templatesData, error: templatesError } = await supabase
      .from('project_role_templates')
      .select('role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (templatesError) throw templatesError;
    
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('team_assignments')
      .select('role')
      .eq('role', 'talent_logistics_coordinator');
    
    if (assignmentsError) throw assignmentsError;
    
    console.log('📈 Records needing migration:');
    console.log(`   - Profiles with talent_logistics_coordinator: ${profilesData.length}`);
    console.log(`   - Role templates with talent_logistics_coordinator: ${templatesData.length}`);
    console.log(`   - Team assignments with talent_logistics_coordinator: ${assignmentsData.length}`);
    
    const totalRecords = profilesData.length + templatesData.length + assignmentsData.length;
    console.log(`   - Total records to migrate: ${totalRecords}`);
    
    return {
      profiles: profilesData.length,
      templates: templatesData.length,
      assignments: assignmentsData.length,
      total: totalRecords
    };
  } catch (error) {
    console.error('❌ Error checking current state:', error.message);
    throw error;
  }
}

async function generateMigrationSQL(counts) {
  console.log('\n📝 Generating migration SQL commands...');
  
  const sqlCommands = [
    '-- ============================================================================',
    '-- COORDINATOR ROLE MIGRATION SQL COMMANDS',
    '-- Execute these commands in your Supabase SQL Editor or psql',
    '-- ============================================================================',
    '',
    '-- Step 1: Add coordinator enum values',
    "ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'coordinator';",
    "ALTER TYPE project_role ADD VALUE IF NOT EXISTS 'coordinator';",
    '',
    '-- Step 2: Migrate existing data',
    "UPDATE profiles SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';",
    "UPDATE project_role_templates SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';",
    "UPDATE team_assignments SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';",
    '',
    '-- Step 3: Verify migration (these should return 0 rows)',
    "SELECT COUNT(*) as remaining_profiles FROM profiles WHERE role = 'talent_logistics_coordinator';",
    "SELECT COUNT(*) as remaining_templates FROM project_role_templates WHERE role = 'talent_logistics_coordinator';",
    "SELECT COUNT(*) as remaining_assignments FROM team_assignments WHERE role = 'talent_logistics_coordinator';",
    '',
    '-- Step 4: Check migrated data (these should show the migrated counts)',
    "SELECT COUNT(*) as coordinator_profiles FROM profiles WHERE role = 'coordinator';",
    "SELECT COUNT(*) as coordinator_templates FROM project_role_templates WHERE role = 'coordinator';",
    "SELECT COUNT(*) as coordinator_assignments FROM team_assignments WHERE role = 'coordinator';",
    '',
    '-- Expected results after migration:',
    `-- coordinator_profiles: ${counts.profiles}`,
    `-- coordinator_templates: ${counts.templates}`,
    `-- coordinator_assignments: ${counts.assignments}`,
    '',
    '-- ============================================================================'
  ];
  
  return sqlCommands.join('\n');
}

async function provideMigrationInstructions() {
  console.log('🚀 Coordinator Role Migration Instructions');
  console.log('=========================================');
  
  try {
    // Step 1: Check current state
    const counts = await checkCurrentState();
    
    if (counts.total === 0) {
      console.log('\n✅ No records found with talent_logistics_coordinator role');
      console.log('   Migration may already be complete or no data exists to migrate');
      return;
    }
    
    // Step 2: Generate SQL commands
    const migrationSQL = await generateMigrationSQL(counts);
    
    // Step 3: Write SQL to file
    const fs = require('fs');
    const path = require('path');
    
    const sqlFilePath = path.join(__dirname, '../migrations/coordinator-migration-manual.sql');
    fs.writeFileSync(sqlFilePath, migrationSQL);
    
    console.log('\n📄 Migration SQL commands generated:');
    console.log(`   File: ${sqlFilePath}`);
    
    // Step 4: Display instructions
    console.log('\n🔧 MANUAL MIGRATION REQUIRED');
    console.log('============================');
    console.log('');
    console.log('The coordinator enum values do not exist in your database.');
    console.log('You need to run the SQL commands manually using one of these methods:');
    console.log('');
    console.log('METHOD 1: Supabase Dashboard');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL commands below');
    console.log('4. Execute the commands');
    console.log('');
    console.log('METHOD 2: Command Line (if you have psql access)');
    console.log('1. Connect to your database using psql');
    console.log('2. Run the SQL file: \\i migrations/coordinator-migration-manual.sql');
    console.log('');
    console.log('SQL COMMANDS TO EXECUTE:');
    console.log('========================');
    console.log(migrationSQL);
    console.log('');
    console.log('After running these commands, execute this script again to verify:');
    console.log('   node scripts/verify-coordinator-migration.js');
    
  } catch (error) {
    console.error('\n💥 Error generating instructions:', error.message);
    process.exit(1);
  }
}

// Run the instruction generator
provideMigrationInstructions();