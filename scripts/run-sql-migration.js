#!/usr/bin/env node

/**
 * Direct SQL Migration Runner
 * 
 * Runs SQL migrations by executing them as individual statements
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

async function runSQLMigration(migrationFile) {
  console.log(`🔧 Running SQL migration: ${migrationFile}\n`);

  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'database', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n');

    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`⚡ Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`📝 Statement ${i + 1}:`);
      console.log(statement);
      
      try {
        const { data, error } = await supabase.rpc('exec', { sql: statement });
        
        if (error) {
          console.error(`❌ Statement ${i + 1} failed:`, error);
          throw error;
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
        if (data) {
          console.log('📊 Result:', data);
        }
        console.log('');
      } catch (stmtError) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, stmtError);
        throw stmtError;
      }
    }

    console.log('✅ All statements executed successfully!');

    // Record the migration
    const migrationRecord = {
      migration_name: migrationFile.replace('.sql', ''),
      applied_at: new Date().toISOString(),
      notes: `Applied via run-sql-migration.js`
    };

    const { error: recordError } = await supabase
      .from('schema_migrations')
      .insert(migrationRecord);

    if (recordError) {
      console.warn('⚠️  Could not record migration:', recordError.message);
    } else {
      console.log('📝 Migration recorded in schema_migrations table');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Please provide a migration file name');
  console.error('Usage: node run-sql-migration.js <migration-file.sql>');
  process.exit(1);
}

// Run the migration
runSQLMigration(migrationFile).catch(console.error);