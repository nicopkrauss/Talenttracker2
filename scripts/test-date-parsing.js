#!/usr/bin/env node

/**
 * Test script for date parsing timezone issues
 * 
 * This script tests the date parsing to ensure dates display correctly
 */

console.log('🧪 Testing Date Parsing for Availability Display...\n')

// Test the old way (problematic)
console.log('1. Testing old date parsing method (problematic):')
const testDateStrings = ['2024-12-01', '2024-12-02', '2024-12-03', '2024-12-31', '2025-01-01']

testDateStrings.forEach(dateStr => {
  const oldWay = new Date(dateStr)
  console.log(`   "${dateStr}" -> ${oldWay.getMonth() + 1}/${oldWay.getDate()} (${oldWay.toISOString()})`)
})

console.log('\n2. Testing new date parsing method (fixed):')
testDateStrings.forEach(dateStr => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const newWay = new Date(year, month - 1, day) // month is 0-indexed
  console.log(`   "${dateStr}" -> ${newWay.getMonth() + 1}/${newWay.getDate()} (local date)`)
})

console.log('\n3. Timezone information:')
console.log(`   Current timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
console.log(`   Current timezone offset: ${new Date().getTimezoneOffset()} minutes`)

console.log('\n4. Comparison for a specific date:')
const testDate = '2024-12-01'
const oldMethod = new Date(testDate)
const [year, month, day] = testDate.split('-').map(Number)
const newMethod = new Date(year, month - 1, day)

console.log(`   Date string: "${testDate}"`)
console.log(`   Old method: ${oldMethod.getMonth() + 1}/${oldMethod.getDate()} (UTC interpretation)`)
console.log(`   New method: ${newMethod.getMonth() + 1}/${newMethod.getDate()} (local interpretation)`)
console.log(`   Expected: 12/1`)

if (newMethod.getMonth() + 1 === 12 && newMethod.getDate() === 1) {
  console.log('   ✅ New method produces correct result!')
} else {
  console.log('   ❌ New method still has issues')
}

console.log('\n🎉 Date parsing test completed!')
console.log('\nThe fix ensures that:')
console.log('✅ Date strings like "2024-12-01" display as "12/1" not "11/30"')
console.log('✅ No timezone conversion issues affect the display')
console.log('✅ Dates are parsed as local dates, not UTC dates')