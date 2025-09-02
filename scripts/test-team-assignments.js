const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTeamAssignments() {
  try {
    console.log('Testing team assignments functionality...')

    // Get a test project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)

    if (projectError) {
      console.error('Error fetching projects:', projectError)
      return
    }

    if (!projects || projects.length === 0) {
      console.log('No projects found')
      return
    }

    const project = projects[0]
    console.log(`Using project: ${project.name} (${project.id})`)

    // Test getting team assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('team_assignments')
      .select(`
        id,
        user_id,
        role,
        pay_rate,
        schedule_notes,
        created_at,
        profiles!inner(
          id,
          full_name,
          email,
          phone,
          city,
          state
        )
      `)
      .eq('project_id', project.id)

    if (assignmentsError) {
      console.error('Error fetching team assignments:', assignmentsError)
      return
    }

    console.log(`Found ${assignments?.length || 0} team assignments`)
    if (assignments && assignments.length > 0) {
      console.log('Sample assignment:', JSON.stringify(assignments[0], null, 2))
    }

    // Test getting available staff
    const { data: availableStaff, error: staffError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
        city,
        state,
        role,
        status,
        created_at
      `)
      .eq('status', 'active')
      .limit(5)

    if (staffError) {
      console.error('Error fetching available staff:', staffError)
      return
    }

    console.log(`Found ${availableStaff?.length || 0} available staff members`)
    if (availableStaff && availableStaff.length > 0) {
      console.log('Sample staff member:', JSON.stringify(availableStaff[0], null, 2))
    }

    console.log('✅ Team assignments test completed successfully!')

  } catch (error) {
    console.error('Test failed:', error)
  }
}

testTeamAssignments()