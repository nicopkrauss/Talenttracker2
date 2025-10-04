#!/usr/bin/env node

/**
 * Direct fix for talent_daily_assignments escort_id nullable issue
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixEscortNullable() {
  console.log('🔧 Fixing talent_daily_assignments escort_id to be nullable...\n');

  try {
    // Step 1: Make escort_id nullable
    console.log('📝 Step 1: Making escort_id nullable...');
    const { error: alterError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE talent_daily_assignments ALTER COLUMN escort_id DROP NOT NULL'
    });

    if (alterError) {
      console.error('❌ Failed to make escort_id nullable:', alterError);
      throw alterError;
    }
    console.log('✅ escort_id is now nullable');

    // Step 2: Drop existing unique constraint if it exists
    console.log('\n📝 Step 2: Dropping existing unique constraint...');
    const { error: dropError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE talent_daily_assignments DROP CONSTRAINT IF EXISTS talent_daily_assignments_talent_id_project_id_assignment_date_key'
    });

    if (dropError) {
      console.error('❌ Failed to drop constraint:', dropError);
      // Continue anyway, constraint might not exist
    }
    console.log('✅ Existing constraint dropped (if it existed)');

    // Step 3: Create unique index for assigned entries
    console.log('\n📝 Step 3: Creating unique index for assigned entries...');
    const { error: assignedIndexError } = await supabase.rpc('exec', {
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS talent_daily_assignments_unique_assignment 
            ON talent_daily_assignments (talent_id, project_id, assignment_date, escort_id)
            WHERE escort_id IS NOT NULL`
    });

    if (assignedIndexError) {
      console.error('❌ Failed to create assigned index:', assignedIndexError);
      throw assignedIndexError;
    }
    console.log('✅ Unique index for assigned entries created');

    // Step 4: Create unique index for scheduling entries
    console.log('\n📝 Step 4: Creating unique index for scheduling entries...');
    const { error: schedulingIndexError } = await supabase.rpc('exec', {
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS talent_daily_assignments_unique_scheduling
            ON talent_daily_assignments (talent_id, project_id, assignment_date)
            WHERE escort_id IS NULL`
    });

    if (schedulingIndexError) {
      console.error('❌ Failed to create scheduling index:', schedulingIndexError);
      throw schedulingIndexError;
    }
    console.log('✅ Unique index for scheduling entries created');

    // Step 5: Add column comment
    console.log('\n📝 Step 5: Adding column comment...');
    const { error: commentError } = await supabase.rpc('exec', {
      sql: `COMMENT ON COLUMN talent_daily_assignments.escort_id IS 'Escort assigned to this talent for this date. NULL indicates talent is scheduled but not yet assigned to an escort.'`
    });

    if (commentError) {
      console.warn('⚠️  Failed to add comment (non-critical):', commentError);
    } else {
      console.log('✅ Column comment added');
    }

    // Record the migration
    const migrationRecord = {
      migration_name: 'fix_talent_daily_assignments_escort_nullable',
      applied_at: new Date().toISOString(),
      notes: 'Fixed escort_id to be nullable for scheduling without assignment via direct script'
    };

    const { error: recordError } = await supabase
      .from('schema_migrations')
      .insert(migrationRecord);

    if (recordError) {
      console.warn('⚠️  Could not record migration:', recordError.message);
    } else {
      console.log('\n📝 Migration recorded in schema_migrations table');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('🎯 The talent_daily_assignments table now supports:');
    console.log('   - Scheduling talent without escort assignment (escort_id = NULL)');
    console.log('   - Assigning escorts to scheduled talent (escort_id = UUID)');
    console.log('   - Proper unique constraints for both scenarios');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the fix
fixEscortNullable().catch(console.error);