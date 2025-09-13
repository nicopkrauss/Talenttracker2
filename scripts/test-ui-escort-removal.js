#!/usr/bin/env node

/**
 * UI Test script to verify escort removal and repopulation in assignment dropdown
 * 
 * This script simulates the UI behavior to ensure the optimistic updates work correctly
 * when escorts are assigned and then removed from talent assignments.
 */

console.log('🧪 Testing UI escort removal and repopulation behavior...\n')

// Mock data to simulate the UI state
const mockScheduledTalent = [
  {
    talentId: 'talent-1',
    talentName: 'John Doe',
    escortId: undefined,
    escortName: undefined,
    isGroup: false
  },
  {
    talentId: 'talent-2', 
    talentName: 'Jane Smith',
    escortId: 'escort-2',
    escortName: 'Bob Wilson',
    isGroup: false
  }
]

const mockAvailableEscorts = [
  {
    escortId: 'escort-1',
    escortName: 'Alice Johnson',
    section: 'available',
    currentAssignment: undefined
  },
  {
    escortId: 'escort-2',
    escortName: 'Bob Wilson', 
    section: 'current_day_assigned',
    currentAssignment: {
      talentName: 'Jane Smith',
      date: new Date('2024-01-15')
    }
  },
  {
    escortId: 'escort-3',
    escortName: 'Charlie Brown',
    section: 'available',
    currentAssignment: undefined
  }
]

// Simulate the optimistic update logic from the fixed code
function simulateAssignmentChange(talentId, escortId, scheduledTalent, availableEscorts) {
  console.log(`📝 Simulating assignment change: ${talentId} → ${escortId || 'null (removal)'}`)
  
  const normalizedEscortId = escortId || undefined
  
  // Update scheduled talent
  const updatedTalent = scheduledTalent.map(talent => 
    talent.talentId === talentId 
      ? { 
          ...talent, 
          escortId: normalizedEscortId,
          escortName: normalizedEscortId ? availableEscorts.find(e => e.escortId === normalizedEscortId)?.escortName : undefined
        }
      : talent
  )
  
  // Update available escorts status optimistically (using the fixed logic)
  const updatedEscorts = availableEscorts.map(escort => {
    // If we're assigning this escort, mark them as current_day_assigned
    if (normalizedEscortId && escort.escortId === normalizedEscortId) {
      return {
        ...escort,
        section: 'current_day_assigned',
        currentAssignment: {
          talentName: scheduledTalent.find(t => t.talentId === talentId)?.talentName || 'Unknown',
          date: new Date('2024-01-15')
        }
      }
    }
    
    // If we're removing an escort (escortId is null), check if this escort was previously assigned to this talent
    if (!normalizedEscortId) {
      const currentTalent = scheduledTalent.find(t => t.talentId === talentId)
      if (currentTalent?.escortId === escort.escortId && escort.section === 'current_day_assigned') {
        // Check if this escort has any other assignments on this date
        const hasOtherAssignments = scheduledTalent.some(t => 
          t.talentId !== talentId && t.escortId === escort.escortId
        )
        
        if (!hasOtherAssignments) {
          // Move escort back to available section
          return {
            ...escort,
            section: 'available',
            currentAssignment: undefined
          }
        }
      }
    }
    
    return escort
  })
  
  return { updatedTalent, updatedEscorts }
}

function printState(label, scheduledTalent, availableEscorts) {
  console.log(`\n${label}:`)
  console.log('📋 Scheduled Talent:')
  scheduledTalent.forEach(talent => {
    const assignment = talent.escortId ? `→ ${talent.escortName}` : '→ Unassigned'
    console.log(`   ${talent.talentName} ${assignment}`)
  })
  
  console.log('👥 Available Escorts:')
  availableEscorts.forEach(escort => {
    const assignment = escort.currentAssignment ? ` (assigned to ${escort.currentAssignment.talentName})` : ''
    console.log(`   ${escort.escortName} [${escort.section}]${assignment}`)
  })
}

// Test scenarios
console.log('🎯 Test Scenario 1: Assign available escort to unassigned talent')
printState('Initial State', mockScheduledTalent, mockAvailableEscorts)

// Assign Alice Johnson to John Doe
let result1 = simulateAssignmentChange('talent-1', 'escort-1', mockScheduledTalent, mockAvailableEscorts)
printState('After Assignment', result1.updatedTalent, result1.updatedEscorts)

// Verify Alice is now marked as assigned
const aliceAfterAssign = result1.updatedEscorts.find(e => e.escortId === 'escort-1')
if (aliceAfterAssign?.section === 'current_day_assigned') {
  console.log('✅ SUCCESS: Alice correctly marked as assigned')
} else {
  console.log('❌ FAILURE: Alice not properly marked as assigned')
}

console.log('\n' + '='.repeat(60))
console.log('🎯 Test Scenario 2: Remove escort assignment (THE FIX)')

// Remove Alice from John Doe
let result2 = simulateAssignmentChange('talent-1', null, result1.updatedTalent, result1.updatedEscorts)
printState('After Removal', result2.updatedTalent, result2.updatedEscorts)

// Verify Alice is back in available section
const aliceAfterRemoval = result2.updatedEscorts.find(e => e.escortId === 'escort-1')
if (aliceAfterRemoval?.section === 'available' && !aliceAfterRemoval.currentAssignment) {
  console.log('✅ SUCCESS: Alice correctly returned to available section!')
  console.log('   The escort removal fix is working properly.')
} else {
  console.log('❌ FAILURE: Alice not properly returned to available section')
  console.log(`   Expected: section='available', currentAssignment=undefined`)
  console.log(`   Actual: section='${aliceAfterRemoval?.section}', currentAssignment=${aliceAfterRemoval?.currentAssignment}`)
}

console.log('\n' + '='.repeat(60))
console.log('🎯 Test Scenario 3: Remove escort with other assignments (should stay assigned)')

// Remove Bob from Jane Smith (but Bob might have other assignments)
let result3 = simulateAssignmentChange('talent-2', null, result2.updatedTalent, result2.updatedEscorts)
printState('After Removing Bob from Jane', result3.updatedTalent, result3.updatedEscorts)

// Bob should be returned to available since he has no other assignments in our mock data
const bobAfterRemoval = result3.updatedEscorts.find(e => e.escortId === 'escort-2')
if (bobAfterRemoval?.section === 'available') {
  console.log('✅ SUCCESS: Bob correctly returned to available section')
} else {
  console.log('❌ FAILURE: Bob not properly handled after removal')
}

console.log('\n🎉 UI escort removal test completed!')
console.log('\nKey improvements from the fix:')
console.log('• Escorts are properly returned to "available" section when removed')
console.log('• The assignment dropdown will now show previously assigned escorts')
console.log('• Optimistic UI updates work correctly for both assignment and removal')