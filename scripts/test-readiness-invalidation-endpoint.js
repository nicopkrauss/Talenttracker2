#!/usr/bin/env node

/**
 * Test script for the readiness invalidation endpoint
 * This script tests the POST /api/projects/[id]/readiness/invalidate endpoint
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

async function testReadinessInvalidationEndpoint() {
  try {
    console.log('🧪 Testing readiness invalidation endpoint...')
    
    // First, get a test project
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status')
      .limit(1)
    
    if (projectsError) {
      console.error('❌ Error fetching test project:', projectsError.message)
      return
    }
    
    if (!projects || projects.length === 0) {
      console.log('⚠️ No projects found in database. Creating a test project...')
      
      // Create a test project
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          name: 'Test Project for Readiness Invalidation',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          status: 'prep',
          created_by: '00000000-0000-0000-0000-000000000000' // System user
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating test project:', createError.message)
        return
      }
      
      projects.push(newProject)
    }
    
    const testProject = projects[0]
    console.log(`📋 Using test project: ${testProject.name} (${testProject.id})`)
    
    // Test the invalidation endpoint
    const testCases = [
      {
        name: 'Role template change',
        payload: {
          reason: 'role_template_change',
          optimistic_state: {
            status: 'ready_for_activation',
            features: {
              team_management: true
            }
          }
        }
      },
      {
        name: 'Team assignment change',
        payload: {
          reason: 'team_assignment_change'
        }
      },
      {
        name: 'Location change',
        payload: {
          reason: 'location_change',
          optimistic_state: {
            features: {
              talent_tracking: true
            }
          }
        }
      },
      {
        name: 'Status change',
        payload: {
          reason: 'status_change',
          optimistic_state: {
            status: 'active'
          }
        }
      }
    ]
    
    for (const testCase of testCases) {
      console.log(`\n🔄 Testing: ${testCase.name}`)
      
      try {
        const response = await fetch(`http://localhost:3000/api/projects/${testProject.id}/readiness/invalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify(testCase.payload)
        })
        
        const responseData = await response.json()
        
        if (response.ok) {
          console.log(`✅ ${testCase.name}: Success`)
          console.log(`   Status: ${responseData.data.readiness.status}`)
          console.log(`   Features: ${Object.entries(responseData.data.readiness.features).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'none'}`)
          console.log(`   Blocking issues: ${responseData.data.readiness.blocking_issues.join(', ') || 'none'}`)
          console.log(`   Reason: ${responseData.data.reason}`)
        } else {
          console.log(`❌ ${testCase.name}: Failed (${response.status})`)
          console.log(`   Error: ${responseData.error}`)
          console.log(`   Code: ${responseData.code}`)
        }
      } catch (error) {
        console.log(`❌ ${testCase.name}: Network error - ${error.message}`)
        console.log('   Note: Make sure the development server is running (npm run dev)')
      }
    }
    
    // Test error cases
    console.log('\n🚫 Testing error cases...')
    
    // Test invalid project ID
    try {
      const response = await fetch(`http://localhost:3000/api/projects/invalid-id/readiness/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ reason: 'role_template_change' })
      })
      
      const responseData = await response.json()
      
      if (response.status === 404) {
        console.log('✅ Invalid project ID: Correctly returned 404')
      } else {
        console.log(`❌ Invalid project ID: Expected 404, got ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Invalid project ID test: Network error - ${error.message}`)
    }
    
    // Test invalid reason
    try {
      const response = await fetch(`http://localhost:3000/api/projects/${testProject.id}/readiness/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ reason: 'invalid_reason' })
      })
      
      const responseData = await response.json()
      
      if (response.status === 400) {
        console.log('✅ Invalid reason: Correctly returned 400')
      } else {
        console.log(`❌ Invalid reason: Expected 400, got ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Invalid reason test: Network error - ${error.message}`)
    }
    
    console.log('\n🎉 Readiness invalidation endpoint testing completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

testReadinessInvalidationEndpoint()