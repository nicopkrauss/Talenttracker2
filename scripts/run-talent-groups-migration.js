#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running talent groups display_order migration...\n')

  try {
    // Step 1: Add display_order column
    console.log('1. Adding display_order column to talent_groups...')
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE talent_groups ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;'
    })

    if (addColumnError) {
      console.error('❌ Error adding column:', addColumnError)
      return
    }
    console.log('✅ Column added successfully')

    // Step 2: Create index
    console.log('2. Creating index...')
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_talent_groups_display_order ON talent_groups(project_id, display_order);'
    })

    if (indexError) {
      console.error('❌ Error creating index:', indexError)
      return
    }
    console.log('✅ Index created successfully')

    // Step 3: Initialize display_order for existing groups
    console.log('3. Initializing display_order for existing groups...')
    
    // Get all projects with groups
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }

    for (const project of projects) {
      // Get max display_order from talent assignments
      const { data: maxTalentOrder } = await supabase
        .from('talent_project_assignments')
        .select('display_order')
        .eq('project_id', project.id)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

      const maxOrder = maxTalentOrder?.display_order || 0

      // Get groups for this project that need display_order
      const { data: groups, error: groupsError } = await supabase
        .from('talent_groups')
        .select('id, created_at')
        .eq('project_id', project.id)
        .eq('display_order', 0)
        .order('created_at', { ascending: true })

      if (groupsError) {
        console.error(`❌ Error fetching groups for project ${project.id}:`, groupsError)
        continue
      }

      if (groups && groups.length > 0) {
        console.log(`   Updating ${groups.length} groups for project ${project.id}`)
        
        // Update each group with incremental display_order
        for (let i = 0; i < groups.length; i++) {
          const newOrder = maxOrder + i + 1001 // Start well after existing talent
          
          const { error: updateError } = await supabase
            .from('talent_groups')
            .update({ display_order: newOrder })
            .eq('id', groups[i].id)

          if (updateError) {
            console.error(`❌ Error updating group ${groups[i].id}:`, updateError)
          }
        }
      }
    }

    console.log('✅ Display order initialized for existing groups')

    // Step 4: Verify the migration
    console.log('\n4. Verifying migration...')
    const { data: sampleGroups, error: verifyError } = await supabase
      .from('talent_groups')
      .select('id, group_name, display_order, project_id')
      .limit(5)

    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError)
      return
    }

    console.log('✅ Sample groups with display_order:')
    sampleGroups?.forEach(group => {
      console.log(`   - ${group.group_name}: display_order = ${group.display_order}`)
    })

    console.log('\n🎉 Migration completed successfully!')
    console.log('   - Added display_order column to talent_groups')
    console.log('   - Created index for efficient queries')
    console.log('   - Initialized display_order for existing groups')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

runMigration()