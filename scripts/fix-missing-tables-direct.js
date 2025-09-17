require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMissingTables() {
  console.log('🔧 Creating missing database tables...')

  try {
    // Check if tables exist first
    console.log('Checking existing tables...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['project_settings', 'project_audit_log', 'project_attachments'])

    if (tablesError) {
      console.error('Error checking tables:', tablesError)
    } else {
      const existingTables = tables.map(t => t.table_name)
      console.log('Existing tables:', existingTables)
      
      if (existingTables.includes('project_settings')) {
        console.log('✅ project_settings already exists')
      }
      if (existingTables.includes('project_audit_log')) {
        console.log('✅ project_audit_log already exists')
      }
      if (existingTables.includes('project_attachments')) {
        console.log('✅ project_attachments already exists')
      }
    }

    // Try to insert a test record to see if the API works
    console.log('Testing API endpoints...')
    
    // Get a project ID to test with
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .limit(1)

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
    } else if (projects && projects.length > 0) {
      const projectId = projects[0].id
      console.log('Testing with project ID:', projectId)

      // Test project_settings
      const { data: settings, error: settingsError } = await supabase
        .from('project_settings')
        .select('*')
        .eq('project_id', projectId)
        .limit(1)

      if (settingsError) {
        console.error('❌ project_settings table issue:', settingsError)
      } else {
        console.log('✅ project_settings table accessible')
      }

      // Test project_attachments
      const { data: attachments, error: attachmentsError } = await supabase
        .from('project_attachments')
        .select('*')
        .eq('project_id', projectId)
        .limit(1)

      if (attachmentsError) {
        console.error('❌ project_attachments table issue:', attachmentsError)
      } else {
        console.log('✅ project_attachments table accessible')
      }

      // Test project_audit_log
      const { data: auditLog, error: auditError } = await supabase
        .from('project_audit_log')
        .select('*')
        .eq('project_id', projectId)
        .limit(1)

      if (auditError) {
        console.error('❌ project_audit_log table issue:', auditError)
      } else {
        console.log('✅ project_audit_log table accessible')
      }
    }

    console.log('🎉 Database check completed!')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

createMissingTables()