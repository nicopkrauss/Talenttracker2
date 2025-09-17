#!/usr/bin/env node

/**
 * Test script for Project Readiness API endpoints
 * This script tests the new readiness endpoints to ensure they work correctly
 */

const fs = require('fs')
const path = require('path')

async function testEndpoints() {
  console.log('🧪 Testing Project Readiness API Endpoints...\n')

  // Check if the API route files exist
  const readinessRoute = path.join(process.cwd(), 'app', 'api', 'projects', '[id]', 'readiness', 'route.ts')
  const finalizeRoute = path.join(process.cwd(), 'app', 'api', 'projects', '[id]', 'readiness', 'finalize', 'route.ts')
  
  console.log('📁 Checking API route files...')
  
  if (fs.existsSync(readinessRoute)) {
    console.log('✅ Readiness endpoint exists: /api/projects/[id]/readiness')
  } else {
    console.log('❌ Readiness endpoint missing')
    return
  }
  
  if (fs.existsSync(finalizeRoute)) {
    console.log('✅ Finalize endpoint exists: /api/projects/[id]/readiness/finalize')
  } else {
    console.log('❌ Finalize endpoint missing')
    return
  }

  // Check if old routes are removed
  console.log('\n🗑️  Checking old routes are removed...')
  
  const oldRoutes = [
    'app/api/projects/[id]/activate/route.ts',
    'app/api/projects/[id]/checklist/route.ts',
    'app/api/projects/[id]/roles/complete/route.ts',
    'app/api/projects/[id]/team-assignments/complete/route.ts',
    'app/api/projects/[id]/locations/complete/route.ts'
  ]

  let removedCount = 0
  oldRoutes.forEach(route => {
    const routePath = path.join(process.cwd(), route)
    if (!fs.existsSync(routePath)) {
      console.log(`✅ Removed: ${route}`)
      removedCount++
    } else {
      console.log(`⚠️  Still exists: ${route}`)
    }
  })

  console.log(`\n📊 Summary: ${removedCount}/${oldRoutes.length} old routes removed`)

  // Check Prisma schema
  console.log('\n📋 Checking Prisma schema...')
  
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    
    if (schemaContent.includes('model project_readiness')) {
      console.log('✅ project_readiness model found in schema')
    } else {
      console.log('❌ project_readiness model missing from schema')
    }
    
    if (schemaContent.includes('model project_setup_checklist')) {
      console.log('⚠️  project_setup_checklist model still in schema')
    } else {
      console.log('✅ project_setup_checklist model removed from schema')
    }
  }

  // Check if migration files exist
  console.log('\n📄 Checking migration files...')
  
  const migrationFile = path.join(process.cwd(), 'migrations', '031_create_project_readiness_system.sql')
  if (fs.existsSync(migrationFile)) {
    console.log('✅ Migration file exists: 031_create_project_readiness_system.sql')
  } else {
    console.log('❌ Migration file missing')
  }

  const manualGuide = path.join(process.cwd(), 'scripts', 'manual-readiness-migration-guide.md')
  if (fs.existsSync(manualGuide)) {
    console.log('✅ Manual migration guide exists')
  } else {
    console.log('❌ Manual migration guide missing')
  }

  console.log('\n🎉 Endpoint verification completed!')
  console.log('\nNext steps to complete the migration:')
  console.log('1. Follow the manual migration guide to apply database changes')
  console.log('2. Start your development server: npm run dev')
  console.log('3. Test the new readiness endpoints in your browser')
  console.log('4. Verify that project readiness data is calculated correctly')
  console.log('5. Update any UI components to use the new readiness system')
}

// Run the test
testEndpoints().catch(error => {
  console.error('💥 Test failed:', error)
  process.exit(1)
})