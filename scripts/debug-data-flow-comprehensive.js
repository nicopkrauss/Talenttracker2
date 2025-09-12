#!/usr/bin/env node

/**
 * Comprehensive debug script to trace the exact data flow
 * from database → API → component props → component state
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugDataFlow() {
  console.log('🔍 Comprehensive Data Flow Debug...\n')

  try {
    // Step 1: Find a talent with scheduled_dates
    console.log('📋 Step 1: Finding talent with scheduled_dates...')
    const { data: assignments, error } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        talent_id,
        project_id,
        scheduled_dates,
        talent:talent_id (
          first_name,
          last_name
        ),
        projects:project_id (
          name,
          start_date,
          end_date
        )
      `)
      .not('scheduled_dates', 'is', null)
      .limit(5)

    if (error) {
      console.error('❌ Database error:', error)
      return
    }

    const assignmentWithDates = assignments?.find(a => a.scheduled_dates && a.scheduled_dates.length > 0)
    
    if (!assignmentWithDates) {
      console.log('❌ No assignments found with scheduled_dates')
      return
    }

    console.log(`✅ Found: ${assignmentWithDates.talent.first_name} ${assignmentWithDates.talent.last_name}`)
    console.log(`   Project: ${assignmentWithDates.projects.name}`)
    console.log(`   scheduled_dates: ${JSON.stringify(assignmentWithDates.scheduled_dates)}`)
    console.log(`   Project dates: ${assignmentWithDates.projects.start_date} to ${assignmentWithDates.projects.end_date}`)

    // Step 2: Test the API endpoint that the component uses
    console.log('\n📋 Step 2: Testing talent roster API endpoint...')
    const projectId = assignmentWithDates.project_id
    
    const { data: rosterData, error: rosterError } = await supabase
      .from('talent_project_assignments')
      .select(`
        id,
        status,
        assigned_at,
        scheduled_dates,
        display_order,
        talent:talent_id (
          id,
          first_name,
          last_name,
          rep_name,
          rep_email,
          rep_phone,
          notes,
          created_at,
          updated_at
        )
      `)
      .eq('project_id', projectId)
      .order('display_order', { ascending: true })

    if (rosterError) {
      console.error('❌ Roster API error:', rosterError)
      return
    }

    // Transform data like the API does
    const transformedTalent = rosterData?.map(assignment => ({
      id: assignment.talent.id,
      first_name: assignment.talent.first_name,
      last_name: assignment.talent.last_name,
      rep_name: assignment.talent.rep_name,
      rep_email: assignment.talent.rep_email,
      rep_phone: assignment.talent.rep_phone,
      notes: assignment.talent.notes,
      created_at: assignment.talent.created_at,
      updated_at: assignment.talent.updated_at,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        assigned_at: assignment.assigned_at,
        scheduled_dates: assignment.scheduled_dates,
        display_order: assignment.display_order || 0
      }
    })) || []

    console.log('✅ API transformation result:')
    const targetTalent = transformedTalent.find(t => 
      t.assignment.scheduled_dates && t.assignment.scheduled_dates.length > 0
    )
    
    if (targetTalent) {
      console.log(`   Talent: ${targetTalent.first_name} ${targetTalent.last_name}`)
      console.log(`   assignment.scheduled_dates: ${JSON.stringify(targetTalent.assignment.scheduled_dates)}`)
    }

    // Step 3: Test what gets passed to TalentScheduleColumn
    console.log('\n📋 Step 3: Testing TalentScheduleColumn props...')
    const initialScheduledDates = targetTalent?.assignment?.scheduled_dates || []
    console.log(`   initialScheduledDates prop: ${JSON.stringify(initialScheduledDates)}`)
    console.log(`   Type: ${typeof initialScheduledDates}, Array: ${Array.isArray(initialScheduledDates)}`)

    // Step 4: Test the isoStringsToDates conversion
    console.log('\n📋 Step 4: Testing date conversion...')
    if (Array.isArray(initialScheduledDates) && initialScheduledDates.length > 0) {
      console.log('   Converting ISO strings to Date objects (with timezone fix)...')
      const convertedDates = initialScheduledDates.map(dateStr => {
        const date = new Date(dateStr + 'T00:00:00')  // Fixed timezone handling
        console.log(`     "${dateStr}" → ${date.toISOString()} (${date.toLocaleDateString()})`)
        return date
      })
      
      console.log(`   Result: ${convertedDates.length} Date objects`)
      
      // Step 5: Test project schedule calculation
      console.log('\n📋 Step 5: Testing project schedule...')
      const project = assignmentWithDates.projects
      const startDate = new Date(project.start_date + 'T00:00:00')
      const endDate = new Date(project.end_date + 'T00:00:00')
      
      console.log(`   Project: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`)
      
      // Calculate all project dates
      const allDates = []
      const current = new Date(startDate)
      while (current <= endDate) {
        allDates.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      
      console.log(`   All project dates: ${allDates.map(d => d.toLocaleDateString()).join(', ')}`)
      
      // Check if converted dates are in project range
      console.log('\n📋 Step 6: Checking date compatibility...')
      convertedDates.forEach((date, index) => {
        const isInRange = allDates.some(projectDate => 
          projectDate.getTime() === date.getTime()
        )
        console.log(`     Date ${index + 1}: ${date.toLocaleDateString()} - ${isInRange ? '✅ In range' : '❌ Out of range'}`)
      })
      
    } else {
      console.log('   ❌ No dates to convert')
    }

    // Step 7: Identify the issue
    console.log('\n📋 Step 7: Issue Analysis...')
    console.log('   The issue is likely one of these:')
    console.log('   1. Component state not updating when initialScheduledDates prop changes')
    console.log('   2. Date conversion happening at wrong time')
    console.log('   3. Component mounting before data is available')
    console.log('   4. Date comparison logic in CircularDateSelector')
    
    console.log('\n🎯 Recommended Fix:')
    console.log('   Add useEffect to sync state when initialScheduledDates changes:')
    console.log('   ```typescript')
    console.log('   useEffect(() => {')
    console.log('     const newDates = isoStringsToDates(initialScheduledDates)')
    console.log('     setOriginalScheduledDates(newDates)')
    console.log('     setScheduledDates(newDates)')
    console.log('   }, [initialScheduledDates])')
    console.log('   ```')

  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugDataFlow().then(() => {
  console.log('\n✅ Debug completed!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Debug failed:', error)
  process.exit(1)
})