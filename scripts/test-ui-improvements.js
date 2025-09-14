#!/usr/bin/env node

/**
 * Test script to verify UI improvements in the assignments tab
 * 
 * Changes made:
 * 1. Removed "x talent scheduled" text from day section header
 * 2. Reduced empty space after progress row (pt-4 -> pt-2)
 * 3. Increased progress bar width by 1.5x (w-64 -> w-96)
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Testing UI improvements in assignments interface...\n')

// Test 1: Verify talent count text removal
console.log('1. Testing talent count text removal...')
const assignmentListPath = path.join(__dirname, '../components/projects/assignment-list.tsx')
const assignmentListContent = fs.readFileSync(assignmentListPath, 'utf8')

// Check specifically for the count text that was removed (not the empty state message)
const hasTalentCountText = assignmentListContent.includes('{scheduledTalent.length === 1 ? \'talent\' : \'talent\'} scheduled')
if (hasTalentCountText) {
  console.log('❌ FAIL: Talent count text still found in AssignmentList component')
  process.exit(1)
} else {
  console.log('✅ PASS: Talent count text successfully removed from day section header')
}

// Test 2: Verify Clear Day button still exists
const hasClearDayButton = assignmentListContent.includes('Clear Day')
if (!hasClearDayButton) {
  console.log('❌ FAIL: Clear Day button was accidentally removed')
  process.exit(1)
} else {
  console.log('✅ PASS: Clear Day button still present')
}

// Test 3: Verify spacing reduction
console.log('\n2. Testing spacing improvements...')
const assignmentsTabPath = path.join(__dirname, '../components/projects/tabs/assignments-tab.tsx')
const assignmentsTabContent = fs.readFileSync(assignmentsTabPath, 'utf8')

const hasConditionalCardContent = assignmentsTabContent.includes('{projectSchedule.isSingleDay && (') && assignmentsTabContent.includes('<CardContent>')
const hasIncreasedHeaderGap = assignmentsTabContent.includes('CardHeader className="gap-4"')

if (!hasConditionalCardContent) {
  console.log('❌ FAIL: CardContent was not made conditional to prevent empty spacing')
  process.exit(1)
} else if (!hasIncreasedHeaderGap) {
  console.log('❌ FAIL: CardHeader gap was not increased for better row spacing')
  process.exit(1)
} else {
  console.log('✅ PASS: CardContent conditional and CardHeader gap increased for better spacing')
}

// Test 4: Verify progress bar width increase
console.log('\n3. Testing progress bar width increase...')
const hasLargerProgressBar = assignmentsTabContent.includes('w-96 bg-muted rounded-full h-2')
if (!hasLargerProgressBar) {
  console.log('❌ FAIL: Progress bar width was not increased to w-96')
  process.exit(1)
} else {
  console.log('✅ PASS: Progress bar width increased from w-64 to w-96 (1.5x size)')
}

// Test 5: Verify no old spacing remains
const hasOldSpacing = assignmentsTabContent.includes('pt-2 border-t border-border mt-4')
if (hasOldSpacing) {
  console.log('❌ FAIL: Old spacing with both padding and margin still found in code')
  process.exit(1)
} else {
  console.log('✅ PASS: Excessive spacing (mt-4) completely removed')
}

// Test 6: Verify no old progress bar width remains
const hasOldProgressBar = assignmentsTabContent.includes('w-64 bg-muted rounded-full h-2')
if (hasOldProgressBar) {
  console.log('❌ FAIL: Old progress bar width (w-64) still found in code')
  process.exit(1)
} else {
  console.log('✅ PASS: Old progress bar width completely removed')
}

console.log('\n🎉 All UI improvements successfully implemented!')
console.log('\nSummary of changes:')
console.log('• Removed "x talent scheduled" text from day section header')
console.log('• Fixed spacing: made CardContent conditional + increased CardHeader gap (gap-1.5 → gap-4)')
console.log('• Increased progress bar width by 1.5x (w-64 → w-96, 256px → 384px)')
console.log('• Maintained Clear Day button functionality')