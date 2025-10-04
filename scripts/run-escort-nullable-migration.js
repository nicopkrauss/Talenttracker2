#!/usr/bin/env node

/**
 * Migration Script: Fix talent_daily_assignments escort_id nullable
 * 
 * This script fixes the talent_daily_assignments table to allow NULL escort_id values
 * for scheduling talent without assigning them to a specific escort.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔧 Starting talent_daily_assignments escort_id nullable migration...\n');

  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'database', 'fix-talent-daily-assignments-escort-nullable.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n');

    // Execute the migration
    console.log('⚡ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration executed successfully');

    // Verify the changes
    console.log('\n🔍 Verifying migration results...');

    // Check if escort_id is now nullable
    const { data: columnInfo, error: columnError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name, is_nullable, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'talent_daily_assignments' 
          AND column_name = 'escort_id';
        `
      });

    if (columnError) {
      console.error('❌ Error checking column info:', columnError);
    } else {
      console.log('📊 Column info:', columnInfo);
    }

    // Check unique constraints
    const { data: constraints, error: constraintError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT indexname, indexdef 
          FROM pg_indexes 
          WHERE tablename = 'talent_daily_assignments' 
          AND indexname LIKE '%unique%';
        `
      });

    if (constraintError) {
      console.error('❌ Error checking constraints:', constraintError);
    } else {
      console.log('🔗 Unique constraints:', constraints);
    }

    // Record the migration
    const migrationRecord = {
      migration_name: 'fix_talent_daily_assignments_escort_nullable',
      applied_at: new Date().toISOString(),
      rollback_sql: `
        -- Rollback: Make escort_id NOT NULL again (WARNING: This will fail if NULL values exist)
        ALTER TABLE talent_daily_assignments ALTER COLUMN escort_id SET NOT NULL;
        
        -- Drop the new unique indexes
        DROP INDEX IF EXISTS talent_daily_assignments_unique_assignment;
        DROP INDEX IF EXISTS talent_daily_assignments_unique_scheduling;
        
        -- Restore original unique constraint
        ALTER TABLE talent_daily_assignments 
        ADD CONSTRAINT talent_daily_assignments_talent_id_project_id_assignment_date_key 
        UNIQUE (talent_id, project_id, assignment_date, escort_id);
      `,
      notes: 'Fixed escort_id to be nullable for scheduling without assignment. Added proper unique constraints for both assigned and unassigned states.'
    };

    const { error: recordError } = await supabase
      .from('schema_migrations')
      .insert(migrationRecord);

    if (recordError) {
      console.warn('⚠️  Could not record migration (table may not exist):', recordError.message);
    } else {
      console.log('📝 Migration recorded in schema_migrations table');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('🎯 The talent_daily_assignments table now supports:');
    console.log('   - Scheduling talent without escort assignment (escort_id = NULL)');
    console.log('   - Assigning escorts to scheduled talent (escort_id = UUID)');
    console.log('   - Proper unique constraints for both scenarios');

  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);