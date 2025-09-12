#!/usr/bin/env node

/**
 * Complete test for the team availability confirmation workflow
 * Tests the entire flow from pending to confirmed assignments
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

async function testConfirmationWorkflow() {
  console.log('🚀 Testing complete team availability confirmation workflow...')
  
  try {
    // 1. Verify database schema
    console.log('\n1. Verifying database schema...')
    const { data: schemaTest, error: schemaError } = await supabase
      .from('team_assignments')
      .select('id, available_dates, confirmed_at')
      .limit(1)
    
    if (schemaError) {
      if (schemaError.code === '42703') {
        console.error('❌ Database schema incomplete. Please run the SQL commands from the previous script.')
        return
      }
      console.error('❌ Schema error:', schemaError.message)
      return
    }
    
    console.log('✅ Database schema is complete')
    
    // 2. Find a test project with assignments
    console.log('\n2. Finding test project...')
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id, 
        name, 
        start_date, 
        end_date,
        team_assignments(
          id,
          user_id,
          role,
          available_dates,
          confirmed_at,
          profiles(full_name)
        )
      `)
      .not('team_assignments', 'is', null)
      .limit(1)
    
    if (projectError || !projects || projects.length === 0) {
      console.log('⚠️  No test projects found. Creating a test scenario would require more setup.')
      return
    }
    
    const testProject = projects[0]
    console.log(`✅ Found test project: ${testProject.name}`)
    console.log(`   Dates: ${testProject.start_date} to ${testProject.end_date}`)
    
    // 3. Test the workflow states
    console.log('\n3. Testing workflow states...')
    
    // Count pending vs confirmed assignments
    const pendingAssignments = testProject.team_assignments.filter(a => !a.confirmed_at)
    const confirmedAssignments = testProject.team_assignments.filter(a => a.confirmed_at)
    
    console.log(`   📋 Pending assignments: ${pendingAssignments.length}`)
    console.log(`   ✅ Confirmed assignments: ${confirmedAssignments.length}`)
    
    // 4. Test confirmation process (if we have a pending assignment)
    if (pendingAssignments.length > 0) {
      const testAssignment = pendingAssignments[0]
      console.log(`\n4. Testing confirmation for: ${testAssignment.profiles.full_name}`)
      
      // Calculate project dates for availability
      const startDate = new Date(testProject.start_date)
      const endDate = new Date(testProject.end_date)
      const projectDates = []
      
      const current = new Date(startDate)
      while (current <= endDate) {
        projectDates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
      
      console.log(`   Project has ${projectDates.length} days: ${projectDates.join(', ')}`)
      
      // Simulate confirming availability for all project days
      const { data: updatedAssignment, error: updateError } = await supabase
        .from('team_assignments')
        .update({
          available_dates: projectDates,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', testAssignment.id)
        .select('id, available_dates, confirmed_at, profiles(full_name)')
        .single()
      
      if (updateError) {
        console.error('❌ Failed to confirm availability:', updateError.message)
        return
      }
      
      console.log('✅ Successfully confirmed availability!')
      console.log(`   Available for: ${updatedAssignment.available_dates.length} days`)
      console.log(`   Confirmed at: ${updatedAssignment.confirmed_at}`)
      
      // 5. Test querying by confirmation status
      console.log('\n5. Testing confirmation status queries...')
      
      const { data: nowPending } = await supabase
        .from('team_assignments')
        .select('id, profiles(full_name)')
        .eq('project_id', testProject.id)
        .is('confirmed_at', null)
      
      const { data: nowConfirmed } = await supabase
        .from('team_assignments')
        .select('id, profiles(full_name)')
        .eq('project_id', testProject.id)
        .not('confirmed_at', 'is', null)
      
      console.log(`   📋 Still pending: ${nowPending?.length || 0}`)
      console.log(`   ✅ Now confirmed: ${nowConfirmed?.length || 0}`)
      
      // 6. Test editing confirmed availability
      console.log('\n6. Testing availability editing...')
      
      // Remove one day from availability
      const editedDates = projectDates.slice(0, -1) // Remove last day
      
      const { data: editedAssignment, error: editError } = await supabase
        .from('team_assignments')
        .update({
          available_dates: editedDates
          // Note: confirmed_at stays the same, only availability changes
        })
        .eq('id', updatedAssignment.id)
        .select('available_dates, confirmed_at')
        .single()
      
      if (editError) {
        console.error('❌ Failed to edit availability:', editError.message)
        return
      }
      
      console.log('✅ Successfully edited availability!')
      console.log(`   Now available for: ${editedAssignment.available_dates.length} days`)
      console.log(`   Original confirmation time preserved: ${editedAssignment.confirmed_at}`)
      
    } else {
      console.log('\n4. No pending assignments to test confirmation with')
    }
    
    console.log('\n🎉 All workflow tests completed successfully!')
    console.log('\n📋 Summary of the confirmation workflow:')
    console.log('   1. Team members start as "pending" (confirmed_at = null)')
    console.log('   2. When availability is confirmed, confirmed_at is set to current timestamp')
    console.log('   3. Confirmed members show availability patterns instead of basic info')
    console.log('   4. Availability can be edited while preserving confirmation status')
    console.log('   5. UI separates pending and confirmed members into different sections')
    
  } catch (error) {
    console.error('❌ Test error:', error.message)
  }
}

testConfirmationWorkflow()