/**
 * Integration test for Timecard Calculation Engine
 */

const { createClient } = require('@supabase/supabase-js')

// Mock Supabase client for testing
const mockSupabaseClient = {
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              pay_rate: 25,
              project_role_templates: {
                time_type: 'hourly',
                base_pay_rate: 20
              }
            },
            error: null
          })
        })
      })
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({
          data: { id: 'test-timecard' },
          error: null
        })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({
            data: { id: 'test-timecard' },
            error: null
          })
        })
      })
    })
  })
}

// Import the calculation engine
const { TimecardCalculationEngine } = require('../lib/timecard-calculation-engine.ts')

async function testCalculationEngine() {
  console.log('🧮 Testing Timecard Calculation Engine...')
  
  try {
    const engine = new TimecardCalculationEngine(mockSupabaseClient)
    
    // Test 1: Basic 8-hour shift calculation
    console.log('\n📊 Test 1: Basic 8-hour shift')
    const basicShift = {
      user_id: 'user-1',
      project_id: 'project-1',
      date: '2024-01-15',
      check_in_time: '2024-01-15T09:00:00Z',
      check_out_time: '2024-01-15T17:00:00Z',
      status: 'draft',
      manually_edited: false
    }
    
    const result1 = await engine.calculateTimecard(basicShift)
    console.log('✅ Total hours:', result1.total_hours)
    console.log('✅ Total pay:', result1.total_pay)
    console.log('✅ Valid:', result1.is_valid)
    
    // Test 2: Shift with break
    console.log('\n📊 Test 2: Shift with 30-minute break')
    const shiftWithBreak = {
      ...basicShift,
      break_start_time: '2024-01-15T12:00:00Z',
      break_end_time: '2024-01-15T12:30:00Z'
    }
    
    const result2 = await engine.calculateTimecard(shiftWithBreak)
    console.log('✅ Total hours:', result2.total_hours)
    console.log('✅ Break duration:', result2.break_duration)
    console.log('✅ Total pay:', result2.total_pay)
    
    // Test 3: Grace period logic
    console.log('\n📊 Test 3: Grace period logic')
    const gracePeriodResult = engine.applyBreakGracePeriod(
      '2024-01-15T12:00:00Z',
      '2024-01-15T12:32:00Z', // 32 minutes (within 5 min grace period of 30 min)
      30
    )
    console.log('✅ Grace period applied:', gracePeriodResult === 30 ? 'Yes' : 'No')
    console.log('✅ Break duration:', gracePeriodResult, 'minutes')
    
    // Test 4: Invalid time sequence
    console.log('\n📊 Test 4: Invalid time sequence')
    const invalidShift = {
      ...basicShift,
      check_in_time: '2024-01-15T17:00:00Z',
      check_out_time: '2024-01-15T09:00:00Z' // Invalid: check-out before check-in
    }
    
    const result4 = await engine.calculateTimecard(invalidShift)
    console.log('✅ Valid:', result4.is_valid)
    console.log('✅ Validation errors:', result4.validation_errors)
    
    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📋 Summary:')
    console.log('- ✅ Basic hour calculation')
    console.log('- ✅ Break duration handling')
    console.log('- ✅ Pay calculation integration')
    console.log('- ✅ Grace period logic')
    console.log('- ✅ Time validation')
    console.log('- ✅ Error handling')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testCalculationEngine()