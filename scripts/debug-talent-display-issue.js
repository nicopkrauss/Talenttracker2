#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔍 Debugging Talent Display Issue\n')

try {
  // Check the optimistic state hook changes
  console.log('1. Checking optimistic state hook...')
  const optimisticStatePath = path.join(__dirname, '..', 'hooks', 'use-optimistic-state.ts')
  
  if (!fs.existsSync(optimisticStatePath)) {
    throw new Error('Optimistic state hook not found')
  }
  
  const optimisticStateContent = fs.readFileSync(optimisticStatePath, 'utf8')
  
  // Check for proper initialization
  if (!optimisticStateContent.includes('useState<T[]>(() => initialData)')) {
    console.log('   ❌ useState not using lazy initialization')
  } else {
    console.log('   ✅ useState using lazy initialization')
  }
  
  // Check for initial sync logic
  if (!optimisticStateContent.includes('lastSyncRef.current === 0')) {
    console.log('   ❌ Missing initial sync logic')
  } else {
    console.log('   ✅ Initial sync logic present')
  }
  
  // Check sync effect dependencies
  if (optimisticStateContent.includes('optimisticData.length')) {
    console.log('   ❌ Still has problematic optimisticData.length dependency')
  } else {
    console.log('   ✅ Removed problematic dependency')
  }

  // Check talent roster tab
  console.log('\n2. Checking talent roster tab...')
  const talentRosterTabPath = path.join(__dirname, '..', 'components', 'projects', 'tabs', 'talent-roster-tab.tsx')
  
  if (!fs.existsSync(talentRosterTabPath)) {
    throw new Error('Talent roster tab not found')
  }
  
  const talentRosterTabContent = fs.readFileSync(talentRosterTabPath, 'utf8')
  
  // Check if optimistic state hooks are properly configured
  const assignedTalentHookMatch = talentRosterTabContent.match(/useOptimisticState\(serverAssignedTalent/)
  const availableTalentHookMatch = talentRosterTabContent.match(/useOptimisticState\(serverAvailableTalent/)
  
  if (!assignedTalentHookMatch || !availableTalentHookMatch) {
    console.log('   ❌ Optimistic state hooks not properly configured')
  } else {
    console.log('   ✅ Optimistic state hooks properly configured')
  }
  
  // Check if data loading logic is intact
  if (!talentRosterTabContent.includes('setServerAssignedTalent')) {
    console.log('   ❌ Missing server data setting logic')
  } else {
    console.log('   ✅ Server data setting logic present')
  }

  console.log('\n3. Potential issues identified:')
  
  // Issue 1: Sync timing
  console.log('   • Sync timing: The optimistic state may not be syncing with server data on initial load')
  console.log('   • Fix applied: Added initial sync logic for when lastSyncRef.current === 0')
  
  // Issue 2: State initialization
  console.log('   • State initialization: useState may not be properly initializing with server data')
  console.log('   • Fix applied: Changed to lazy initialization with useState(() => initialData)')
  
  console.log('\n4. Debugging steps to try:')
  console.log('   1. Check browser console for any errors')
  console.log('   2. Check Network tab to see if API calls are successful')
  console.log('   3. Add temporary console.log in loadData function to see if data is being fetched')
  console.log('   4. Check if serverAssignedTalent state is being set correctly')
  
  console.log('\n5. Quick fix to try:')
  console.log('   • Refresh the page to see if data loads on initial load')
  console.log('   • Try assigning a talent to see if the optimistic updates work')
  console.log('   • Check if the issue is with initial data loading or optimistic updates')

} catch (error) {
  console.error('❌ Debug failed:', error.message)
  process.exit(1)
}