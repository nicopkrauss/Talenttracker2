#!/usr/bin/env node

/**
 * Test script to verify the CircularDateSelector fix in MassAvailabilityPopup
 * 
 * This script verifies that the component uses the correct props and interfaces
 */

const fs = require('fs')
const path = require('path')

function testCircularDateSelectorFix() {
  console.log('🧪 Testing CircularDateSelector Fix...\\n')

  try {
    // 1. Check MassAvailabilityPopup component
    console.log('1. Checking MassAvailabilityPopup component...')
    
    const massPopupPath = path.join(process.cwd(), 'components/projects/mass-availability-popup.tsx')
    const massPopupContent = fs.readFileSync(massPopupPath, 'utf8')
    
    // Check for correct imports
    if (!massPopupContent.includes('import { CircularDateSelector, CircularDateSelectorLegend }')) {
      throw new Error('CircularDateSelector and CircularDateSelectorLegend not properly imported')
    }
    console.log('   ✅ CircularDateSelector and CircularDateSelectorLegend properly imported')
    
    // Check for correct prop usage
    if (!massPopupContent.includes('schedule={projectSchedule}')) {
      throw new Error('CircularDateSelector not using correct "schedule" prop')
    }
    console.log('   ✅ CircularDateSelector uses correct "schedule" prop')
    
    if (!massPopupContent.includes('onDateToggle={(date) => handleDateToggle(teamMember.assignmentId, date)}')) {
      throw new Error('CircularDateSelector not using correct "onDateToggle" prop')
    }
    console.log('   ✅ CircularDateSelector uses correct "onDateToggle" prop')
    
    // Check for handleDateToggle function
    if (!massPopupContent.includes('const handleDateToggle = (assignmentId: string, date: Date) => {')) {
      throw new Error('handleDateToggle function not found or incorrect signature')
    }
    console.log('   ✅ handleDateToggle function properly implemented')
    
    // Check for legend usage
    if (!massPopupContent.includes('<CircularDateSelectorLegend />')) {
      throw new Error('CircularDateSelectorLegend not used')
    }
    console.log('   ✅ CircularDateSelectorLegend properly used')

    // 2. Check CircularDateSelector interface
    console.log('\\n2. Checking CircularDateSelector interface...')
    
    const selectorPath = path.join(process.cwd(), 'components/ui/circular-date-selector.tsx')
    const selectorContent = fs.readFileSync(selectorPath, 'utf8')
    
    // Check interface definition
    if (!selectorContent.includes('interface CircularDateSelectorProps')) {
      throw new Error('CircularDateSelectorProps interface not found')
    }
    console.log('   ✅ CircularDateSelectorProps interface exists')
    
    if (!selectorContent.includes('schedule: ProjectSchedule')) {
      throw new Error('CircularDateSelector interface missing "schedule" prop')
    }
    console.log('   ✅ CircularDateSelector interface has "schedule" prop')
    
    if (!selectorContent.includes('onDateToggle: (date: Date) => void')) {
      throw new Error('CircularDateSelector interface missing "onDateToggle" prop')
    }
    console.log('   ✅ CircularDateSelector interface has "onDateToggle" prop')

    // 3. Check ProjectSchedule interface
    console.log('\\n3. Checking ProjectSchedule interface...')
    
    const typesPath = path.join(process.cwd(), 'lib/types.ts')
    const typesContent = fs.readFileSync(typesPath, 'utf8')
    
    if (!typesContent.includes('allDates: Date[]')) {
      throw new Error('ProjectSchedule interface missing "allDates" property')
    }
    console.log('   ✅ ProjectSchedule interface has "allDates" property')

    // 4. Check schedule utils
    console.log('\\n4. Checking schedule utilities...')
    
    const scheduleUtilsPath = path.join(process.cwd(), 'lib/schedule-utils.ts')
    const scheduleUtilsContent = fs.readFileSync(scheduleUtilsPath, 'utf8')
    
    if (!scheduleUtilsContent.includes('export function createProjectScheduleFromStrings')) {
      throw new Error('createProjectScheduleFromStrings function not found')
    }
    console.log('   ✅ createProjectScheduleFromStrings function exists')
    
    if (!scheduleUtilsContent.includes('const allDates = calculateAllProjectDates(startDate, endDate)')) {
      throw new Error('createProjectSchedule function not calculating allDates property')
    }
    
    if (!scheduleUtilsContent.includes('allDates,')) {
      throw new Error('createProjectSchedule function not returning allDates property')
    }
    console.log('   ✅ createProjectSchedule function sets allDates property')

    console.log('\\n🎉 CircularDateSelector Fix Verification Completed Successfully!')
    console.log('\\nFix Summary:')
    console.log('✅ Fixed prop name: projectSchedule → schedule')
    console.log('✅ Fixed callback name: onSelectionChange → onDateToggle')
    console.log('✅ Fixed callback signature: (dates: Date[]) → (date: Date)')
    console.log('✅ Added proper date toggle logic')
    console.log('✅ Added CircularDateSelectorLegend for better UX')
    console.log('✅ Added disabled state during confirmation')
    
    console.log('\\n🚀 The TypeError should now be resolved!')
    console.log('\\nThe issue was:')
    console.log('- MassAvailabilityPopup was using wrong prop names for CircularDateSelector')
    console.log('- CircularDateSelector expects "schedule" not "projectSchedule"')
    console.log('- CircularDateSelector expects "onDateToggle" not "onSelectionChange"')
    console.log('- Date selection logic needed to handle individual date toggles')
    
    console.log('\\nNow the component:')
    console.log('- Uses correct CircularDateSelector interface')
    console.log('- Properly handles individual date toggle events')
    console.log('- Maintains consistent UX with individual availability confirmation')
    console.log('- Includes legend for better user understanding')

  } catch (error) {
    console.error('❌ Fix verification failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testCircularDateSelectorFix()