#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running talent groups display_order migration...\n')

  try {
    // Check if column already exists
    console.log('1. Checking if display_order column exists...')
    const { data: existingGroups, error: checkError } = await supabase
      .from('talent_groups')
      .select('display_order')
      .limit(1)

    if (!checkError) {
      console.log('✅ Column already exists, skipping creation')
    } else {
      console.log('Column does not exist, please run the SQL manually in Supabase dashboard:')
      console.log(`
ALTER TABLE talent_groups 
ADD COLUMN display_order INT DEFAULT 0;

CREATE INDEX idx_talent_groups_display_order 
ON talent_groups(project_id, display_order);
      `)
      return
    }

    // Initialize display_order for existing groups
    console.log('2. Initializing display_order for existing groups...')
    
    // Get all projects with groups
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }

    console.log(`Found ${projects?.length || 0} projects`)

    for (const project of projects || []) {
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
        .select('id, group_name, created_at, display_order')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true })

      if (groupsError) {
        console.error(`❌ Error fetching groups for project ${project.id}:`, groupsError)
        continue
      }

      if (groups && groups.length > 0) {
        console.log(`   Project ${project.id}: ${groups.length} groups, max talent order: ${maxOrder}`)
        
        // Update each group with incremental display_order
        for (let i = 0; i < groups.length; i++) {
          const group = groups[i]
          
          // Only update if display_order is 0 or null
          if (!group.display_order || group.display_order === 0) {
            const newOrder = maxOrder + i + 1001 // Start well after existing talent
            
            const { error: updateError } = await supabase
              .from('talent_groups')
              .update({ display_order: newOrder })
              .eq('id', group.id)

            if (updateError) {
              console.error(`❌ Error updating group ${group.id}:`, updateError)
            } else {
              console.log(`   ✅ Updated "${group.group_name}" to display_order: ${newOrder}`)
            }
          } else {
            console.log(`   ⏭️  Skipped "${group.group_name}" (already has display_order: ${group.display_order})`)
          }
        }
      }
    }

    // Verify the migration
    console.log('\n3. Verifying migration...')
    const { data: sampleGroups, error: verifyError } = await supabase
      .from('talent_groups')
      .select('id, group_name, display_order, project_id')
      .order('display_order', { ascending: true })
      .limit(10)

    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError)
      return
    }

    console.log('✅ Sample groups with display_order:')
    sampleGroups?.forEach(group => {
      console.log(`   - ${group.group_name}: display_order = ${group.display_order}`)
    })

    console.log('\n🎉 Migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

runMigration()