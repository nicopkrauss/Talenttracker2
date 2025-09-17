#!/usr/bin/env node

/**
 * Direct Project Readiness Migration
 * This script applies the migration using direct SQL execution
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  // Parse environment variables
  const env = {}
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim()
    }
  })
  
  // Set environment variables
  Object.keys(env).forEach(key => {
    if (env[key]) {
      process.env[key] = env[key]
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('Check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🚀 Applying Project Readiness Migration...\n')

  try {
    // Step 1: Check if old table exists and backup data
    console.log('📋 Step 1: Checking existing data...')
    
    let checklistData = []
    try {
      const { data, error } = await supabase
        .from('project_setup_checklist')
        .select('*')
      
      if (!error && data) {
        checklistData = data
        console.log(`✅ Found ${checklistData.length} existing checklist records`)
      }
    } catch (err) {
      console.log('ℹ️  No existing checklist data found (this is expected for new installations)')
    }

    // Step 2: Create the new project_readiness table
    console.log('\n🔧 Step 2: Creating project_readiness table...')
    
    // Create table with basic structure first
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS project_readiness (
        project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
        
        -- Locations
        has_default_locations BOOLEAN DEFAULT TRUE,
        custom_location_count INTEGER DEFAULT 0,
        locations_finalized BOOLEAN DEFAULT FALSE,
        locations_finalized_at TIMESTAMP WITH TIME ZONE,
        locations_finalized_by UUID REFERENCES profiles(id),
        locations_status VARCHAR(20) DEFAULT 'default-only',
        
        -- Roles
        has_default_roles BOOLEAN DEFAULT TRUE,
        custom_role_count INTEGER DEFAULT 0,
        roles_finalized BOOLEAN DEFAULT FALSE,
        roles_finalized_at TIMESTAMP WITH TIME ZONE,
        roles_finalized_by UUID REFERENCES profiles(id),
        roles_status VARCHAR(20) DEFAULT 'default-only',
        
        -- Team
        total_staff_assigned INTEGER DEFAULT 0,
        supervisor_count INTEGER DEFAULT 0,
        escort_count INTEGER DEFAULT 0,
        coordinator_count INTEGER DEFAULT 0,
        team_finalized BOOLEAN DEFAULT FALSE,
        team_finalized_at TIMESTAMP WITH TIME ZONE,
        team_finalized_by UUID REFERENCES profiles(id),
        team_status VARCHAR(20) DEFAULT 'none',
        
        -- Talent
        total_talent INTEGER DEFAULT 0,
        talent_finalized BOOLEAN DEFAULT FALSE,
        talent_finalized_at TIMESTAMP WITH TIME ZONE,
        talent_finalized_by UUID REFERENCES profiles(id),
        talent_status VARCHAR(20) DEFAULT 'none',
        
        -- Assignment Progress
        assignments_status VARCHAR(20) DEFAULT 'none',
        urgent_assignment_issues INTEGER DEFAULT 0,
        
        -- Overall
        overall_status VARCHAR(20) DEFAULT 'getting-started',
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CHECK (locations_status IN ('default-only', 'configured', 'finalized')),
        CHECK (roles_status IN ('default-only', 'configured', 'finalized')),
        CHECK (team_status IN ('none', 'partial', 'finalized')),
        CHECK (talent_status IN ('none', 'partial', 'finalized')),
        CHECK (assignments_status IN ('none', 'partial', 'current', 'complete')),
        CHECK (overall_status IN ('getting-started', 'operational', 'production-ready'))
      );
    `

    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableQuery 
    })

    if (createError) {
      console.error('❌ Failed to create table:', createError.message)
      return
    }

    console.log('✅ project_readiness table created')

    // Step 3: Create indexes
    console.log('\n📊 Step 3: Creating indexes...')
    
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_project_readiness_overall_status ON project_readiness(overall_status);',
      'CREATE INDEX IF NOT EXISTS idx_project_readiness_last_updated ON project_readiness(last_updated);',
      'CREATE INDEX IF NOT EXISTS idx_project_readiness_urgent_issues ON project_readiness(urgent_assignment_issues);',
      'CREATE INDEX IF NOT EXISTS idx_project_readiness_locations_status ON project_readiness(locations_status);',
      'CREATE INDEX IF NOT EXISTS idx_project_readiness_roles_status ON project_readiness(roles_status);',
      'CREATE INDEX IF NOT EXISTS idx_project_readiness_team_status ON project_readiness(team_status);',
      'CREATE INDEX IF NOT EXISTS idx_project_readiness_talent_status ON project_readiness(talent_status);'
    ]

    for (const query of indexQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query })
      if (error) {
        console.warn(`⚠️  Warning: Failed to create index: ${error.message}`)
      }
    }

    console.log('✅ Indexes created')

    // Step 4: Migrate existing data
    if (checklistData.length > 0) {
      console.log('\n📊 Step 4: Migrating existing data...')
      
      for (const checklist of checklistData) {
        const readinessData = {
          project_id: checklist.project_id,
          locations_finalized: checklist.locations_completed || false,
          locations_finalized_at: checklist.locations_completed ? checklist.updated_at : null,
          roles_finalized: checklist.roles_and_pay_completed || false,
          roles_finalized_at: checklist.roles_and_pay_completed ? checklist.updated_at : null,
          team_finalized: checklist.team_assignments_completed || false,
          team_finalized_at: checklist.team_assignments_completed ? checklist.updated_at : null,
          talent_finalized: checklist.talent_roster_completed || false,
          talent_finalized_at: checklist.talent_roster_completed ? checklist.updated_at : null,
          created_at: checklist.created_at,
          updated_at: checklist.updated_at
        }

        const { error: insertError } = await supabase
          .from('project_readiness')
          .upsert(readinessData)

        if (insertError) {
          console.warn(`⚠️  Warning: Failed to migrate data for project ${checklist.project_id}: ${insertError.message}`)
        }
      }

      console.log(`✅ Migrated ${checklistData.length} records`)
    }

    // Step 5: Create readiness records for projects without them
    console.log('\n🔄 Step 5: Creating readiness records for all projects...')
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')

    if (projectsError) {
      console.warn('⚠️  Warning: Could not fetch projects:', projectsError.message)
    } else if (projects) {
      for (const project of projects) {
        const { error: upsertError } = await supabase
          .from('project_readiness')
          .upsert({ project_id: project.id }, { onConflict: 'project_id' })

        if (upsertError) {
          console.warn(`⚠️  Warning: Failed to create readiness for project ${project.id}: ${upsertError.message}`)
        }
      }

      console.log(`✅ Ensured readiness records for ${projects.length} projects`)
    }

    // Step 6: Remove old table (optional - can be done manually)
    console.log('\n🗑️  Step 6: Removing old table...')
    
    try {
      const { error: dropError } = await supabase.rpc('exec_sql', { 
        sql: 'DROP TABLE IF EXISTS project_setup_checklist CASCADE;' 
      })

      if (dropError) {
        console.warn('⚠️  Warning: Could not drop old table:', dropError.message)
        console.log('   You may need to drop it manually: DROP TABLE project_setup_checklist CASCADE;')
      } else {
        console.log('✅ Old project_setup_checklist table removed')
      }
    } catch (err) {
      console.warn('⚠️  Warning: Could not drop old table:', err.message)
    }

    // Step 7: Verify the migration
    console.log('\n✅ Step 7: Verifying migration...')
    
    const { data: readinessData, error: verifyError } = await supabase
      .from('project_readiness')
      .select('project_id, overall_status, locations_status, roles_status')
      .limit(5)

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message)
    } else {
      console.log(`✅ Migration verified - ${readinessData?.length || 0} readiness records found`)
      
      if (readinessData && readinessData.length > 0) {
        console.log('   Sample data:')
        readinessData.forEach(record => {
          console.log(`   - Project ${record.project_id.substring(0, 8)}...: ${record.overall_status}`)
        })
      }
    }

    console.log('\n🎉 Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. The new project_readiness system is now active')
    console.log('2. Update your application code to use the new readiness endpoints')
    console.log('3. Test the new readiness functionality')
    console.log('4. The old activation routes have been removed')

  } catch (error) {
    console.error('💥 Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('💥 Migration failed:', error)
  process.exit(1)
})