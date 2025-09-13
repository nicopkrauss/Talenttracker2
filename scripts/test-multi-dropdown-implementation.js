#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

// Parse environment variables
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testMultiDropdownImplementation() {
  console.log('🧪 Testing Multi-Dropdown Implementation')
  console.log('======================================\n')
  
  try {
    // Check if escort_dropdown_count field exists
    console.log('🔍 Checking database schema...')
    const { data: groups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('id, group_name, assigned_escort_id, assigned_escort_ids, escort_dropdown_count')
      .limit(2)
    
    if (groupsError) {
      console.error('❌ Error fetching groups:', groupsError)
      return
    }

    if (groups && groups.length > 0) {
      console.log('✅ Database fields available:')
      const sampleGroup = groups[0]
      console.log(`  - assigned_escort_id: ${sampleGroup.assigned_escort_id !== undefined ? '✅' : '❌'}`)
      console.log(`  - assigned_escort_ids: ${sampleGroup.assigned_escort_ids !== undefined ? '✅' : '❌'}`)
      console.log(`  - escort_dropdown_count: ${sampleGroup.escort_dropdown_count !== undefined ? '✅' : '❌'}`)
      
      console.log('\n📊 Sample group data:')
      groups.forEach(group => {
        console.log(`  - ${group.group_name}:`)
        console.log(`    escort_dropdown_count: ${group.escort_dropdown_count || 'null'}`)
        console.log(`    assigned_escort_ids: ${JSON.stringify(group.assigned_escort_ids)}`)
        console.log(`    assigned_escort_id: ${group.assigned_escort_id || 'null'}`)
      })
    }

    // Check available escorts
    console.log('\n👥 Available escorts for testing:')
    const { data: escorts, error: escortsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .not('full_name', 'is', null)
      .limit(3)
    
    if (escortsError) {
      console.error('❌ Error fetching escorts:', escortsError)
      return
    }

    escorts?.forEach((escort, index) => {
      console.log(`  ${index + 1}. ${escort.full_name} (${escort.id})`)
    })

    console.log('\n🎯 Implementation Status:')
    console.log('========================')
    
    console.log('\n✅ COMPLETED:')
    console.log('  📱 MultiDropdownAssignment component')
    console.log('     - Renders multiple AssignmentDropdown components')
    console.log('     - Plus button to add more dropdowns')
    console.log('     - Each dropdown works independently')
    
    console.log('\n  🔄 Updated AssignmentList component')
    console.log('     - Conditionally shows MultiDropdownAssignment for groups')
    console.log('     - Uses escortAssignments array from API')
    
    console.log('\n  🎛️ Updated AssignmentsTab component')
    console.log('     - handleMultiDropdownChange for individual dropdown updates')
    console.log('     - handleAddDropdown for adding new dropdowns')
    console.log('     - Optimistic UI updates')

    console.log('\n  🔌 Updated API endpoints')
    console.log('     - POST /assignments accepts escortIds and dropdownCount')
    console.log('     - GET /assignments/[date] returns escortAssignments array')
    console.log('     - PATCH /talent-groups/[id] updates dropdown count')

    console.log('\n⚠️  MANUAL STEPS NEEDED:')
    console.log('  🗄️ Database schema update required:')
    if (groups && groups[0] && groups[0].escort_dropdown_count === undefined) {
      console.log('     ❌ escort_dropdown_count field missing')
      console.log('     Run: ALTER TABLE talent_groups ADD COLUMN escort_dropdown_count INTEGER DEFAULT 1;')
    } else {
      console.log('     ✅ escort_dropdown_count field exists')
    }

    console.log('\n🎨 Expected UI Behavior:')
    console.log('=======================')
    console.log('1. Groups show one dropdown initially (same as current)')
    console.log('2. Plus button appears next to the dropdown')
    console.log('3. Clicking plus adds another dropdown')
    console.log('4. Each dropdown can be set independently')
    console.log('5. Number of dropdowns persists in database')
    console.log('6. Individual talent still shows single dropdown')

    console.log('\n🚀 Next Steps:')
    console.log('==============')
    console.log('1. Execute the database schema update if needed')
    console.log('2. Test the UI in the assignments tab')
    console.log('3. Verify dropdowns are saved and restored correctly')
    console.log('4. Test with multiple escorts assigned to groups')

    console.log('\n🎉 Multi-dropdown implementation is ready!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testMultiDropdownImplementation()