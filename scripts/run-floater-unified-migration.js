#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🔧 Starting unified floater assignments migration...\n')

  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'database', 'modify-talent-daily-assignments-for-floaters.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📝 Executing migration SQL...')
    
    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`)
        
        const { error } = await supabase.rpc('exec', {
          sql: statement
        })

        if (error) {
          console.error(`   ❌ Error in statement ${i + 1}:`, error.message)
          throw error
        }
      }
    }

    console.log('✅ Migration SQL executed successfully')

    // Verify the table structure
    console.log('\n📊 Verifying table structure...')
    const { data: tableInfo, error: tableError } = await supabase.rpc('exec', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'talent_daily_assignments' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    })

    if (tableError) {
      throw tableError
    }

    console.log('📋 Updated table structure:')
    if (tableInfo && tableInfo.length > 0) {
      tableInfo.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`)
      })
    }

    // Verify constraints
    console.log('\n📊 Verifying constraints...')
    const { data: constraintInfo, error: constraintError } = await supabase.rpc('exec', {
      sql: `
        SELECT conname, contype, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'talent_daily_assignments'::regclass
        AND contype IN ('c', 'f', 'u');
      `
    })

    if (constraintError) {
      throw constraintError
    }

    console.log('📋 Constraints:')
    if (constraintInfo && constraintInfo.length > 0) {
      constraintInfo.forEach(constraint => {
        console.log(`   - ${constraint.conname} (${constraint.contype}): ${constraint.definition}`)
      })
    }

    // Record the migration
    const migrationRecord = {
      migration_name: 'modify_talent_daily_assignments_for_floaters',
      applied_at: new Date().toISOString(),
      rollback_sql: `
        -- Rollback: Make talent_id NOT NULL again (WARNING: This will fail if NULL values exist)
        DELETE FROM talent_daily_assignments WHERE talent_id IS NULL;
        ALTER TABLE talent_daily_assignments ALTER COLUMN talent_id SET NOT NULL;
        DROP CONSTRAINT IF EXISTS talent_daily_assignments_valid_assignment;
        DROP INDEX IF EXISTS idx_talent_daily_assignments_floaters;
        DROP INDEX IF EXISTS talent_daily_assignments_talent_unique;
        DROP INDEX IF EXISTS talent_daily_assignments_floater_unique;
      `,
      notes: 'Modified talent_daily_assignments table to support floater assignments using NULL talent_id values'
    }

    const { error: recordError } = await supabase
      .from('schema_migrations')
      .insert(migrationRecord)

    if (recordError) {
      console.warn('⚠️  Could not record migration (table may not exist):', recordError.message)
    } else {
      console.log('📝 Migration recorded in schema_migrations table')
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('🎯 The talent_daily_assignments table now supports:')
    console.log('   - Regular talent assignments (talent_id = UUID)')
    console.log('   - Floater assignments (talent_id = NULL)')
    console.log('   - Proper constraints and indexes for both types')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration()