#!/usr/bin/env node

/**
 * Update Existing Timecard Routes to Use Normalized Structure
 * 
 * This script helps transition from the old timecards table to the new
 * normalized timecard_headers + timecard_daily_entries structure.
 */

const fs = require('fs')
const path = require('path')

const routesToUpdate = [
  'app/api/timecards/route.ts',
  'app/api/timecards/[id]/route.ts', 
  'app/api/timecards/approve/route.ts',
  'app/api/timecards/reject/route.ts',
  'app/api/timecards/edit/route.ts'
]

const componentsToUpdate = [
  'app/(app)/timecards/page.tsx',
  'app/(app)/timecards/[id]/page.tsx',
  'components/timecards/enhanced-timecard-list.tsx'
]

function analyzeCurrentUsage() {
  console.log('🔍 Analyzing current timecard table usage...')
  
  const results = {
    apiRoutes: [],
    components: [],
    otherFiles: []
  }
  
  // Check API routes
  routesToUpdate.forEach(route => {
    const filePath = path.join(process.cwd(), route)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      
      const usesOldTable = content.includes("from('timecards')")
      const usesNewTable = content.includes("from('timecard_headers')")
      
      results.apiRoutes.push({
        file: route,
        exists: true,
        usesOldTable,
        usesNewTable,
        needsUpdate: usesOldTable && !usesNewTable
      })
    } else {
      results.apiRoutes.push({
        file: route,
        exists: false,
        needsUpdate: false
      })
    }
  })
  
  // Check components
  componentsToUpdate.forEach(component => {
    const filePath = path.join(process.cwd(), component)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      
      const usesOldAPI = content.includes('/api/timecards') && !content.includes('/api/timecards-v2')
      const usesNewAPI = content.includes('/api/timecards-v2')
      
      results.components.push({
        file: component,
        exists: true,
        usesOldAPI,
        usesNewAPI,
        needsUpdate: usesOldAPI && !usesNewAPI
      })
    } else {
      results.components.push({
        file: component,
        exists: false,
        needsUpdate: false
      })
    }
  })
  
  return results
}

function generateUpdatePlan(analysis) {
  console.log('\n📋 Update Plan for Normalized Timecard Structure')
  console.log('=' .repeat(60))
  
  console.log('\n🔧 API Routes Status:')
  analysis.apiRoutes.forEach(route => {
    if (!route.exists) {
      console.log(`   ⚪ ${route.file} - Not found`)
    } else if (route.needsUpdate) {
      console.log(`   🔴 ${route.file} - Needs update (uses old table)`)
    } else if (route.usesNewTable) {
      console.log(`   ✅ ${route.file} - Already updated`)
    } else {
      console.log(`   ⚠️  ${route.file} - Unknown status`)
    }
  })
  
  console.log('\n🎨 Components Status:')
  analysis.components.forEach(component => {
    if (!component.exists) {
      console.log(`   ⚪ ${component.file} - Not found`)
    } else if (component.needsUpdate) {
      console.log(`   🔴 ${component.file} - Needs update (uses old API)`)
    } else if (component.usesNewAPI) {
      console.log(`   ✅ ${component.file} - Already updated`)
    } else {
      console.log(`   ⚠️  ${component.file} - Unknown status`)
    }
  })
  
  // Count items needing updates
  const apiUpdatesNeeded = analysis.apiRoutes.filter(r => r.needsUpdate).length
  const componentUpdatesNeeded = analysis.components.filter(c => c.needsUpdate).length
  
  console.log('\n📊 Summary:')
  console.log(`   API Routes needing update: ${apiUpdatesNeeded}`)
  console.log(`   Components needing update: ${componentUpdatesNeeded}`)
  console.log(`   Total files to update: ${apiUpdatesNeeded + componentUpdatesNeeded}`)
  
  return {
    apiUpdatesNeeded,
    componentUpdatesNeeded,
    totalUpdates: apiUpdatesNeeded + componentUpdatesNeeded
  }
}

function generateMigrationSteps(analysis) {
  console.log('\n📝 Recommended Migration Steps:')
  console.log('=' .repeat(40))
  
  const needsApiUpdates = analysis.apiRoutes.filter(r => r.needsUpdate)
  const needsComponentUpdates = analysis.components.filter(c => c.needsUpdate)
  
  if (needsApiUpdates.length > 0) {
    console.log('\n🔧 Step 1: Update API Routes')
    needsApiUpdates.forEach((route, index) => {
      console.log(`   ${index + 1}. Update ${route.file}:`)
      console.log(`      - Replace .from('timecards') with .from('timecard_headers')`)
      console.log(`      - Add daily_entries relation where needed`)
      console.log(`      - Update data structure handling`)
    })
  }
  
  if (needsComponentUpdates.length > 0) {
    console.log('\n🎨 Step 2: Update Components')
    needsComponentUpdates.forEach((component, index) => {
      console.log(`   ${index + 1}. Update ${component.file}:`)
      console.log(`      - Replace /api/timecards with /api/timecards-v2`)
      console.log(`      - Update data structure handling`)
      console.log(`      - Use NormalizedTimecardDisplay component`)
    })
  }
  
  console.log('\n🧪 Step 3: Testing')
  console.log('   1. Test timecard creation with new structure')
  console.log('   2. Test timecard listing and filtering')
  console.log('   3. Test approval/rejection workflows')
  console.log('   4. Test editing functionality')
  console.log('   5. Verify multi-day timecard display')
  
  console.log('\n🗑️  Step 4: Cleanup (After Verification)')
  console.log('   1. Add deprecation warnings to old routes')
  console.log('   2. Monitor usage of old vs new system')
  console.log('   3. Eventually drop old timecards table')
  console.log('   4. Remove old API routes and components')
}

function checkDependencies() {
  console.log('\n🔍 Checking migration dependencies...')
  
  const dependencies = [
    {
      name: 'New tables created',
      check: () => {
        // This would need to check if tables exist in database
        // For now, we'll assume they exist if migration files are present
        return fs.existsSync('migrations/041_alternative_timecard_structure.sql')
      }
    },
    {
      name: 'Prisma schema updated',
      check: () => {
        const schemaPath = 'prisma/schema.prisma'
        if (!fs.existsSync(schemaPath)) return false
        
        const content = fs.readFileSync(schemaPath, 'utf8')
        return content.includes('model timecard_headers') && content.includes('model timecard_daily_entries')
      }
    },
    {
      name: 'New API route exists',
      check: () => fs.existsSync('app/api/timecards-v2/route.ts')
    },
    {
      name: 'New component exists',
      check: () => fs.existsSync('components/timecards/normalized-timecard-display.tsx')
    }
  ]
  
  dependencies.forEach(dep => {
    const status = dep.check() ? '✅' : '❌'
    console.log(`   ${status} ${dep.name}`)
  })
  
  const allReady = dependencies.every(dep => dep.check())
  
  if (allReady) {
    console.log('\n✅ All dependencies ready for migration!')
  } else {
    console.log('\n❌ Some dependencies missing. Complete setup first:')
    console.log('   1. Apply SQL migration: migrations/041_alternative_timecard_structure.sql')
    console.log('   2. Run: npx prisma generate')
    console.log('   3. Ensure new API and components are created')
  }
  
  return allReady
}

async function main() {
  console.log('🎯 Timecard System Migration Analysis')
  console.log('   Analyzing transition from old to normalized structure\n')
  
  // Check if we're ready for migration
  const dependenciesReady = checkDependencies()
  
  if (!dependenciesReady) {
    console.log('\n⚠️  Complete setup before proceeding with migration.')
    process.exit(1)
  }
  
  // Analyze current usage
  const analysis = analyzeCurrentUsage()
  
  // Generate update plan
  const summary = generateUpdatePlan(analysis)
  
  // Generate migration steps
  generateMigrationSteps(analysis)
  
  if (summary.totalUpdates === 0) {
    console.log('\n🎉 All files already updated to use normalized structure!')
    console.log('\n📝 Next steps:')
    console.log('   1. Test all timecard functionality')
    console.log('   2. Monitor system performance')
    console.log('   3. Plan deprecation of old timecards table')
  } else {
    console.log('\n🚀 Ready to proceed with migration!')
    console.log(`   ${summary.totalUpdates} files need updates`)
    console.log('\n💡 Recommendation:')
    console.log('   - Update files one by one')
    console.log('   - Test each change thoroughly')
    console.log('   - Keep old table as backup during transition')
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Analysis failed:', error)
    process.exit(1)
  })
}

module.exports = { analyzeCurrentUsage, generateUpdatePlan }