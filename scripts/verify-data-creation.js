#!/usr/bin/env node

/**
 * Verify Data Creation Script
 * Checks that both staff and talent have been successfully created
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

async function verifyDataCreation() {
  console.log('🔍 Verifying data creation...\n')
  
  try {
    // Check staff (profiles) count
    const { count: staffCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    console.log(`👥 Staff Members: ${staffCount}`)

    // Get a few sample staff records
    const { data: sampleStaff, error: staffError } = await supabase
      .from('profiles')
      .select('full_name, email, role, nearest_major_city, willing_to_fly')
      .limit(5)

    if (staffError) {
      console.error('❌ Error fetching staff:', staffError.message)
    } else {
      console.log('📋 Sample Staff:')
      sampleStaff.forEach((staff, index) => {
        console.log(`   ${index + 1}. ${staff.full_name} (${staff.email}) - ${staff.role} from ${staff.nearest_major_city}`)
      })
    }

    console.log('')

    // Check talent count
    const { count: talentCount } = await supabase
      .from('talent')
      .select('*', { count: 'exact', head: true })

    console.log(`🎭 Talent Records: ${talentCount}`)

    // Get a few sample talent records
    const { data: sampleTalent, error: talentError } = await supabase
      .from('talent')
      .select('first_name, last_name, rep_name, rep_email, notes')
      .limit(5)

    if (talentError) {
      console.error('❌ Error fetching talent:', talentError.message)
    } else {
      console.log('📋 Sample Talent:')
      sampleTalent.forEach((talent, index) => {
        console.log(`   ${index + 1}. ${talent.first_name} ${talent.last_name} (Rep: ${talent.rep_name})`)
        console.log(`      📧 ${talent.rep_email}`)
        console.log(`      📝 ${talent.notes}`)
        console.log('')
      })
    }

    // Summary
    console.log('📊 VERIFICATION SUMMARY:')
    console.log('========================')
    console.log(`✅ Staff Members: ${staffCount}/50 ${staffCount >= 50 ? '(Complete!)' : '(Needs more)'}`)
    console.log(`✅ Talent Records: ${talentCount}/50 ${talentCount >= 50 ? '(Complete!)' : '(Needs more)'}`)
    
    if (staffCount >= 50 && talentCount >= 50) {
      console.log('\n🎉 SUCCESS! Both staff and talent data have been successfully created!')
      console.log('   Your database now has:')
      console.log(`   - ${staffCount} staff members with authentication accounts`)
      console.log(`   - ${talentCount} talent records with representative information`)
      console.log('\n🔑 IMPORTANT: All staff have temporary password: TempPassword123!')
      console.log('   They should reset their passwords on first login.')
    } else {
      console.log('\n⚠️  Some data is missing. You may need to run the creation scripts again.')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

verifyDataCreation().catch(console.error)