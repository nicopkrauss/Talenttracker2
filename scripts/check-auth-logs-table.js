const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase configuration in .env.local')
  console.log('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAuthLogsTable() {
  try {
    console.log('🔍 Checking auth_logs table...')
    
    // Try to query the table
    const { data, error } = await supabase
      .from('auth_logs')
      .select('*')
      .limit(1)
    
    if (error) {
      console.log('❌ auth_logs table does not exist:', error.message)
      
      // Try to create it manually
      console.log('🔧 Creating auth_logs table...')
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS auth_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            event_type TEXT NOT NULL CHECK (event_type IN (
                'login_attempt',
                'login_success', 
                'login_failure',
                'registration',
                'approval'
            )),
            email TEXT,
            user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            ip_address TEXT,
            details TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Simple index for querying recent events
        CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_auth_logs_type ON auth_logs(event_type, created_at DESC);

        -- RLS - only admins can view logs
        ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Admins can view auth logs" ON auth_logs
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'in_house')
                )
            );

        -- System can insert logs
        CREATE POLICY "System can insert auth logs" ON auth_logs
            FOR INSERT WITH CHECK (true);
      `
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
      
      if (createError) {
        console.log('❌ Failed to create table:', createError.message)
      } else {
        console.log('✅ auth_logs table created successfully')
      }
    } else {
      console.log('✅ auth_logs table exists')
      console.log('📊 Table structure confirmed')
    }
    
  } catch (err) {
    console.log('❌ Error:', err.message)
  }
}

checkAuthLogsTable()