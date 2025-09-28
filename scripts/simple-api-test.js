#!/usr/bin/env node

/**
 * Simple API test to check if desktop rejection format works
 */

async function testAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/timecards/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timecardId: "fd82ef67-3cf4-498b-9cc8-0a12e6979d22",
        updates: {
          check_in_time_day_0: "09:30:00",
          break_start_time_day_0: "12:30:00",
          status: "rejected"
        },
        editComment: "Desktop format test"
      })
    })

    const data = await response.json()
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testAPI()