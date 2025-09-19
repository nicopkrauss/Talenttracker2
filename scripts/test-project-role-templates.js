#!/usr/bin/env node

/**
 * Test Project Role Templates Script
 * Tests that default role templates are created when a project is created
 */

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
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testProjectRoleTemplates() {
  console.log('🧪 Testing project role templates creation...\n')
  
  try {
    // Step 1: Get an admin user to create the project
    const { data: adminUser, error: adminError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (adminError || !adminUser) {
      console.error('❌ No admin user found:', adminError?.message)
      return
    }

    console.log(`👑 Using admin user: ${adminUser.full_name} (${adminUser.email})`)

    // Step 2: Create a test project
    const testProjectName = `Test Project ${Date.now()}`
    console.log(`\n📝 Creating test project: ${testProjectName}`)

    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: testProjectName,
        description: 'Test project for role template verification',
        production_company: 'Test Productions',
        hiring_contact: 'test@example.com',
        location: 'Test Location',
        start_date: '2024-02-01',
        end_date: '2024-02-28',
        status: 'prep',
        created_by: adminUser.id
      })
      .select()
      .single()

    if (projectError) {
      console.error('❌ Failed to create test project:', projectError.message)
      return
    }

    console.log(`✅ Created project: ${newProject.name} (ID: ${newProject.id})`)

    // Step 3: Wait a moment for triggers to execute
    console.log('\n⏳ Waiting for triggers to execute...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 4: Check if role templates were created
    console.log('\n🔍 Checking for automatically created role templates...')

    const { data: roleTemplates, error: templatesError } = await supabase
      .from('project_role_templates')
      .select('*')
      .eq('project_id', newProject.id)
      .order('sort_order')

    if (templatesError) {
      console.error('❌ Failed to fetch role templates:', templatesError.message)
      return
    }

    console.log(`📋 Found ${roleTemplates.length} role templates:`)

    if (roleTemplates.length === 0) {
      console.log('❌ No role templates were created automatically!')
      console.log('   The database trigger may not be working properly.')
    } else {
      roleTemplates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.display_name} (${template.role})`)
        console.log(`      💰 Pay Rate: $${template.base_pay_rate} ${template.time_type}`)
        console.log(`      📝 Description: ${template.description || 'No description'}`)
        console.log(`      ⭐ Default: ${template.is_default ? 'Yes' : 'No'}`)
        console.log(`      🔢 Sort Order: ${template.sort_order}`)
        console.log('')
      })
    }

    // Step 5: Verify expected roles are present
    const expectedRoles = ['supervisor', 'coordinator', 'talent_escort']
    const foundRoles = roleTemplates.map(t => t.role)
    const missingRoles = expectedRoles.filter(role => !foundRoles.includes(role))

    console.log('✅ VERIFICATION RESULTS:')
    console.log('========================')
    console.log(`📊 Expected roles: ${expectedRoles.length}`)
    console.log(`📊 Found roles: ${foundRoles.length}`)
    console.log(`✅ All roles present: ${missingRoles.length === 0 ? 'YES' : 'NO'}`)
    
    if (missingRoles.length > 0) {
      console.log(`❌ Missing roles: ${missingRoles.join(', ')}`)
    }

    // Check if all templates are marked as default
    const defaultTemplates = roleTemplates.filter(t => t.is_default)
    console.log(`⭐ Default templates: ${defaultTemplates.length}/${roleTemplates.length}`)

    // Step 6: Test the API endpoint to make sure it works end-to-end
    console.log('\n🌐 Testing API endpoint...')
    
    const apiTestProject = {
      name: `API Test Project ${Date.now()}`,
      description: 'Test project via API',
      production_company: 'API Test Productions',
      hiring_contact: 'api-test@example.com',
      project_location: 'API Test Location',
      start_date: '2024-03-01',
      end_date: '2024-03-31'
    }

    // Simulate API call (we can't easily test the actual API endpoint here)
    console.log('📝 Creating project via direct database insert (simulating API)...')
    
    const { data: apiProject, error: apiError } = await supabase
      .from('projects')
      .insert({
        name: apiTestProject.name,
        description: apiTestProject.description,
        production_company: apiTestProject.production_company,
        hiring_contact: apiTestProject.hiring_contact,
        location: apiTestProject.project_location,
        start_date: apiTestProject.start_date,
        end_date: apiTestProject.end_date,
        status: 'prep',
        created_by: adminUser.id
      })
      .select()
      .single()

    if (apiError) {
      console.error('❌ API test failed:', apiError.message)
    } else {
      console.log(`✅ API test project created: ${apiProject.name}`)
      
      // Wait and check templates
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: apiTemplates } = await supabase
        .from('project_role_templates')
        .select('role, display_name')
        .eq('project_id', apiProject.id)

      console.log(`📋 API project templates: ${apiTemplates?.length || 0}`)
    }

    // Step 7: Cleanup test projects
    console.log('\n🧹 Cleaning up test projects...')
    
    const { error: cleanup1Error } = await supabase
      .from('projects')
      .delete()
      .eq('id', newProject.id)

    const { error: cleanup2Error } = await supabase
      .from('projects')
      .delete()
      .eq('id', apiProject.id)

    if (cleanup1Error || cleanup2Error) {
      console.log('⚠️ Some cleanup errors occurred (this is normal)')
    } else {
      console.log('✅ Test projects cleaned up')
    }

    console.log('\n🎉 TEST COMPLETED!')
    
    if (missingRoles.length === 0 && roleTemplates.length === 3) {
      console.log('✅ SUCCESS: Default role templates are being created automatically!')
    } else {
      console.log('❌ ISSUE: Default role templates may not be working properly.')
      console.log('   Check the database trigger configuration.')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testProjectRoleTemplates().catch(console.error)