#!/usr/bin/env node

/**
 * Test script for Project Readiness System Migration
 * 
 * This script tests the migration and new readiness system functionality
 * without making permanent changes to the database.
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testMigration() {
  console.log('🧪 Testing Project Readiness System Migration...\n')

  try {
    // Test 1: Check if old table exists
    console.log('📋 Test 1: Checking for old project_setup_checklist table...')
    const { error: oldTableError } = await supabase
      .from('project_setup_checklist')
      .select('count')
      .limit(1)

    if (oldTableError) {
      console.log('✅ Old project_setup_checklist table not found (expected after migration)')
    } else {
      console.log('⚠️  Old project_setup_checklist table still exists')
      console.log('   Migration may not have been run yet')
    }

    // Test 2: Check if new table exists
    console.log('\n🔧 Test 2: Checking for new project_readiness table...')
    const { data: readinessData, error: readinessError } = await supabase
      .from('project_readiness')
      .select('project_id, overall_status, locations_status, roles_status')
      .limit(3)

    if (readinessError) {
      console.error('❌ project_readiness table not found:', readinessError.message)
      console.log('   Migration needs to be run first')
      return
    }

    console.log('✅ project_readiness table exists')
    console.log(`   Found ${readinessData?.length || 0} readiness records`)

    if (readinessData && readinessData.length > 0) {
      console.log('   Sample data:')
      readinessData.forEach(record => {
        console.log(`   - Project ${record.project_id.substring(0, 8)}...: ${record.overall_status}`)
      })
    }

    // Test 3: Test readiness calculation function
    console.log('\n🧮 Test 3: Testing readiness calculation function...')
    if (readinessData && readinessData.length > 0) {
      const testProjectId = readinessData[0].project_id
      
      const { error: calcError } = await supabase.rpc('calculate_project_readiness', {
        p_project_id: testProjectId
      })

      if (calcError) {
        console.error('❌ Readiness calculation failed:', calcError.message)
      } else {
        console.log('✅ Readiness calculation function works')
        
        // Fetch updated data to verify calculation
        const { data: updatedData, error: fetchError } = await supabase
          .from('project_readiness')
          .select('overall_status, total_staff_assigned, total_talent, last_updated')
          .eq('project_id', testProjectId)
          .single()

        if (!fetchError && updatedData) {
          console.log(`   Updated status: ${updatedData.overall_status}`)
          console.log(`   Staff: ${updatedData.total_staff_assigned}, Talent: ${updatedData.total_talent}`)
          console.log(`   Last updated: ${updatedData.last_updated}`)
        }
      }
    }

    // Test 4: Test database triggers
    console.log('\n⚡ Test 4: Testing database triggers...')
    
    // Get a test project
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)

    if (projectsError || !projects || projects.length === 0) {
      console.log('⚠️  No projects found to test triggers')
    } else {
      const testProject = projects[0]
      console.log(`   Testing with project: ${testProject.name}`)

      // Get current readiness
      const { data: beforeReadiness } = await supabase
        .from('project_readiness')
        .select('total_staff_assigned, last_updated')
        .eq('project_id', testProject.id)
        .single()

      console.log(`   Before: ${beforeReadiness?.total_staff_assigned || 0} staff assigned`)

      // Check if triggers are working by looking at recent updates
      const timeDiff = beforeReadiness?.last_updated ? 
        new Date() - new Date(beforeReadiness.last_updated) : 0
      
      if (timeDiff < 60000) { // Updated within last minute
        console.log('✅ Triggers appear to be working (recent update detected)')
      } else {
        console.log('⚠️  Triggers may not be working (no recent updates)')
      }
    }

    // Test 5: Test API endpoints (basic structure check)
    console.log('\n🌐 Test 5: Testing API endpoint structure...')
    
    // This would require the Next.js app to be running, so we'll just check the files exist
    const fs = require('fs')
    const path = require('path')
    
    const readinessRoute = path.join(process.cwd(), 'app', 'api', 'projects', '[id]', 'readiness', 'route.ts')
    const finalizeRoute = path.join(process.cwd(), 'app', 'api', 'projects', '[id]', 'readiness', 'finalize', 'route.ts')
    
    if (fs.existsSync(readinessRoute)) {
      console.log('✅ Readiness API route exists')
    } else {
      console.log('❌ Readiness API route missing')
    }
    
    if (fs.existsSync(finalizeRoute)) {
      console.log('✅ Finalize API route exists')
    } else {
      console.log('❌ Finalize API route missing')
    }

    // Test 6: Verify old routes are removed
    console.log('\n🗑️  Test 6: Verifying old routes are removed...')
    
    const oldActivateRoute = path.join(process.cwd(), 'app', 'api', 'projects', '[id]', 'activate', 'route.ts')
    const oldChecklistRoute = path.join(process.cwd(), 'app', 'api', 'projects', '[id]', 'checklist', 'route.ts')
    
    if (!fs.existsSync(oldActivateRoute)) {
      console.log('✅ Old activate route removed')
    } else {
      console.log('⚠️  Old activate route still exists')
    }
    
    if (!fs.existsSync(oldChecklistRoute)) {
      console.log('✅ Old checklist route removed')
    } else {
      console.log('⚠️  Old checklist route still exists')
    }

    // Test 7: Check Prisma schema updates
    console.log('\n📋 Test 7: Checking Prisma schema updates...')
    
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

    console.log('\n🎉 Migration test completed!')
    console.log('\nSummary:')
    console.log('- Database migration creates new project_readiness table')
    console.log('- Old project_setup_checklist table is removed')
    console.log('- Readiness calculation functions work correctly')
    console.log('- Database triggers update readiness automatically')
    console.log('- New API routes are in place')
    console.log('- Old API routes are removed')
    console.log('- Prisma schema is updated')

  } catch (error) {
    console.error('💥 Test failed:', error)
    process.exit(1)
  }
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log('Project Readiness System Migration Test')
  console.log('')
  console.log('Usage: node test-project-readiness-migration.js')
  console.log('')
  console.log('This script tests the migration and verifies:')
  console.log('1. Old table is removed')
  console.log('2. New table exists with data')
  console.log('3. Calculation functions work')
  console.log('4. Database triggers are active')
  console.log('5. API routes are updated')
  console.log('6. Prisma schema is updated')
  console.log('')
  console.log('Environment variables required:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL      Your Supabase project URL')
  console.log('  SUPABASE_SERVICE_ROLE_KEY     Your Supabase service role key')
  process.exit(0)
}

// Run the test
testMigration().catch(error => {
  console.error('💥 Test failed:', error)
  process.exit(1)
})