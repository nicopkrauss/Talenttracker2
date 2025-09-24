#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

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
    console.log('🔄 Renaming supervisor_comments to edit_comments...');
    
    // First check if the old column exists
    const { data: columns, error: columnError } = await supabase
      .rpc('exec', { 
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'timecards' 
          AND column_name IN ('supervisor_comments', 'edit_comments')
        `
      });
    
    if (columnError) {
      console.log('⚠️  Cannot check columns, proceeding with rename...');
    }
    
    // Rename the column
    const { error } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE timecards RENAME COLUMN supervisor_comments TO edit_comments;'
    });
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('✅ Column already renamed or does not exist');
      } else {
        console.error('❌ Migration failed:', error);
        process.exit(1);
      }
    } else {
      console.log('✅ Column successfully renamed to edit_comments');
    }
    
    // Verify the change
    console.log('🔍 Verifying column exists...');
    const { data, error: verifyError } = await supabase
      .from('timecards')
      .select('edit_comments')
      .limit(1);
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

runMigration();