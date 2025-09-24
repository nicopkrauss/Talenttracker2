const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addTimeTypeToAssignments() {
  try {
    console.log('🚀 Adding time_type column to team_assignments...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/043_add_time_type_to_team_assignments.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute the migration using direct SQL
    console.log('Adding time_type column...')
    
    // Add the column
    const { error: addColumnError } = await supabase
      .from('team_assignments')
      .select('*')
      .limit(0) // Just to test if we can access the table
    
    if (addColumnError) {
      console.error('❌ Cannot access team_assignments table:', addColumnError.message)
      throw addColumnError
    }
    
    // Since we can't execute DDL directly, let's create a simpler approach
    // We'll use the REST API to check current assignments and suggest manual steps
    console.log('⚠️  Direct DDL execution not available via Supabase client.')
    console.log('📝 Please run the following SQL manually in your Supabase SQL editor:')
    console.log('\n' + migrationSQL)
    
    return
    
    console.log('✅ Migration completed successfully!')
    
    // Verify the changes
    console.log('\n📊 Verifying team assignments with time_type...')
    const { data: assignments, error: fetchError } = await supabase
      .from('team_assignments')
      .select('id, role, time_type, pay_rate')
      .limit(10)
    
    if (fetchError) {
      console.error('❌ Error fetching assignments:', fetchError.message)
      return
    }
    
    console.log(`✅ Found ${assignments.length} assignments with time_type:`)
    assignments.forEach(assignment => {
      console.log(`   - ${assignment.role}: ${assignment.time_type} ($${assignment.pay_rate || 'N/A'})`)
    })
    
    // Show summary by time_type
    const { data: summary, error: summaryError } = await supabase
      .from('team_assignments')
      .select('time_type')
    
    if (!summaryError && summary) {
      const hourlyCount = summary.filter(a => a.time_type === 'hourly').length
      const dailyCount = summary.filter(a => a.time_type === 'daily').length
      
      console.log('\n📈 Summary:')
      console.log(`   Hourly assignments: ${hourlyCount}`)
      console.log(`   Daily assignments: ${dailyCount}`)
      console.log(`   Total assignments: ${summary.length}`)
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

addTimeTypeToAssignments()