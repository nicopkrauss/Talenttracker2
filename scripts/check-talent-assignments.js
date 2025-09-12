#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTalentAssignments() {
  console.log('🔍 Checking talent assignments in database...\n')

  try {
    // Check projects
    console.log('1. Checking projects...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status')
      .limit(5)

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }

    console.log(`✅ Found ${projects?.length || 0} projects`)
    projects?.forEach(p => console.log(`   - ${p.name} (${p.id})`))

    // Check talent
    console.log('\n2. Checking talent...')
    const { data: talent, error: talentError } = await supabase
      .from('talent')
      .select('id, first_name, last_name')
      .limit(10)

    if (talentError) {
      console.error('❌ Error fetching talent:', talentError)
      return
    }

    console.log(`✅ Found ${talent?.length || 0} talent records`)
    talent?.slice(0, 3).forEach(t => console.log(`   - ${t.first_name} ${t.last_name} (${t.id})`))

    // Check talent assignments
    console.log('\n3. Checking talent assignments...')
    const { data: assignments, error: assignmentsError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        status,
        display_order,
        project_id,
        talent_id,
        projects(name),
        talent(first_name, last_name)
      `)
      .limit(10)

    if (assignmentsError) {
      console.error('❌ Error fetching assignments:', assignmentsError)
      return
    }

    console.log(`✅ Found ${assignments?.length || 0} talent assignments`)
    assignments?.forEach(a => {
      console.log(`   - ${a.talent?.first_name} ${a.talent?.last_name} → ${a.projects?.name} (order: ${a.display_order})`)
    })

    // If no assignments, let's create some test data
    if (!assignments || assignments.length === 0) {
      console.log('\n4. No assignments found. Creating test data...')
      
      if (projects && projects.length > 0 && talent && talent.length > 0) {
        const testProject = projects[0]
        const testTalent = talent.slice(0, 3) // Take first 3 talent

        console.log(`   Creating assignments for project: ${testProject.name}`)
        
        for (let i = 0; i < testTalent.length; i++) {
          const t = testTalent[i]
          const { data: assignment, error: assignError } = await supabase
            .from('talent_project_assignments')
            .insert({
              talent_id: t.id,
              project_id: testProject.id,
              status: 'active',
              display_order: i + 1
            })
            .select('id')
            .single()

          if (assignError) {
            console.error(`   ❌ Error creating assignment for ${t.first_name} ${t.last_name}:`, assignError)
          } else {
            console.log(`   ✅ Created assignment for ${t.first_name} ${t.last_name} (order: ${i + 1})`)
          }
        }

        console.log('\n5. Verifying created assignments...')
        const { data: newAssignments, error: verifyError } = await supabase
          .from('talent_project_assignments')
          .select(`
            id,
            status,
            display_order,
            talent(first_name, last_name)
          `)
          .eq('project_id', testProject.id)
          .order('display_order', { ascending: true })

        if (verifyError) {
          console.error('❌ Error verifying assignments:', verifyError)
        } else {
          console.log(`✅ Verified ${newAssignments?.length || 0} assignments for ${testProject.name}`)
          newAssignments?.forEach(a => {
            console.log(`   - ${a.talent?.first_name} ${a.talent?.last_name} (order: ${a.display_order})`)
          })
        }
      }
    }

    console.log('\n🎉 Database check complete!')

  } catch (error) {
    console.error('❌ Check failed with error:', error)
  }
}

checkTalentAssignments()