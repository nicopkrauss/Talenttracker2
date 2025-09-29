#!/usr/bin/env node

/**
 * Check RLS policies on timecard_audit_log table
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies on timecard_audit_log...')
  
  try {
    // Check if RLS is enabled
    console.log('\n1. Checking if RLS is enabled...')
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename = 'timecard_audit_log';
        `
      })
    
    if (rlsError) {
      console.log('⚠️  Could not check RLS status via rpc, trying direct query...')
      
      // Try a simpler approach - just query the table directly with service role
      const { data: testData, error: testError } = await supabase
        .from('timecard_audit_log')
        .select('count(*)', { count: 'exact', head: true })
      
      if (testError) {
        console.error('❌ Service role cannot access timecard_audit_log:', testError.message)
        console.error('   This suggests RLS is blocking even the service role')
      } else {
        console.log('✅ Service role can access timecard_audit_log')
      }
    } else {
      console.log('✅ RLS status check successful')
    }
    
    // Test with anon key (what the browser uses)
    console.log('\n2. Testing with anon key (browser context)...')
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: anonData, error: anonError } = await anonSupabase
      .from('timecard_audit_log')
      .select('count(*)', { count: 'exact', head: true })
    
    if (anonError) {
      console.error('❌ Anon key cannot access timecard_audit_log:', anonError.message)
      console.error('   Error details:', anonError)
      console.log('   This is likely the root cause - RLS policies are too restrictive')
    } else {
      console.log('✅ Anon key can access timecard_audit_log')
    }
    
    // Check specific timecard access
    console.log('\n3. Testing specific timecard access...')
    const timecardId = '50e3ac1d-fd71-4efb-b417-929e41dbeab3'
    
    const { data: specificData, error: specificError } = await anonSupabase
      .from('timecard_audit_log')
      .select('*')
      .eq('timecard_id', timecardId)
      .limit(1)
    
    if (specificError) {
      console.error('❌ Cannot access specific timecard audit logs:', specificError.message)
      console.error('   Error code:', specificError.code)
      console.error('   Error hint:', specificError.hint)
    } else {
      console.log(`✅ Can access specific timecard audit logs: ${specificData?.length || 0} entries`)
    }
    
    // Test the exact API call the component makes
    console.log('\n4. Testing exact API call...')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/timecard_audit_log?timecard_id=eq.${timecardId}&select=*,changed_by_profile:profiles!timecard_audit_log_changed_by_fkey(full_name)&order=changed_at.desc&limit=50`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('API Response Status:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Direct API call successful: ${data?.length || 0} entries`)
      } else {
        const errorText = await response.text()
        console.error('❌ Direct API call failed:', errorText)
      }
    } catch (apiError) {
      console.error('❌ API call error:', apiError.message)
    }
    
  } catch (error) {
    console.error('💥 RLS check failed:', error)
  }
}

checkRLSPolicies()
  .then(() => {
    console.log('\n✅ RLS policy check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Check script failed:', error)
    process.exit(1)
  })