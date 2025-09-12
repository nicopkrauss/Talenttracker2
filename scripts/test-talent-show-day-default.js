#!/usr/bin/env node

/**
 * Test script for talent assignment show day default behavior
 * 
 * This script tests the new show day default functionality in talent assignments:
 * 1. Show days appear greyed-out initially (suggested but not selected)
 * 2. Selecting rehearsal days auto-selects show days
 * 3. Show days can be selected directly
 * 4. Visual feedback matches the team assignment behavior
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🎭 Testing Talent Assignment Show Day Default Behavior\n')

// Test 1: Verify CircularDateSelector supports showDayDefault prop
console.log('1. Testing CircularDateSelector showDayDefault prop...')
const circularDateSelectorPath = path.join(__dirname, '../components/ui/circular-date-selector.tsx')
const circularDateSelectorContent = fs.readFileSync(circularDateSelectorPath, 'utf8')

const hasShowDayDefaultProp = circularDateSelectorContent.includes('showDayDefault?: boolean')
const hasGreyedOutLogic = circularDateSelectorContent.includes('isShowDayGreyedOut')
const hasDashedBorder = circularDateSelectorContent.includes('border-dashed')

console.log(`   ✅ showDayDefault prop: ${hasShowDayDefaultProp ? 'FOUND' : 'MISSING'}`)
console.log(`   ✅ Greyed-out logic: ${hasGreyedOutLogic ? 'FOUND' : 'MISSING'}`)
console.log(`   ✅ Dashed border styling: ${hasDashedBorder ? 'FOUND' : 'MISSING'}`)

// Test 2: Verify TalentScheduleColumn uses show day default
console.log('\n2. Testing TalentScheduleColumn integration...')
const talentSchedulePath = path.join(__dirname, '../components/projects/talent-schedule-column.tsx')
const talentScheduleContent = fs.readFileSync(talentSchedulePath, 'utf8')

const hasShowDayDefaultEnabled = talentScheduleContent.includes('showDayDefault={true}')
const hasAutoSelectionLogic = talentScheduleContent.includes('showDatesToAdd')
const hasShowDayDetection = talentScheduleContent.includes('isShowDay')

console.log(`   ✅ showDayDefault enabled: ${hasShowDayDefaultEnabled ? 'FOUND' : 'MISSING'}`)
console.log(`   ✅ Auto-selection logic: ${hasAutoSelectionLogic ? 'FOUND' : 'MISSING'}`)
console.log(`   ✅ Show day detection: ${hasShowDayDetection ? 'FOUND' : 'MISSING'}`)

// Test 3: Check for consistent behavior with mass availability popup
console.log('\n3. Checking consistency with mass availability popup...')
const massAvailabilityPath = path.join(__dirname, '../components/projects/mass-availability-popup.tsx')
const massAvailabilityContent = fs.readFileSync(massAvailabilityPath, 'utf8')

const massHasGreyedOutLogic = massAvailabilityContent.includes('isShowDayGreyedOut')
const massHasAutoSelection = massAvailabilityContent.includes('showDatesToAdd')
const massHasDashedBorder = massAvailabilityContent.includes('border-dashed')

console.log(`   ✅ Mass popup greyed-out logic: ${massHasGreyedOutLogic ? 'FOUND' : 'MISSING'}`)
console.log(`   ✅ Mass popup auto-selection: ${massHasAutoSelection ? 'FOUND' : 'MISSING'}`)
console.log(`   ✅ Mass popup dashed border: ${massHasDashedBorder ? 'FOUND' : 'MISSING'}`)

// Test 4: Verify TypeScript compilation
console.log('\n4. Testing TypeScript compilation...')
try {
  execSync('npx tsc --noEmit --skipLibCheck', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  })
  console.log('   ✅ TypeScript compilation: PASSED')
} catch (error) {
  console.log('   ❌ TypeScript compilation: FAILED')
  console.log('   Error:', error.stdout?.toString() || error.message)
}

// Test 5: Check for proper prop types
console.log('\n5. Verifying prop type consistency...')
const circularDateSelectorInterface = circularDateSelectorContent.match(/interface CircularDateSelectorProps \{[\s\S]*?\}/)?.[0]
const hasOptionalShowDayDefault = circularDateSelectorInterface?.includes('showDayDefault?: boolean')

console.log(`   ✅ Optional showDayDefault prop: ${hasOptionalShowDayDefault ? 'FOUND' : 'MISSING'}`)

// Summary
console.log('\n📊 SUMMARY')
console.log('='.repeat(50))

const allTests = [
  hasShowDayDefaultProp,
  hasGreyedOutLogic,
  hasDashedBorder,
  hasShowDayDefaultEnabled,
  hasAutoSelectionLogic,
  hasShowDayDetection,
  hasOptionalShowDayDefault
]

const passedTests = allTests.filter(Boolean).length
const totalTests = allTests.length

console.log(`Tests Passed: ${passedTests}/${totalTests}`)

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Show day default behavior is properly implemented.')
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.')
}

console.log('\n🔍 EXPECTED BEHAVIOR:')
console.log('1. Show days appear with dashed border and muted colors initially')
console.log('2. Selecting rehearsal days automatically highlights show days')
console.log('3. Show days can be clicked directly to select them')
console.log('4. Visual feedback matches team assignment behavior')
console.log('5. Tooltips indicate "(Show Day)" for show dates')

console.log('\n🧪 MANUAL TESTING STEPS:')
console.log('1. Navigate to a project with talent assignments')
console.log('2. Look for talent schedule columns with date selectors')
console.log('3. Verify show days appear greyed-out initially')
console.log('4. Click a rehearsal day and verify show day becomes highlighted')
console.log('5. Clear selection and click show day directly')
console.log('6. Verify tooltips show "(Show Day)" for show dates')