import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAvailableStaff() {
  try {
    console.log('Testing available staff functionality...')

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

    // Test the same logic as the API route
    // Get all active staff members
    const { data: availableStaff, error } = await supabase
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
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Error fetching available staff:', error)
      return
    }

    // Get existing team assignments for this project
    const { data: existingAssignments } = await supabase
      .from('team_assignments')
      .select('user_id')
      .eq('project_id', project.id)

    // Filter out staff who are already assigned
    const assignedUserIds = new Set(existingAssignments?.map(a => a.user_id) || [])
    const filteredStaff = (availableStaff || []).filter(staff => 
      !assignedUserIds.has(staff.id)
    )

    // Filter staff to only include those who can be assigned to projects
    const eligibleStaff = filteredStaff.filter(staff => 
      staff.status === 'active' && 
      (staff.role === null || ['admin', 'in_house'].includes(staff.role))
    )

    console.log(`Found ${eligibleStaff.length} eligible staff members`)
    console.log(`Total active staff: ${availableStaff?.length || 0}`)
    console.log(`Already assigned: ${assignedUserIds.size}`)
    
    if (eligibleStaff.length > 0) {
      console.log('Sample eligible staff member:', JSON.stringify(eligibleStaff[0], null, 2))
    }

    console.log('✅ Available staff test completed successfully!')

  } catch (error) {
    console.error('Test failed:', error)
  }
}

testAvailableStaff()