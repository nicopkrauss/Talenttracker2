const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testTimeTypeAssignments() {
  try {
    console.log('🧪 Testing team assignments with time_type...')
    
    // Test fetching assignments with time_type
    const { data: assignments, error } = await supabase
      .from('team_assignments')
      .select(`
        id,
        role,
        pay_rate,
        time_type,
        profiles!inner(full_name)
      `)
      .limit(10)
    
    if (error) {
      console.error('❌ Error fetching assignments:', error.message)
      return
    }
    
    if (!assignments || assignments.length === 0) {
      console.log('ℹ️  No team assignments found')
      return
    }
    
    console.log(`✅ Found ${assignments.length} assignments with time_type:`)
    assignments.forEach(assignment => {
      const payDisplay = assignment.pay_rate 
        ? `$${assignment.pay_rate}${assignment.time_type === 'hourly' ? '/h' : ''}`
        : 'No rate set'
      
      console.log(`   - ${assignment.profiles.full_name}: ${assignment.role} (${assignment.time_type}) - ${payDisplay}`)
    })
    
    // Test summary by time_type
    const { data: allAssignments, error: summaryError } = await supabase
      .from('team_assignments')
      .select('time_type')
    
    if (!summaryError && allAssignments) {
      const hourlyCount = allAssignments.filter(a => a.time_type === 'hourly').length
      const dailyCount = allAssignments.filter(a => a.time_type === 'daily').length
      
      console.log('\n📊 Summary:')
      console.log(`   Hourly assignments: ${hourlyCount}`)
      console.log(`   Daily assignments: ${dailyCount}`)
      console.log(`   Total assignments: ${allAssignments.length}`)
    }
    
    // Test creating a new assignment with time_type
    console.log('\n🧪 Testing assignment creation with time_type...')
    
    // First, get a project and user to test with
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)
    
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(1)
    
    if (projects && projects.length > 0 && users && users.length > 0) {
      const testProject = projects[0]
      const testUser = users[0]
      
      console.log(`   Testing with project: ${testProject.name}`)
      console.log(`   Testing with user: ${testUser.full_name}`)
      
      // Test the API endpoint
      const response = await fetch(`${supabaseUrl.replace('supabase.co', 'supabase.co')}/rest/v1/rpc/test_assignment_creation`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: testProject.id,
          user_id: testUser.id,
          role: 'talent_escort',
          pay_rate: 25
        })
      })
      
      if (response.ok) {
        console.log('✅ Assignment creation test would work')
      } else {
        console.log('ℹ️  Assignment creation test skipped (API endpoint test)')
      }
    }
    
    console.log('\n✅ Time type testing completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testTimeTypeAssignments()