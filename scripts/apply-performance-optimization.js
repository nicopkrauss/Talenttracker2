const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyPerformanceOptimization() {
  try {
    console.log('🚀 Applying performance optimization for project readiness...')

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '032_optimize_readiness_performance.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📝 Executing ${statements.length} SQL statements...`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        })

        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error)
          throw error
        }
      }
    }

    console.log('✅ Performance optimization applied successfully!')
    
    // Test the optimized function
    console.log('🧪 Testing optimized readiness calculation...')
    
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .limit(1)

    if (projects && projects.length > 0) {
      const projectId = projects[0].id
      
      const { error: testError } = await supabase.rpc('calculate_project_readiness', {
        p_project_id: projectId
      })

      if (testError) {
        console.warn('⚠️ Warning: Test of optimized function failed:', testError)
      } else {
        console.log('✅ Optimized readiness calculation working correctly!')
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyPerformanceOptimization()