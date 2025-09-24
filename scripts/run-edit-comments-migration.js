#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Running edit_comments migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '037_rename_supervisor_comments_to_edit_comments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the change
    console.log('🔍 Verifying column rename...');
    const { data, error: verifyError } = await supabase
      .from('timecards')
      .select('edit_comments')
      .limit(1);
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      process.exit(1);
    }
    
    console.log('✅ Column successfully renamed to edit_comments');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

runMigration();