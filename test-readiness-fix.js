// Test script to verify the readiness API fixes
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testReadinessAPI() {
  try {
    console.log('Testing readiness API fixes...')
    
    // First, let's check if the project_readiness table exists
    const { data: tables, error: tablesError } = await supabase
      .from('project_readiness')
      .select('project_id')
      .limit(1)
    
    if (tablesError) {
      console.error('Error checking project_readiness table:', tablesError)
      return
    }
    
    console.log('✅ project_readiness table exists')
    
    // Get a sample project ID
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
    
    if (projectsError || !projects || projects.length === 0) {
      console.error('No projects found or error:', projectsError)
      return
    }
    
    const projectId = projects[0].id
    console.log(`Using project ID: ${projectId}`)
    
    // Test the readiness API endpoint
    const response = await fetch(`http://localhost:3000/api/projects/${projectId}/readiness`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Readiness API working!')
      console.log('Response data keys:', Object.keys(data.data || {}))
    } else {
      const errorData = await response.text()
      console.error('❌ Readiness API failed:', response.status, errorData)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  testReadinessAPI()
}

module.exports = { testReadinessAPI }