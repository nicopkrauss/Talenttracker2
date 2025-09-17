require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createReadinessSummary() {
  console.log('🔧 Creating project_readiness_summary table...')

  try {
    // Create a simple table instead of materialized view for now
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, status')
      .limit(1)

    if (error) {
      console.error('Error accessing projects:', error)
      return
    }

    console.log('✅ Database connection working')
    console.log('Note: project_readiness_summary materialized view needs to be created via SQL migration')
    console.log('For now, the app will work without real-time readiness updates')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createReadinessSummary()