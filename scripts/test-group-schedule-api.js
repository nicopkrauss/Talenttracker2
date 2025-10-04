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

async function testGroupScheduleAPI() {
  try {
    console.log('🧪 Testing group schedule API...\n');
    
    // First, get a real project and group ID from the database
    const { data: groups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('id, project_id, group_name')
      .limit(1);
    
    if (groupsError || !groups || groups.length === 0) {
      console.error('❌ No talent groups found:', groupsError);
      return;
    }
    
    const group = groups[0];
    console.log('📋 Testing with group:', group);
    
    // Test the API endpoint
    const testDates = ['2026-01-28', '2026-01-29'];
    
    console.log(`\n🔧 Making API call to update schedule for group ${group.id}...`);
    console.log(`📅 Test dates: ${testDates.join(', ')}`);
    
    const response = await fetch(`http://localhost:3001/api/projects/${group.project_id}/talent-groups/${group.id}/schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        scheduledDates: testDates
      })
    });
    
    const responseText = await response.text();
    console.log(`\n📊 Response status: ${response.status}`);
    console.log('📊 Response body:', responseText);
    
    if (response.ok) {
      console.log('\n✅ API call successful!');
      
      // Verify the data was updated in the database
      const { data: updatedGroup, error: fetchError } = await supabase
        .from('talent_groups')
        .select('id, group_name, scheduled_dates')
        .eq('id', group.id)
        .single();
      
      if (fetchError) {
        console.error('❌ Error fetching updated group:', fetchError);
      } else {
        console.log('\n📋 Updated group data:');
        console.table([updatedGroup]);
      }
    } else {
      console.log('\n❌ API call failed');
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testGroupScheduleAPI();