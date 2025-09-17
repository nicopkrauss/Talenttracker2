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
  console.error('❌ Missing Supabase configuration in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const sql = `
-- Create function to manually refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_readiness_materialized_view()
RETURNS VOID AS $$
BEGIN
  -- Use concurrent refresh to avoid locking
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_readiness_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_readiness_materialized_view() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION refresh_readiness_materialized_view() IS 'Manually refresh the project readiness materialized view for API invalidation requests';
`

async function addRefreshFunction() {
  try {
    console.log('🚀 Adding refresh function...')
    
    // Try to execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('❌ Failed to add refresh function:', error.message)
      process.exit(1)
    }
    
    console.log('✅ Refresh function added successfully')
    
    // Test the function
    console.log('🧪 Testing the function...')
    const { error: testError } = await supabase.rpc('refresh_readiness_materialized_view')
    
    if (testError) {
      console.error('❌ Function test failed:', testError.message)
      process.exit(1)
    }
    
    console.log('✅ Function test passed')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

addRefreshFunction()