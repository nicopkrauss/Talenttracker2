const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to generate random time within a range
function randomTime(startHour, endHour) {
  const hour = Math.floor(Math.random() * (endHour - startHour)) + startHour
  const minute = Math.floor(Math.random() * 60)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
}

// Helper function to calculate hours between two times
function calculateHours(startTime, endTime) {
  const start = new Date(`2024-01-01T${startTime}`)
  const end = new Date(`2024-01-01T${endTime}`)
  return (end - start) / (1000 * 60 * 60)
}

// Helper function to generate dates for the past week
function getRecentDates(count = 7) {
  const dates = []
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

async function createFakeTimecards() {
  try {
    console.log('🔍 Fetching staff members and projects...')
    
    // Get talent escort staff members
    const { data: staff, error: staffError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['talent_escort', 'supervisor', 'coordinator'])
      .limit(10)

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return
    }

    // Get active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .limit(3)

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      return
    }

    if (!staff || staff.length === 0) {
      console.log('❌ No staff members found. Creating some first...')
      return
    }

    if (!projects || projects.length === 0) {
      console.log('❌ No active projects found. Creating some first...')
      return
    }

    console.log(`✅ Found ${staff.length} staff members and ${projects.length} projects`)
    
    // Clear existing timecards to start fresh
    console.log('🧹 Clearing existing timecards...')
    const { error: deleteError } = await supabase
      .from('timecards')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (deleteError) {
      console.log('Note: Could not clear existing timecards:', deleteError.message)
    }

    const dates = getRecentDates(7)
    const timecards = []
    let timecardCount = 0

    // Create timecards for each staff member
    for (const staffMember of staff) {
      const project = projects[Math.floor(Math.random() * projects.length)]
      
      // Create 3-5 timecards per staff member over the past week
      const numTimecards = Math.floor(Math.random() * 3) + 3
      
      for (let i = 0; i < numTimecards; i++) {
        const date = dates[Math.floor(Math.random() * dates.length)]
        
        // Generate realistic work times
        const checkInTime = randomTime(8, 10) // 8-10 AM
        const checkOutTime = randomTime(16, 19) // 4-7 PM
        const breakStartTime = randomTime(12, 14) // 12-2 PM
        const breakEndTime = (() => {
          const [hour, minute] = breakStartTime.split(':').map(Number)
          const breakDuration = Math.random() > 0.5 ? 30 : 60 // 30 or 60 minutes
          const endMinute = minute + breakDuration
          const endHour = hour + Math.floor(endMinute / 60)
          return `${endHour.toString().padStart(2, '0')}:${(endMinute % 60).toString().padStart(2, '0')}:00`
        })()
        
        const totalHours = calculateHours(checkInTime, checkOutTime) - calculateHours(breakStartTime, breakEndTime)
        const breakDuration = calculateHours(breakStartTime, breakEndTime) * 60 // in minutes
        
        // Pay rates based on role
        const payRate = staffMember.role === 'talent_escort' ? 25.00 : 
                       staffMember.role === 'supervisor' ? 35.00 : 30.00
        const totalPay = totalHours * payRate
        
        // Determine status and flags
        let status, manuallyEdited, submittedAt, approvedAt, approvedBy, supervisorComments
        
        const rand = Math.random()
        if (rand < 0.3) {
          // 30% - Draft (not submitted)
          status = 'draft'
          manuallyEdited = false
        } else if (rand < 0.6) {
          // 30% - Submitted (pending approval)
          status = 'submitted'
          manuallyEdited = Math.random() < 0.3 // 30% of submitted have manual edits
          submittedAt = new Date(date + 'T18:00:00Z').toISOString()
          if (manuallyEdited) {
            supervisorComments = 'Hours adjusted based on security footage review'
          }
        } else if (rand < 0.85) {
          // 25% - Approved
          status = 'approved'
          manuallyEdited = Math.random() < 0.2 // 20% of approved had manual edits
          submittedAt = new Date(date + 'T18:00:00Z').toISOString()
          approvedAt = new Date(Date.parse(submittedAt) + 24 * 60 * 60 * 1000).toISOString() // Next day
          approvedBy = staff[0].id // First staff member as approver
          if (manuallyEdited) {
            supervisorComments = 'Approved with minor time adjustments'
          }
        } else {
          // 15% - Rejected
          status = 'rejected'
          manuallyEdited = false
          submittedAt = new Date(date + 'T18:00:00Z').toISOString()
          supervisorComments = 'Please verify break times and resubmit'
        }

        const timecard = {
          user_id: staffMember.id,
          project_id: project.id,
          date,
          check_in_time: `${date}T${checkInTime}`,
          check_out_time: `${date}T${checkOutTime}`,
          break_start_time: `${date}T${breakStartTime}`,
          break_end_time: `${date}T${breakEndTime}`,
          total_hours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
          break_duration: Math.round(breakDuration),
          pay_rate: payRate,
          total_pay: Math.round(totalPay * 100) / 100, // Round to 2 decimals
          status,
          manually_edited: manuallyEdited,
          edit_comments: supervisorComments,
          submitted_at: submittedAt,
          approved_at: approvedAt,
          approved_by: approvedBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        timecards.push(timecard)
        timecardCount++
      }
    }

    console.log(`📝 Creating ${timecards.length} fake timecards...`)

    // Insert timecards in batches
    const batchSize = 10
    for (let i = 0; i < timecards.length; i += batchSize) {
      const batch = timecards.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('timecards')
        .insert(batch)

      if (insertError) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError)
      } else {
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} timecards)`)
      }
    }

    // Summary
    console.log('\n📊 Timecard Summary:')
    const statusCounts = timecards.reduce((acc, tc) => {
      acc[tc.status] = (acc[tc.status] || 0) + 1
      return acc
    }, {})

    const manuallyEditedCount = timecards.filter(tc => tc.manually_edited).length

    console.log(`   📋 Total timecards: ${timecards.length}`)
    console.log(`   📝 Draft: ${statusCounts.draft || 0}`)
    console.log(`   ⏳ Submitted (pending): ${statusCounts.submitted || 0}`)
    console.log(`   ✅ Approved: ${statusCounts.approved || 0}`)
    console.log(`   ❌ Rejected: ${statusCounts.rejected || 0}`)
    console.log(`   ✏️  Manually edited: ${manuallyEditedCount}`)

    console.log('\n🎉 Fake timecards created successfully!')
    console.log('💡 You can now test the approval interface at /timecards')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
createFakeTimecards()