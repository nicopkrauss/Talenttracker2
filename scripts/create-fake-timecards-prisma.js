const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

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
    
    // Get talent escort staff members using raw SQL since Prisma might not have the exact schema
    const staff = await prisma.$queryRaw`
      SELECT id, full_name, role 
      FROM profiles 
      WHERE role IN ('talent_escort', 'supervisor', 'coordinator')
      AND status = 'active'
      LIMIT 8
    `

    // Get active projects
    const projects = await prisma.$queryRaw`
      SELECT id, name 
      FROM projects 
      WHERE status = 'active' 
      LIMIT 3
    `

    if (!staff || staff.length === 0) {
      console.log('❌ No staff members found. Please create some staff members first.')
      return
    }

    if (!projects || projects.length === 0) {
      console.log('❌ No active projects found. Please create some projects first.')
      return
    }

    console.log(`✅ Found ${staff.length} staff members and ${projects.length} projects`)
    
    // Clear existing timecards to start fresh
    console.log('🧹 Clearing existing timecards...')
    await prisma.$queryRaw`DELETE FROM timecards`

    const dates = getRecentDates(7)
    const timecards = []

    // Create timecards for each staff member
    for (const staffMember of staff) {
      const project = projects[Math.floor(Math.random() * projects.length)]
      
      // Create 2-4 timecards per staff member over the past week
      const numTimecards = Math.floor(Math.random() * 3) + 2
      
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
          submittedAt = new Date(date + 'T18:00:00Z')
          if (manuallyEdited) {
            supervisorComments = 'Hours adjusted based on security footage review'
          }
        } else if (rand < 0.85) {
          // 25% - Approved
          status = 'approved'
          manuallyEdited = Math.random() < 0.2 // 20% of approved had manual edits
          submittedAt = new Date(date + 'T18:00:00Z')
          approvedAt = new Date(Date.parse(submittedAt) + 24 * 60 * 60 * 1000) // Next day
          approvedBy = staff[0].id // First staff member as approver
          if (manuallyEdited) {
            supervisorComments = 'Approved with minor time adjustments'
          }
        } else {
          // 15% - Rejected
          status = 'rejected'
          manuallyEdited = false
          submittedAt = new Date(date + 'T18:00:00Z')
          supervisorComments = 'Please verify break times and resubmit'
        }

        timecards.push({
          user_id: staffMember.id,
          project_id: project.id,
          date: new Date(date),
          check_in_time: new Date(`${date}T${checkInTime}`),
          check_out_time: new Date(`${date}T${checkOutTime}`),
          break_start_time: new Date(`${date}T${breakStartTime}`),
          break_end_time: new Date(`${date}T${breakEndTime}`),
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
          created_at: new Date(),
          updated_at: new Date()
        })
      }
    }

    console.log(`📝 Creating ${timecards.length} fake timecards...`)

    // Insert timecards using raw SQL to avoid Prisma schema issues
    for (const timecard of timecards) {
      await prisma.$queryRaw`
        INSERT INTO timecards (
          user_id, project_id, date, check_in_time, check_out_time,
          break_start_time, break_end_time, total_hours, break_duration,
          pay_rate, total_pay, status, manually_edited, edit_comments,
          submitted_at, approved_at, approved_by, created_at, updated_at
        ) VALUES (
          ${timecard.user_id}, ${timecard.project_id}, ${timecard.date}, 
          ${timecard.check_in_time}, ${timecard.check_out_time},
          ${timecard.break_start_time}, ${timecard.break_end_time}, 
          ${timecard.total_hours}, ${timecard.break_duration},
          ${timecard.pay_rate}, ${timecard.total_pay}, ${timecard.status}, 
          ${timecard.manually_edited}, ${timecard.edit_comments},
          ${timecard.submitted_at}, ${timecard.approved_at}, ${timecard.approved_by},
          ${timecard.created_at}, ${timecard.updated_at}
        )
      `
    }

    // Get summary
    const summary = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE manually_edited) as manually_edited_count
      FROM timecards 
      GROUP BY status
      ORDER BY 
        CASE status 
          WHEN 'draft' THEN 1
          WHEN 'submitted' THEN 2  
          WHEN 'approved' THEN 3
          WHEN 'rejected' THEN 4
        END
    `

    console.log('\n📊 Timecard Summary:')
    console.log(`   📋 Total timecards: ${timecards.length}`)
    
    summary.forEach(row => {
      const statusEmoji = {
        'draft': '📝',
        'submitted': '⏳',
        'approved': '✅',
        'rejected': '❌'
      }[row.status] || '❓'
      
      console.log(`   ${statusEmoji} ${row.status}: ${row.count} (${row.manually_edited_count} manually edited)`)
    })

    console.log('\n🎉 Fake timecards created successfully!')
    console.log('💡 You can now test the approval interface at /timecards')
    console.log('🔍 Check the "Approvals" tab to see submitted timecards')
    console.log('✏️  Some timecards have manual edit flags for testing')

  } catch (error) {
    console.error('❌ Error creating fake timecards:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createFakeTimecards()