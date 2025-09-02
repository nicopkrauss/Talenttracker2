const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  try {
    console.log('🚀 Adding is_default column to project_role_templates...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '021_add_is_default_to_role_templates.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      return
    }
    
    console.log('✅ Migration completed successfully!')
    
    // Verify the changes
    console.log('🔍 Verifying migration...')
    
    const { data: templates, error: fetchError } = await supabase
      .from('project_role_templates')
      .select('id, project_id, role, display_name, is_default')
      .limit(5)
    
    if (fetchError) {
      console.error('❌ Verification failed:', fetchError)
      return
    }
    
    console.log('📊 Sample templates with is_default column:')
    console.table(templates)
    
    // Check for default templates
    const { data: defaults, error: defaultsError } = await supabase
      .from('project_role_templates')
      .select('project_id, role, display_name')
      .eq('is_default', true)
    
    if (defaultsError) {
      console.error('❌ Could not fetch default templates:', defaultsError)
      return
    }
    
    console.log(`✅ Found ${defaults.length} default templates:`)
    console.table(defaults)
    
  } catch (error) {
    console.error('❌ Script failed:', error)
  }
}

// Run the migration
runMigration()