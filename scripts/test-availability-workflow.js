#!/usr/bin/env node

/**
 * Test script for the team availability confirmation workflow
 * This script tests the new availability features in the multi-day scheduling system
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

async function testAvailabilityWorkflow() {
  console.log('🚀 Testing team availability confirmation workflow...')
  
  try {
    // 1. Check if the new columns exist
    console.log('\n1. Checking database schema...')
    const { data: assignments, error: schemaError } = await supabase
      .from('team_assignments')
      .select('id, available_dates, confirmed_at')
      .limit(1)
    
    if (schemaError) {
      console.error('❌ Schema error:', schemaError.message)
      return
    }
    
    console.log('✅ Database schema includes availability columns')
    
    // 2. Get a test project with team assignments
    console.log('\n2. Finding test project with team assignments...')
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
    
    if (projectError) {
      console.error('❌ Project query error:', projectError.message)
      return
    }
    
    if (!projects || projects.length === 0) {
      console.log('⚠️  No projects with team assignments found')
      return
    }
    
    const testProject = projects[0]
    console.log(`✅ Found test project: ${testProject.name}`)
    console.log(`   Project dates: ${testProject.start_date} to ${testProject.end_date}`)
    console.log(`   Team assignments: ${testProject.team_assignments.length}`)
    
    // 3. Test availability update
    if (testProject.team_assignments.length > 0) {
      const testAssignment = testProject.team_assignments[0]
      console.log(`\n3. Testing availability update for ${testAssignment.profiles.full_name}...`)
      
      // Calculate some test dates
      const startDate = new Date(testProject.start_date)
      const endDate = new Date(testProject.end_date)
      const testDates = []
      
      const current = new Date(startDate)
      while (current <= endDate) {
        testDates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
      
      // Update availability
      const { data: updatedAssignment, error: updateError } = await supabase
        .from('team_assignments')
        .update({
          available_dates: testDates,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', testAssignment.id)
        .select('id, available_dates, confirmed_at')
        .single()
      
      if (updateError) {
        console.error('❌ Update error:', updateError.message)
        return
      }
      
      console.log('✅ Successfully updated availability')
      console.log(`   Available dates: ${updatedAssignment.available_dates.length} days`)
      console.log(`   Confirmed at: ${updatedAssignment.confirmed_at}`)
      
      // 4. Test querying confirmed vs pending assignments
      console.log('\n4. Testing confirmed vs pending assignment queries...')
      
      const { data: confirmedAssignments, error: confirmedError } = await supabase
        .from('team_assignments')
        .select('id, profiles(full_name), confirmed_at')
        .eq('project_id', testProject.id)
        .not('confirmed_at', 'is', null)
      
      const { data: pendingAssignments, error: pendingError } = await supabase
        .from('team_assignments')
        .select('id, profiles(full_name), confirmed_at')
        .eq('project_id', testProject.id)
        .is('confirmed_at', null)
      
      if (confirmedError || pendingError) {
        console.error('❌ Query error:', confirmedError?.message || pendingError?.message)
        return
      }
      
      console.log(`✅ Confirmed assignments: ${confirmedAssignments.length}`)
      console.log(`✅ Pending assignments: ${pendingAssignments.length}`)
      
      confirmedAssignments.forEach(a => {
        console.log(`   - ${a.profiles.full_name} (confirmed)`)
      })
      
      pendingAssignments.forEach(a => {
        console.log(`   - ${a.profiles.full_name} (pending)`)
      })
    }
    
    console.log('\n🎉 All tests passed! The availability workflow is working correctly.')
    
  } catch (error) {
    console.error('❌ Test error:', error.message)
  }
}

testAvailabilityWorkflow()