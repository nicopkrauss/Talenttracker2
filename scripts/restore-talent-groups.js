#!/usr/bin/env node

/**
 * Restore Talent Groups Functionality
 * This script restores the talent_groups table and scheduled_dates column that were accidentally dropped
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

// Parse environment variables
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function restoreTalentGroups() {
  console.log('🔄 Restoring talent groups functionality...\n')

  try {
    // 1. Check if talent_groups table exists
    console.log('1. Checking if talent_groups table exists...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'talent_groups')

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError.message)
      return
    }

    const talentGroupsExists = tables && tables.length > 0
    console.log(talentGroupsExists ? '✅ talent_groups table exists' : '❌ talent_groups table missing')

    // 2. Check if scheduled_dates column exists in talent_project_assignments
    console.log('\n2. Checking if scheduled_dates column exists...')
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'talent_project_assignments')
      .eq('column_name', 'scheduled_dates')

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError.message)
      return
    }

    const scheduledDatesExists = columns && columns.length > 0
    console.log(scheduledDatesExists ? '✅ scheduled_dates column exists' : '❌ scheduled_dates column missing')

    // 3. Restore talent_groups table if missing
    if (!talentGroupsExists) {
      console.log('\n3. Creating talent_groups table...')
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS talent_groups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          group_name VARCHAR(255) NOT NULL,
          members JSONB NOT NULL DEFAULT '[]'::jsonb,
          scheduled_dates DATE[] NOT NULL DEFAULT '{}',
          assigned_escort_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `

      const { error: createError } = await supabase.rpc('exec_sql', { sql_query: createTableSQL })
      
      if (createError) {
        console.log('⚠️  Direct SQL execution not available, using alternative approach...')
        
        // Try to create via Prisma push
        console.log('   Running prisma db push to sync schema...')
        const { execSync } = require('child_process')
        
        try {
          execSync('npx prisma db push', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
          console.log('✅ Schema synced via Prisma')
        } catch (pushError) {
          console.error('❌ Error syncing schema:', pushError.message)
          return
        }
      } else {
        console.log('✅ talent_groups table created')
        
        // Add indexes
        const indexSQL = `
          CREATE INDEX IF NOT EXISTS idx_talent_groups_project_id ON talent_groups(project_id);
          CREATE INDEX IF NOT EXISTS idx_talent_groups_scheduled_dates ON talent_groups USING GIN(scheduled_dates);
          CREATE INDEX IF NOT EXISTS idx_talent_groups_assigned_escort ON talent_groups(assigned_escort_id);
          
          ALTER TABLE talent_groups ADD CONSTRAINT IF NOT EXISTS unique_group_name_per_project 
            UNIQUE (project_id, group_name);
          
          ALTER TABLE talent_groups ADD CONSTRAINT IF NOT EXISTS valid_members_array 
            CHECK (jsonb_typeof(members) = 'array');
        `
        
        const { error: indexError } = await supabase.rpc('exec_sql', { sql_query: indexSQL })
        if (indexError) {
          console.log('⚠️  Could not create indexes via SQL, they may be created by Prisma')
        } else {
          console.log('✅ Indexes and constraints created')
        }
      }
    }

    // 4. Restore scheduled_dates column if missing
    if (!scheduledDatesExists) {
      console.log('\n4. Adding scheduled_dates column to talent_project_assignments...')
      
      const addColumnSQL = `
        ALTER TABLE talent_project_assignments 
        ADD COLUMN IF NOT EXISTS scheduled_dates DATE[] NOT NULL DEFAULT '{}';
        
        CREATE INDEX IF NOT EXISTS idx_talent_project_assignments_scheduled_dates 
        ON talent_project_assignments USING GIN(scheduled_dates);
      `

      const { error: columnError } = await supabase.rpc('exec_sql', { sql_query: addColumnSQL })
      
      if (columnError) {
        console.log('⚠️  Could not add column via SQL, running Prisma sync...')
        
        try {
          const { execSync } = require('child_process')
          execSync('npx prisma db push', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
          console.log('✅ Column added via Prisma')
        } catch (pushError) {
          console.error('❌ Error adding column:', pushError.message)
          return
        }
      } else {
        console.log('✅ scheduled_dates column added')
      }
    }

    // 5. Verify restoration
    console.log('\n5. Verifying restoration...')
    
    // Check talent_groups table
    const { data: groupsTest, error: groupsTestError } = await supabase
      .from('talent_groups')
      .select('id')
      .limit(1)

    if (groupsTestError && !groupsTestError.message.includes('does not exist')) {
      console.error('❌ Error testing talent_groups table:', groupsTestError.message)
    } else if (groupsTestError) {
      console.log('❌ talent_groups table still not accessible')
    } else {
      console.log('✅ talent_groups table is accessible')
    }

    // Check scheduled_dates column
    const { data: assignmentsTest, error: assignmentsTestError } = await supabase
      .from('talent_project_assignments')
      .select('id, scheduled_dates')
      .limit(1)

    if (assignmentsTestError) {
      console.error('❌ Error testing scheduled_dates column:', assignmentsTestError.message)
    } else {
      console.log('✅ scheduled_dates column is accessible')
    }

    // 6. Check API endpoints
    console.log('\n6. Checking API endpoints...')
    
    const talentGroupsApiPath = path.join(__dirname, '..', 'app', 'api', 'projects', '[id]', 'talent-groups', 'route.ts')
    const groupApiPath = path.join(__dirname, '..', 'app', 'api', 'projects', '[id]', 'talent-groups', '[groupId]', 'route.ts')
    
    console.log(fs.existsSync(talentGroupsApiPath) ? '✅ Talent groups API endpoint exists' : '❌ Talent groups API endpoint missing')
    console.log(fs.existsSync(groupApiPath) ? '✅ Individual group API endpoint exists' : '❌ Individual group API endpoint missing')

    // 7. Check frontend components
    console.log('\n7. Checking frontend components...')
    
    const groupModalPath = path.join(__dirname, '..', 'components', 'projects', 'group-creation-modal.tsx')
    const groupBadgePath = path.join(__dirname, '..', 'components', 'projects', 'group-badge.tsx')
    
    console.log(fs.existsSync(groupModalPath) ? '✅ Group creation modal exists' : '❌ Group creation modal missing')
    console.log(fs.existsSync(groupBadgePath) ? '✅ Group badge component exists' : '❌ Group badge component missing')

    console.log('\n🎉 Talent groups restoration completed!')
    console.log('\n📋 Next steps:')
    console.log('   1. Run: npx prisma generate')
    console.log('   2. Test talent group creation in the UI')
    console.log('   3. Verify all talent group functionality works')
    console.log('   4. Check that drag-to-reorder still works for individual talent')

  } catch (error) {
    console.error('❌ Restoration failed:', error.message)
  }
}

restoreTalentGroups()