#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔍 Testing balanced spacing in assignments interface...')

// Read the assignments tab file
const assignmentsTabPath = path.join(process.cwd(), 'components/projects/tabs/assignments-tab.tsx')

if (!fs.existsSync(assignmentsTabPath)) {
  console.log('❌ FAIL: assignments-tab.tsx file not found')
  process.exit(1)
}

const assignmentsTabContent = fs.readFileSync(assignmentsTabPath, 'utf8')

console.log('1. Testing space below top row (CardHeader gap)...')
const hasCardHeaderGap = assignmentsTabContent.includes('CardHeader className="gap-4"')
if (!hasCardHeaderGap) {
  console.log('❌ FAIL: CardHeader does not have gap-4 class for space below top row')
  process.exit(1)
} else {
  console.log('✅ PASS: CardHeader has gap-4 class (16px space below top row)')
}

console.log('2. Testing space above bottom row (progress row padding)...')
const hasProgressPadding = assignmentsTabContent.includes('pt-3 border-t border-border')
if (!hasProgressPadding) {
  console.log('❌ FAIL: Progress row does not have pt-3 padding to move away from dividing line')
  process.exit(1)
} else {
  console.log('✅ PASS: Progress row has pt-3 padding (12px space above bottom row)')
}

console.log('3. Verifying old padding was replaced...')
const hasOldPadding = assignmentsTabContent.includes('pt-2 border-t border-border')
if (hasOldPadding) {
  console.log('❌ FAIL: Old pt-2 padding still exists - should be replaced with pt-3')
  process.exit(1)
} else {
  console.log('✅ PASS: Old pt-2 padding successfully replaced with pt-3')
}

console.log('\n🎉 Balanced spacing successfully implemented!')
console.log('Summary of spacing:')
console.log('• Below top row: 16px (gap-4 on CardHeader)')
console.log('• Above bottom row: 12px (pt-3 on progress row)')
console.log('• Result: More space below top row, adequate space above bottom row')
console.log('• Both rows now have proper separation from the dividing border line')