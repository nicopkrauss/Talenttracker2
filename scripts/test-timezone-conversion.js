#!/usr/bin/env node

/**
 * Test script for timezone conversion utilities
 */

// Simulate the timezone utility functions for testing
function utcToDatetimeLocal(utcTimestamp) {
  if (!utcTimestamp) return ''
  
  try {
    const date = new Date(utcTimestamp)
    if (isNaN(date.getTime())) return ''
    
    const timezoneOffset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - (timezoneOffset * 60 * 1000))
    
    return localDate.toISOString().slice(0, 16)
  } catch (error) {
    console.error('Error converting UTC to datetime-local:', error)
    return ''
  }
}

function datetimeLocalToUtc(datetimeLocal) {
  if (!datetimeLocal) return ''
  
  try {
    const localDate = new Date(datetimeLocal)
    if (isNaN(localDate.getTime())) return ''
    
    return localDate.toISOString()
  } catch (error) {
    console.error('Error converting datetime-local to UTC:', error)
    return ''
  }
}

function testTimezoneConversion() {
  console.log('🧪 Testing timezone conversion utilities...\n')

  // Test case 1: UTC timestamp to datetime-local
  const utcTimestamp = '2024-01-15T14:30:00.000Z' // 2:30 PM UTC
  console.log('Test 1: UTC to datetime-local conversion')
  console.log(`Input UTC timestamp: ${utcTimestamp}`)
  
  const datetimeLocal = utcToDatetimeLocal(utcTimestamp)
  console.log(`Output datetime-local: ${datetimeLocal}`)
  
  // Show what this looks like in the user's timezone
  const displayDate = new Date(utcTimestamp)
  console.log(`Display in user timezone: ${displayDate.toLocaleString()}`)
  console.log()

  // Test case 2: datetime-local to UTC
  console.log('Test 2: datetime-local to UTC conversion')
  console.log(`Input datetime-local: ${datetimeLocal}`)
  
  const backToUtc = datetimeLocalToUtc(datetimeLocal)
  console.log(`Output UTC timestamp: ${backToUtc}`)
  console.log(`Original UTC timestamp: ${utcTimestamp}`)
  console.log(`Round-trip successful: ${backToUtc === utcTimestamp}`)
  console.log()

  // Test case 3: Current time
  console.log('Test 3: Current time conversion')
  const now = new Date()
  const nowUtc = now.toISOString()
  console.log(`Current UTC time: ${nowUtc}`)
  
  const nowLocal = utcToDatetimeLocal(nowUtc)
  console.log(`As datetime-local: ${nowLocal}`)
  
  const backToUtcNow = datetimeLocalToUtc(nowLocal)
  console.log(`Back to UTC: ${backToUtcNow}`)
  console.log(`Round-trip successful: ${Math.abs(new Date(backToUtcNow).getTime() - new Date(nowUtc).getTime()) < 1000}`)
  console.log()

  // Test case 4: Edge cases
  console.log('Test 4: Edge cases')
  console.log(`Empty string: "${utcToDatetimeLocal('')}" (should be empty)`)
  console.log(`Null value: "${utcToDatetimeLocal(null)}" (should be empty)`)
  console.log(`Invalid date: "${utcToDatetimeLocal('invalid')}" (should handle gracefully)`)
  console.log()

  // Test case 5: Different timezones (simulated)
  console.log('Test 5: Timezone offset demonstration')
  const testDate = new Date('2024-01-15T14:30:00.000Z')
  console.log(`UTC time: ${testDate.toISOString()}`)
  console.log(`Local time: ${testDate.toLocaleString()}`)
  console.log(`Timezone offset: ${testDate.getTimezoneOffset()} minutes`)
  
  const offsetHours = testDate.getTimezoneOffset() / 60
  console.log(`Timezone offset: ${offsetHours > 0 ? '-' : '+'}${Math.abs(offsetHours)} hours`)
  console.log()

  console.log('✅ Timezone conversion tests completed!')
}

// Run the test
testTimezoneConversion()