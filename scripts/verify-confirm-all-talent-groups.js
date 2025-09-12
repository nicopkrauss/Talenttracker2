#!/usr/bin/env node

/**
 * Verification script to ensure confirm all functionality works with talent groups
 * This script checks all the components and data flow for the confirm all feature
 */

const fs = require('fs')
const path = require('path')

function verifyConfirmAllTalentGroups() {
  console.log('🔍 Verifying Confirm All Functionality for Talent Groups...\n')

  const issues = []
  const successes = []

  try {
    // Check 1: Verify schedule-utils.ts has timezone fix
    console.log('📋 Check 1: Schedule utilities timezone fix...')
    const scheduleUtilsPath = path.join(__dirname, '..', 'lib', 'schedule-utils.ts')
    
    if (fs.existsSync(scheduleUtilsPath)) {
      const scheduleUtilsContent = fs.readFileSync(scheduleUtilsPath, 'utf8')
      
      const hasTimezoneFix = scheduleUtilsContent.includes('dateStr + \'T00:00:00\'')
      const hasIsoStringsToDates = scheduleUtilsContent.includes('function isoStringsToDates')
      const hasDatesToisoStrings = scheduleUtilsContent.includes('function datesToISOStrings')
      
      if (hasTimezoneFix && hasIsoStringsToDates && hasDatesToisoStrings) {
        successes.push('✅ Schedule utilities have proper timezone handling')
      } else {
        issues.push('❌ Schedule utilities missing timezone fix or conversion functions')
      }
    } else {
      issues.push('❌ schedule-utils.ts not found')
    }

    // Check 2: Verify TalentScheduleColumn component
    console.log('📋 Check 2: TalentScheduleColumn component...')
    const scheduleColumnPath = path.join(__dirname, '..', 'components', 'projects', 'talent-schedule-column.tsx')
    
    if (fs.existsSync(scheduleColumnPath)) {
      const columnContent = fs.readFileSync(scheduleColumnPath, 'utf8')
      
      const hasGroupHandling = columnContent.includes('isGroup')
      const hasGroupEndpoint = columnContent.includes('/talent-groups/')
      const hasRegisterConfirm = columnContent.includes('onRegisterConfirm')
      const hasHandleConfirm = columnContent.includes('handleConfirm')
      const hasTimezoneImport = columnContent.includes('isoStringsToDates')
      
      if (hasGroupHandling && hasGroupEndpoint && hasRegisterConfirm && hasHandleConfirm && hasTimezoneImport) {
        successes.push('✅ TalentScheduleColumn properly handles groups and confirm functions')
      } else {
        const missing = []
        if (!hasGroupHandling) missing.push('isGroup handling')
        if (!hasGroupEndpoint) missing.push('group API endpoint')
        if (!hasRegisterConfirm) missing.push('register confirm callback')
        if (!hasHandleConfirm) missing.push('handleConfirm function')
        if (!hasTimezoneImport) missing.push('timezone conversion imports')
        issues.push(`❌ TalentScheduleColumn missing: ${missing.join(', ')}`)
      }
    } else {
      issues.push('❌ TalentScheduleColumn component not found')
    }

    // Check 3: Verify talent roster tab confirm all implementation
    console.log('📋 Check 3: Talent roster tab confirm all...')
    const talentRosterTabPath = path.join(__dirname, '..', 'components', 'projects', 'tabs', 'talent-roster-tab.tsx')
    
    if (fs.existsSync(talentRosterTabPath)) {
      const tabContent = fs.readFileSync(talentRosterTabPath, 'utf8')
      
      const hasConfirmAll = tabContent.includes('handleConfirmAll')
      const hasConfirmFunctions = tabContent.includes('confirmFunctions')
      const hasRegisterFunction = tabContent.includes('registerConfirmFunction')
      const hasUnregisterFunction = tabContent.includes('unregisterConfirmFunction')
      const hasConfirmAllButton = tabContent.includes('Confirm All')
      
      if (hasConfirmAll && hasConfirmFunctions && hasRegisterFunction && hasUnregisterFunction && hasConfirmAllButton) {
        successes.push('✅ Talent roster tab has complete confirm all implementation')
      } else {
        const missing = []
        if (!hasConfirmAll) missing.push('handleConfirmAll function')
        if (!hasConfirmFunctions) missing.push('confirmFunctions state')
        if (!hasRegisterFunction) missing.push('registerConfirmFunction')
        if (!hasUnregisterFunction) missing.push('unregisterConfirmFunction')
        if (!hasConfirmAllButton) missing.push('Confirm All button')
        issues.push(`❌ Talent roster tab missing: ${missing.join(', ')}`)
      }
    } else {
      issues.push('❌ Talent roster tab component not found')
    }

    // Check 4: Verify draggable talent list passes callbacks
    console.log('📋 Check 4: Draggable talent list group handling...')
    const draggableListPath = path.join(__dirname, '..', 'components', 'projects', 'draggable-talent-list.tsx')
    
    if (fs.existsSync(draggableListPath)) {
      const listContent = fs.readFileSync(draggableListPath, 'utf8')
      
      const hasGroupRendering = listContent.includes('isGroup={true}')
      const hasRegisterCallback = listContent.includes('onRegisterConfirm={onRegisterConfirm}')
      const hasUnregisterCallback = listContent.includes('onUnregisterConfirm={onUnregisterConfirm}')
      const hasScheduledDatesProps = listContent.includes('initialScheduledDates={group.scheduledDates')
      
      if (hasGroupRendering && hasRegisterCallback && hasUnregisterCallback && hasScheduledDatesProps) {
        successes.push('✅ Draggable talent list properly renders groups with callbacks')
      } else {
        const missing = []
        if (!hasGroupRendering) missing.push('isGroup={true}')
        if (!hasRegisterCallback) missing.push('onRegisterConfirm callback')
        if (!hasUnregisterCallback) missing.push('onUnregisterConfirm callback')
        if (!hasScheduledDatesProps) missing.push('scheduledDates props')
        issues.push(`❌ Draggable talent list missing: ${missing.join(', ')}`)
      }
    } else {
      issues.push('❌ Draggable talent list component not found')
    }

    // Check 5: Verify talent group API endpoints
    console.log('📋 Check 5: Talent group API endpoints...')
    const groupApiPath = path.join(__dirname, '..', 'app', 'api', 'projects', '[id]', 'talent-groups', '[groupId]', 'route.ts')
    
    if (fs.existsSync(groupApiPath)) {
      const apiContent = fs.readFileSync(groupApiPath, 'utf8')
      
      const hasPutMethod = apiContent.includes('export async function PUT')
      const hasScheduledDatesHandling = apiContent.includes('scheduled_dates:')
      const hasTimezoneHandling = apiContent.includes('typeof date === \'string\' && date.match')
      const hasValidation = apiContent.includes('talentGroupSchema.safeParse')
      
      if (hasPutMethod && hasScheduledDatesHandling && hasTimezoneHandling && hasValidation) {
        successes.push('✅ Talent group API has proper PUT method with timezone handling')
      } else {
        const missing = []
        if (!hasPutMethod) missing.push('PUT method')
        if (!hasScheduledDatesHandling) missing.push('scheduled_dates handling')
        if (!hasTimezoneHandling) missing.push('timezone handling')
        if (!hasValidation) missing.push('input validation')
        issues.push(`❌ Talent group API missing: ${missing.join(', ')}`)
      }
    } else {
      issues.push('❌ Talent group API endpoint not found')
    }

    // Check 6: Verify talent group creation API
    console.log('📋 Check 6: Talent group creation API...')
    const groupCreateApiPath = path.join(__dirname, '..', 'app', 'api', 'projects', '[id]', 'talent-groups', 'route.ts')
    
    if (fs.existsSync(groupCreateApiPath)) {
      const createApiContent = fs.readFileSync(groupCreateApiPath, 'utf8')
      
      const hasPostMethod = createApiContent.includes('export async function POST')
      const hasGetMethod = createApiContent.includes('export async function GET')
      const hasTimezoneHandling = createApiContent.includes('typeof date === \'string\' && date.match')
      
      if (hasPostMethod && hasGetMethod && hasTimezoneHandling) {
        successes.push('✅ Talent group creation API has proper methods with timezone handling')
      } else {
        const missing = []
        if (!hasPostMethod) missing.push('POST method')
        if (!hasGetMethod) missing.push('GET method')
        if (!hasTimezoneHandling) missing.push('timezone handling')
        issues.push(`❌ Talent group creation API missing: ${missing.join(', ')}`)
      }
    } else {
      issues.push('❌ Talent group creation API not found')
    }

    // Check 7: Verify types and schemas
    console.log('📋 Check 7: Type definitions and schemas...')
    const typesPath = path.join(__dirname, '..', 'lib', 'types.ts')
    
    if (fs.existsSync(typesPath)) {
      const typesContent = fs.readFileSync(typesPath, 'utf8')
      
      const hasTalentGroupType = typesContent.includes('interface TalentGroup') || typesContent.includes('type TalentGroup')
      const hasTalentGroupSchema = typesContent.includes('talentGroupSchema')
      const hasScheduledDatesField = typesContent.includes('scheduledDates')
      
      if (hasTalentGroupType && hasTalentGroupSchema && hasScheduledDatesField) {
        successes.push('✅ Type definitions include proper TalentGroup interface and schema')
      } else {
        const missing = []
        if (!hasTalentGroupType) missing.push('TalentGroup type/interface')
        if (!hasTalentGroupSchema) missing.push('talentGroupSchema')
        if (!hasScheduledDatesField) missing.push('scheduledDates field')
        issues.push(`❌ Type definitions missing: ${missing.join(', ')}`)
      }
    } else {
      issues.push('❌ Types file not found')
    }

    // Summary
    console.log('\n📋 Verification Summary:')
    console.log(`✅ Successes: ${successes.length}`)
    successes.forEach(success => console.log(`   ${success}`))
    
    console.log(`\n❌ Issues: ${issues.length}`)
    issues.forEach(issue => console.log(`   ${issue}`))

    if (issues.length === 0) {
      console.log('\n🎉 All checks passed! Confirm all functionality should work correctly with talent groups.')
      console.log('\n💡 If you\'re still experiencing issues:')
      console.log('   1. Check browser console for JavaScript errors')
      console.log('   2. Verify that talent groups are properly registering their confirm functions')
      console.log('   3. Ensure dates are within the project date range')
      console.log('   4. Check network tab for failed API calls')
      console.log('   5. Verify that the project is in active status')
    } else {
      console.log('\n⚠️  Some issues were found that may affect confirm all functionality.')
      console.log('   Please address the issues listed above.')
    }

    // Additional debugging tips
    console.log('\n🔧 Debugging Tips:')
    console.log('   1. Open browser dev tools and go to the Talent Roster tab')
    console.log('   2. Make changes to talent group schedules')
    console.log('   3. Check that the "Confirm All" button shows the correct count')
    console.log('   4. Click "Confirm All" and watch the console for errors')
    console.log('   5. Check the Network tab for API calls to /talent-groups/[id]')
    console.log('   6. Verify that the scheduled_dates are being sent correctly in the request body')

  } catch (error) {
    console.error('❌ Error during verification:', error.message)
  }
}

// Run the verification
verifyConfirmAllTalentGroups()