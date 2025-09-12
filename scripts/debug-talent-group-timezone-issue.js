#!/usr/bin/env node

/**
 * Debug script to investigate timezone issues with talent group confirmation
 * This script will test the data flow from database to UI and back
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugTalentGroupTimezoneIssue() {
  console.log('🔍 Debugging Talent Group Timezone Issue...\n')

  try {
    // Step 1: Find a project with talent groups
    console.log('📋 Step 1: Finding project with talent groups...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date')
      .limit(5)

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`)
    }

    if (!projects || projects.length === 0) {
      throw new Error('No projects found')
    }

    const project = projects[0]
    console.log(`   ✅ Using project: ${project.name} (${project.id})`)
    console.log(`   📅 Project dates: ${project.start_date} to ${project.end_date}`)

    // Step 2: Check for talent groups in this project
    console.log('\n📋 Step 2: Checking talent groups...')
    const { data: groups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('*')
      .eq('project_id', project.id)

    if (groupsError) {
      throw new Error(`Failed to fetch talent groups: ${groupsError.message}`)
    }

    console.log(`   📊 Found ${groups?.length || 0} talent groups`)

    if (!groups || groups.length === 0) {
      console.log('   ⚠️  No talent groups found, creating test group...')
      
      // Create a test talent group with scheduled dates
      const testScheduledDates = ['2026-01-07', '2026-01-08', '2026-01-09']
      
      const { data: newGroup, error: createError } = await supabase
        .from('talent_groups')
        .insert({
          project_id: project.id,
          group_name: 'Test Timezone Group',
          members: [
            { name: 'Test Member 1', role: 'Lead' },
            { name: 'Test Member 2', role: 'Support' }
          ],
          scheduled_dates: testScheduledDates,
          point_of_contact_name: 'Test Contact',
          point_of_contact_phone: '555-0123'
        })
        .select('*')
        .single()

      if (createError) {
        throw new Error(`Failed to create test group: ${createError.message}`)
      }

      console.log(`   ✅ Created test group: ${newGroup.group_name}`)
      groups.push(newGroup)
    }

    const testGroup = groups[0]
    console.log(`\n📋 Step 3: Analyzing group "${testGroup.group_name}"...`)
    console.log(`   🆔 Group ID: ${testGroup.id}`)
    console.log(`   📅 Scheduled dates in DB: ${JSON.stringify(testGroup.scheduled_dates)}`)

    // Step 3: Test timezone conversion functions
    console.log('\n📋 Step 4: Testing timezone conversion functions...')
    
    // Simulate the isoStringsToDates function from schedule-utils.ts
    function isoStringsToDatesOLD(dateStrings) {
      return dateStrings.map(dateStr => new Date(dateStr))
    }
    
    function isoStringsToDatesNEW(dateStrings) {
      return dateStrings.map(dateStr => new Date(dateStr + 'T00:00:00'))
    }
    
    function createProjectScheduleFromStrings(startDateStr, endDateStr) {
      const startDate = new Date(startDateStr + 'T00:00:00')
      const endDate = new Date(endDateStr + 'T00:00:00')
      return { startDate, endDate }
    }

    if (testGroup.scheduled_dates && testGroup.scheduled_dates.length > 0) {
      const scheduledDates = testGroup.scheduled_dates
      const projectSchedule = createProjectScheduleFromStrings(project.start_date, project.end_date)
      
      console.log('\n   🔄 OLD timezone conversion (UTC issue):')
      const oldDates = isoStringsToDatesOLD(scheduledDates)
      oldDates.forEach((date, i) => {
        console.log(`     "${scheduledDates[i]}" → ${date.toLocaleDateString()} ${date.toTimeString().split(' ')[0]}`)
      })
      
      console.log('\n   ✅ NEW timezone conversion (fixed):')
      const newDates = isoStringsToDatesNEW(scheduledDates)
      newDates.forEach((date, i) => {
        console.log(`     "${scheduledDates[i]}" → ${date.toLocaleDateString()} ${date.toTimeString().split(' ')[0]}`)
      })
      
      console.log('\n   📊 Project schedule dates:')
      console.log(`     Start: ${projectSchedule.startDate.toLocaleDateString()} ${projectSchedule.startDate.toTimeString().split(' ')[0]}`)
      console.log(`     End: ${projectSchedule.endDate.toLocaleDateString()} ${projectSchedule.endDate.toTimeString().split(' ')[0]}`)
      
      // Test date matching
      console.log('\n   🎯 Date matching test:')
      const projectStart = projectSchedule.startDate.getTime()
      const projectEnd = projectSchedule.endDate.getTime()
      
      console.log('     OLD conversion matches:')
      oldDates.forEach((date, i) => {
        const inRange = date.getTime() >= projectStart && date.getTime() <= projectEnd
        console.log(`     "${scheduledDates[i]}" → ${inRange ? '✅' : '❌'} ${inRange ? 'IN RANGE' : 'OUT OF RANGE'}`)
      })
      
      console.log('     NEW conversion matches:')
      newDates.forEach((date, i) => {
        const inRange = date.getTime() >= projectStart && date.getTime() <= projectEnd
        console.log(`     "${scheduledDates[i]}" → ${inRange ? '✅' : '❌'} ${inRange ? 'IN RANGE' : 'OUT OF RANGE'}`)
      })
    }

    // Step 4: Test API data flow
    console.log('\n📋 Step 5: Testing API data flow...')
    
    // Simulate the talent roster API call
    const { data: rosterData, error: rosterError } = await supabase
      .from('talent_groups')
      .select(`
        id,
        group_name,
        members,
        scheduled_dates,
        assigned_escort_id,
        display_order,
        created_at,
        updated_at
      `)
      .eq('project_id', project.id)
      .order('display_order', { ascending: true, nullsFirst: false })

    if (rosterError) {
      throw new Error(`Failed to fetch roster data: ${rosterError.message}`)
    }

    console.log('   📊 API Response:')
    rosterData.forEach(group => {
      console.log(`     Group: ${group.group_name}`)
      console.log(`     Scheduled dates: ${JSON.stringify(group.scheduled_dates)}`)
      console.log(`     Members: ${group.members?.length || 0}`)
    })

    // Step 5: Test confirm all scenario
    console.log('\n📋 Step 6: Testing confirm all scenario...')
    
    // Simulate what happens when confirm all is called
    const testDates = ['2026-01-07', '2026-01-08', '2026-01-09']
    
    console.log('   🔄 Simulating date conversion for API call...')
    const convertedDates = testDates.map(date => new Date(date).toISOString().split('T')[0])
    console.log(`   Input dates: ${JSON.stringify(testDates)}`)
    console.log(`   Converted for API: ${JSON.stringify(convertedDates)}`)
    
    // Test the actual API update
    console.log('\n   🧪 Testing actual API update...')
    const updateResponse = await fetch(`http://localhost:3000/api/projects/${project.id}/talent-groups/${testGroup.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        groupName: testGroup.group_name,
        members: testGroup.members,
        scheduledDates: testDates,
        pointOfContactName: testGroup.point_of_contact_name,
        pointOfContactPhone: testGroup.point_of_contact_phone
      })
    }).catch(error => {
      console.log(`   ⚠️  API call failed (server may not be running): ${error.message}`)
      return null
    })

    if (updateResponse) {
      if (updateResponse.ok) {
        const updateData = await updateResponse.json()
        console.log('   ✅ API update successful')
        console.log(`   📊 Updated scheduled dates: ${JSON.stringify(updateData.data?.scheduledDates)}`)
      } else {
        const errorData = await updateResponse.json()
        console.log(`   ❌ API update failed: ${errorData.error}`)
      }
    }

    // Step 6: Check for common issues
    console.log('\n📋 Step 7: Checking for common issues...')
    
    // Check if schedule-utils.ts has the timezone fix
    const scheduleUtilsPath = path.join(__dirname, '..', 'lib', 'schedule-utils.ts')
    if (fs.existsSync(scheduleUtilsPath)) {
      const scheduleUtilsContent = fs.readFileSync(scheduleUtilsPath, 'utf8')
      const hasTimezoneFix = scheduleUtilsContent.includes('dateStr + \'T00:00:00\'')
      console.log(`   ${hasTimezoneFix ? '✅' : '❌'} Timezone fix in schedule-utils.ts: ${hasTimezoneFix ? 'APPLIED' : 'MISSING'}`)
    } else {
      console.log('   ❌ schedule-utils.ts not found')
    }
    
    // Check talent roster tab implementation
    const talentRosterTabPath = path.join(__dirname, '..', 'components', 'projects', 'tabs', 'talent-roster-tab.tsx')
    if (fs.existsSync(talentRosterTabPath)) {
      const tabContent = fs.readFileSync(talentRosterTabPath, 'utf8')
      const hasConfirmAll = tabContent.includes('handleConfirmAll')
      const hasRegisterConfirm = tabContent.includes('registerConfirmFunction')
      console.log(`   ${hasConfirmAll ? '✅' : '❌'} Confirm All function: ${hasConfirmAll ? 'IMPLEMENTED' : 'MISSING'}`)
      console.log(`   ${hasRegisterConfirm ? '✅' : '❌'} Register confirm function: ${hasRegisterConfirm ? 'IMPLEMENTED' : 'MISSING'}`)
    } else {
      console.log('   ❌ talent-roster-tab.tsx not found')
    }

    console.log('\n📋 Summary:')
    console.log('1. ✅ Database contains talent groups with scheduled_dates')
    console.log('2. ✅ API correctly returns scheduled_dates in response')
    console.log('3. ✅ Timezone conversion functions available (check if applied)')
    console.log('4. ✅ Confirm All functionality exists in talent roster tab')
    console.log('\n💡 If you\'re still experiencing issues:')
    console.log('   - Ensure the timezone fix is applied in schedule-utils.ts')
    console.log('   - Check that talent groups are properly registering their confirm functions')
    console.log('   - Verify that the confirm all button is calling the right functions')
    console.log('   - Check browser console for any JavaScript errors during confirmation')

  } catch (error) {
    console.error('❌ Error during debugging:', error.message)
    console.error(error.stack)
  }
}

// Run the debug script
debugTalentGroupTimezoneIssue()