#!/usr/bin/env node

/**
 * Test API Calls Directly
 * 
 * This script tests the assignments API directly to see if it's working.
 */

const fetch = require('node-fetch')
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

const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL ? env.NEXT_PUBLIC_SUPABASE_URL.replace('/rest/v1', '') : 'http://localhost:3000'

async function testApiCallsDirectly() {
  console.log('🧪 Testing API Calls Directly')
  console.log('=============================\n')
  
  try {
    const projectId = 'fc928ecf-153f-4544-9878-4bc7e85f2949' // 2025 Emmys project
    const talentId = 'd1d08745-4560-4e9c-b98d-5cc2943f0eb9' // Test group
    const date = '2026-01-09'
    
    console.log(`Testing with:`)
    console.log(`  Project ID: ${projectId}`)
    console.log(`  Talent ID: ${talentId}`)
    console.log(`  Date: ${date}`)
    console.log(`  Base URL: ${baseUrl}`)

    // Test 1: Clear assignment (escortIds: [])
    console.log('\n🧪 Test 1: Clear assignment')
    const clearRequest = {
      date: date,
      assignments: [{
        talentId: talentId,
        escortIds: [],
        dropdownCount: 1
      }]
    }
    
    console.log('Request body:', JSON.stringify(clearRequest, null, 2))
    
    const clearResponse = await fetch(`${baseUrl}/api/projects/${projectId}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clearRequest)
    })
    
    console.log(`Response status: ${clearResponse.status}`)
    const clearResult = await clearResponse.text()
    console.log('Response body:', clearResult)
    
    if (!clearResponse.ok) {
      console.log('❌ Clear assignment failed')
    } else {
      console.log('✅ Clear assignment succeeded')
    }

    // Test 2: Assign escort (escortIds: ["escort-id"])
    console.log('\n🧪 Test 2: Assign escort')
    const assignRequest = {
      date: date,
      assignments: [{
        talentId: talentId,
        escortIds: ['368dd790-794c-4683-807e-03be91f3ce46'], // Nico Krauss
        dropdownCount: 1
      }]
    }
    
    console.log('Request body:', JSON.stringify(assignRequest, null, 2))
    
    const assignResponse = await fetch(`${baseUrl}/api/projects/${projectId}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assignRequest)
    })
    
    console.log(`Response status: ${assignResponse.status}`)
    const assignResult = await assignResponse.text()
    console.log('Response body:', assignResult)
    
    if (!assignResponse.ok) {
      console.log('❌ Assign escort failed')
    } else {
      console.log('✅ Assign escort succeeded')
    }

    // Test 3: Single escort format (backward compatibility)
    console.log('\n🧪 Test 3: Single escort format (backward compatibility)')
    const singleRequest = {
      date: date,
      assignments: [{
        talentId: talentId,
        escortId: null
      }]
    }
    
    console.log('Request body:', JSON.stringify(singleRequest, null, 2))
    
    const singleResponse = await fetch(`${baseUrl}/api/projects/${projectId}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(singleRequest)
    })
    
    console.log(`Response status: ${singleResponse.status}`)
    const singleResult = await singleResponse.text()
    console.log('Response body:', singleResult)
    
    if (!singleResponse.ok) {
      console.log('❌ Single escort clear failed')
    } else {
      console.log('✅ Single escort clear succeeded')
    }

    console.log('\n🔧 DIAGNOSIS:')
    console.log('=============')
    console.log('• If all tests succeed: API is working, issue is in frontend calls')
    console.log('• If tests fail: API has issues that need fixing')
    console.log('• Check browser network tab to see actual requests being made')
    console.log('• Look for authentication issues or CORS problems')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testApiCallsDirectly()