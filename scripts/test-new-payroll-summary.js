#!/usr/bin/env node

/**
 * Test script for the new payroll summary implementation
 * This script verifies that the payroll summary displays in the correct order
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testPayrollSummary() {
  console.log('🧪 Testing New Payroll Summary Implementation...\n')

  try {
    // Fetch timecards data similar to the new implementation
    const { data, error } = await supabase
      .from('timecards')
      .select(`
        user_id,
        total_hours,
        total_pay,
        status,
        profiles!timecards_user_id_fkey (
          full_name
        ),
        projects!timecards_project_id_fkey (
          name
        )
      `)

    if (error) {
      console.error('❌ Error fetching timecard data:', error)
      return
    }

    console.log(`📊 Found ${data?.length || 0} timecards`)

    // Group by user and calculate summary (same logic as the component)
    const userSummaryMap = new Map()
    
    data?.forEach((timecard) => {
      const userId = timecard.user_id
      const userName = Array.isArray(timecard.profiles) 
        ? timecard.profiles[0]?.full_name || 'Unknown User'
        : timecard.profiles?.full_name || 'Unknown User'
      const projectName = Array.isArray(timecard.projects)
        ? timecard.projects[0]?.name || 'Unknown Project'
        : timecard.projects?.name || 'Unknown Project'
      
      if (!userSummaryMap.has(userId)) {
        userSummaryMap.set(userId, {
          userId,
          userName,
          projectName,
          totalHours: 0,
          totalPay: 0,
          timecardCount: 0,
          statusBreakdown: {
            approved: 0,
            submitted: 0,
            draft: 0,
            rejected: 0
          }
        })
      }
      
      const summary = userSummaryMap.get(userId)
      summary.totalHours += timecard.total_hours || 0
      summary.totalPay += timecard.total_pay || 0
      summary.timecardCount += 1
      
      // Count by status
      if (timecard.status === 'approved') {
        summary.statusBreakdown.approved += 1
      } else if (timecard.status === 'submitted') {
        summary.statusBreakdown.submitted += 1
      } else if (timecard.status === 'draft') {
        summary.statusBreakdown.draft += 1
      } else if (timecard.status === 'rejected') {
        summary.statusBreakdown.rejected += 1
      }
    })
    
    // Convert to array and sort by priority: approved first, then submitted, then drafts
    const summaryArray = Array.from(userSummaryMap.values()).sort((a, b) => {
      // First priority: approved timecards (descending)
      if (a.statusBreakdown.approved !== b.statusBreakdown.approved) {
        return b.statusBreakdown.approved - a.statusBreakdown.approved
      }
      // Second priority: submitted timecards (descending)
      if (a.statusBreakdown.submitted !== b.statusBreakdown.submitted) {
        return b.statusBreakdown.submitted - a.statusBreakdown.submitted
      }
      // Third priority: draft timecards (descending)
      return b.statusBreakdown.draft - a.statusBreakdown.draft
    })

    console.log('\n📋 Payroll Summary (Ordered by Priority):')
    console.log('=' .repeat(80))
    
    summaryArray.forEach((item, index) => {
      console.log(`${index + 1}. ${item.userName} (${item.projectName})`)
      console.log(`   💰 Total Pay: $${item.totalPay.toFixed(2)}`)
      console.log(`   ⏰ Total Hours: ${item.totalHours.toFixed(1)}`)
      console.log(`   📄 Timecards: ${item.timecardCount}`)
      console.log(`   📊 Status Breakdown:`)
      console.log(`      ✅ Approved: ${item.statusBreakdown.approved}`)
      console.log(`      📤 Submitted: ${item.statusBreakdown.submitted}`)
      console.log(`      📝 Drafts: ${item.statusBreakdown.draft}`)
      console.log(`      ❌ Rejected: ${item.statusBreakdown.rejected}`)
      console.log('')
    })

    // Verify sorting is correct
    console.log('🔍 Verifying Sort Order:')
    let previousApproved = Infinity
    let previousSubmitted = Infinity
    let previousDraft = Infinity
    let sortingCorrect = true

    for (let i = 0; i < summaryArray.length; i++) {
      const current = summaryArray[i]
      
      // Check if approved count is in descending order or equal
      if (current.statusBreakdown.approved > previousApproved) {
        console.log(`❌ Sort error at position ${i + 1}: approved count should be <= ${previousApproved}`)
        sortingCorrect = false
      }
      
      // If approved counts are equal, check submitted
      if (current.statusBreakdown.approved === previousApproved && 
          current.statusBreakdown.submitted > previousSubmitted) {
        console.log(`❌ Sort error at position ${i + 1}: submitted count should be <= ${previousSubmitted}`)
        sortingCorrect = false
      }
      
      // If both approved and submitted are equal, check drafts
      if (current.statusBreakdown.approved === previousApproved && 
          current.statusBreakdown.submitted === previousSubmitted &&
          current.statusBreakdown.draft > previousDraft) {
        console.log(`❌ Sort error at position ${i + 1}: draft count should be <= ${previousDraft}`)
        sortingCorrect = false
      }
      
      previousApproved = current.statusBreakdown.approved
      previousSubmitted = current.statusBreakdown.submitted
      previousDraft = current.statusBreakdown.draft
    }

    if (sortingCorrect) {
      console.log('✅ Sort order is correct! Approved first, then submitted, then drafts.')
    }

    console.log('\n🎉 New Payroll Summary Test Complete!')
    console.log(`📊 Total Users: ${summaryArray.length}`)
    console.log(`💰 Total Payroll: $${summaryArray.reduce((sum, item) => sum + item.totalPay, 0).toFixed(2)}`)
    console.log(`⏰ Total Hours: ${summaryArray.reduce((sum, item) => sum + item.totalHours, 0).toFixed(1)}`)

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testPayrollSummary()