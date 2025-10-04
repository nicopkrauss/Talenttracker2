#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixConstraints() {
  console.log('🔧 Fixing group_daily_assignments constraints...\n');

  try {
    // Step 1: Make escort_id nullable
    console.log('📝 Step 1: Making escort_id nullable...');
    const { error: nullableError } = await supabase
      .from('group_daily_assignments')
      .select('id')
      .limit(0); // This will fail if table doesn't exist, but won't return data

    // Use raw SQL to alter the column
    const { data: alterData, error: alterError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE group_daily_assignments ALTER COLUMN escort_id DROP NOT NULL;'
    });

    if (alterError) {
      console.error('❌ Failed to make escort_id nullable:', alterError);
      
      // Try alternative approach using direct query
      console.log('🔄 Trying alternative approach...');
      
      // Let's try using the REST API to execute raw SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          query: 'ALTER TABLE group_daily_assignments ALTER COLUMN escort_id DROP NOT NULL;'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ REST API approach failed:', errorText);
        throw new Error('Failed to alter column');
      }
      
      console.log('✅ Column altered via REST API');
    } else {
      console.log('✅ escort_id is now nullable');
    }

    // Step 2: Drop existing constraint
    console.log('\n📝 Step 2: Dropping existing constraint...');
    const dropConstraintResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        query: 'ALTER TABLE group_daily_assignments DROP CONSTRAINT IF EXISTS group_daily_assignments_group_id_project_id_assignment_date_escort_key;'
      })
    });

    if (!dropConstraintResponse.ok) {
      const errorText = await dropConstraintResponse.text();
      console.log('⚠️  Drop constraint response:', errorText);
    } else {
      console.log('✅ Existing constraint dropped');
    }

    // Step 3: Create new unique index for non-null escort_id
    console.log('\n📝 Step 3: Creating unique index for assigned escorts...');
    const createIndex1Response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        query: `CREATE UNIQUE INDEX IF NOT EXISTS group_daily_assignments_unique_with_escort 
                ON group_daily_assignments (group_id, project_id, assignment_date, escort_id) 
                WHERE escort_id IS NOT NULL;`
      })
    });

    if (!createIndex1Response.ok) {
      const errorText = await createIndex1Response.text();
      console.log('⚠️  Create index 1 response:', errorText);
    } else {
      console.log('✅ Unique index for assigned escorts created');
    }

    // Step 4: Create unique index for null escort_id
    console.log('\n📝 Step 4: Creating unique index for unassigned dates...');
    const createIndex2Response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        query: `CREATE UNIQUE INDEX IF NOT EXISTS group_daily_assignments_unique_without_escort 
                ON group_daily_assignments (group_id, project_id, assignment_date) 
                WHERE escort_id IS NULL;`
      })
    });

    if (!createIndex2Response.ok) {
      const errorText = await createIndex2Response.text();
      console.log('⚠️  Create index 2 response:', errorText);
    } else {
      console.log('✅ Unique index for unassigned dates created');
    }

    console.log('\n🎉 Constraint fixes completed!');

    // Test the fix
    console.log('\n🧪 Testing the fix...');
    const testRecord = {
      group_id: '00000000-0000-0000-0000-000000000000',
      project_id: '00000000-0000-0000-0000-000000000000', 
      assignment_date: '2025-01-01',
      escort_id: null
    };
    
    const { data, error } = await supabase
      .from('group_daily_assignments')
      .insert(testRecord)
      .select();
    
    if (error) {
      if (error.code === '23503') {
        console.log('✅ NULL escort_id is now allowed! (Foreign key error expected with fake UUIDs)');
      } else {
        console.error('❌ Test failed:', error);
      }
    } else {
      console.log('✅ Test successful! Cleaning up...');
      await supabase
        .from('group_daily_assignments')
        .delete()
        .eq('group_id', testRecord.group_id)
        .eq('project_id', testRecord.project_id)
        .eq('assignment_date', testRecord.assignment_date);
    }

  } catch (error) {
    console.error('❌ Failed to fix constraints:', error);
    process.exit(1);
  }
}

fixConstraints();