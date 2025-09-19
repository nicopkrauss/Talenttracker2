#!/usr/bin/env node

/**
 * Test Settings API Endpoints
 * This script tests the settings API endpoints to see what's failing
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

async function testSettingsAPI() {
  console.log('🧪 Testing Settings API...')
  
  try {
    // Get a project ID to test with
    console.log('Getting a project to test with...')
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)
    
    if (projectError || !projects || projects.length === 0) {
      console.error('❌ No projects found:', projectError)
      return
    }
    
    const testProject = projects[0]
    console.log(`✅ Using project: ${testProject.name} (${testProject.id})`)
    
    // Test project_settings table directly
    console.log('\n📋 Testing project_settings table...')
    const { data: settingsData, error: settingsError } = await supabase
      .from('project_settings')
      .select('*')
      .eq('project_id', testProject.id)
    
    if (settingsError) {
      console.error('❌ Error querying project_settings:', settingsError)
    } else {
      console.log('✅ project_settings query successful')
      console.log('Settings data:', settingsData)
    }
    
    // Test project_audit_log table directly
    console.log('\n📋 Testing project_audit_log table...')
    const { data: auditData, error: auditError } = await supabase
      .from('project_audit_log')
      .select(`
        id,
        action,
        details,
        created_at,
        user:profiles!project_audit_log_user_id_fkey(
          id,
          full_name
        )
      `)
      .eq('project_id', testProject.id)
      .limit(5)
    
    if (auditError) {
      console.error('❌ Error querying project_audit_log:', auditError)
    } else {
      console.log('✅ project_audit_log query successful')
      console.log('Audit data:', auditData)
    }
    
    // Test project_attachments table directly
    console.log('\n📋 Testing project_attachments table...')
    const { data: attachmentsData, error: attachmentsError } = await supabase
      .from('project_attachments')
      .select(`
        id,
        name,
        type,
        content,
        file_url,
        file_size,
        mime_type,
        created_at,
        created_by_user:profiles!project_attachments_created_by_fkey(
          id,
          full_name
        )
      `)
      .eq('project_id', testProject.id)
    
    if (attachmentsError) {
      console.error('❌ Error querying project_attachments:', attachmentsError)
    } else {
      console.log('✅ project_attachments query successful')
      console.log('Attachments data:', attachmentsData)
    }
    
    // Test API endpoints by making HTTP requests
    console.log('\n🌐 Testing API endpoints...')
    
    const baseUrl = 'http://localhost:3001' // Adjust port if needed
    
    try {
      // Test settings endpoint
      console.log('Testing /api/projects/{id}/settings...')
      const settingsResponse = await fetch(`${baseUrl}/api/projects/${testProject.id}/settings`)
      console.log('Settings API status:', settingsResponse.status)
      
      if (!settingsResponse.ok) {
        const errorText = await settingsResponse.text()
        console.log('Settings API error:', errorText)
      } else {
        const settingsResult = await settingsResponse.json()
        console.log('Settings API success:', settingsResult)
      }
      
    } catch (fetchError) {
      console.log('❌ Cannot test API endpoints (server not running?):', fetchError.message)
      console.log('Make sure to run "npm run dev" first')
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

testSettingsAPI()