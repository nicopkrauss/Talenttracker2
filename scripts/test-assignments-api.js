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

async function testAssignmentsAPI() {
  try {
    console.log('🧪 Testing assignments API...\n');
    
    // Get a real project and check what groups are scheduled
    const { data: groups, error: groupsError } = await supabase
      .from('talent_groups')
      .select('id, project_id, group_name, scheduled_dates')
      .limit(1);
    
    if (groupsError || !groups || groups.length === 0) {
      console.error('❌ No talent groups found:', groupsError);
      return;
    }
    
    const group = groups[0];
    console.log('📋 Testing with group:', group);
    
    if (!group.scheduled_dates || group.scheduled_dates.length === 0) {
      console.log('⚠️  Group has no scheduled dates');
      return;
    }
    
    const testDate = group.scheduled_dates[0];
    console.log(`📅 Testing with date: ${testDate}`);
    
    // Test the assignments API endpoint
    console.log(`\n🔧 Making API call to get assignments for ${testDate}...`);
    
    const response = await fetch(`http://localhost:3001/api/projects/${group.project_id}/assignments/${testDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const responseText = await response.text();
    console.log(`\n📊 Response status: ${response.status}`);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n✅ API call successful!');
      console.log('\n📋 Assignments data:');
      console.log('Date:', data.data.date);
      console.log('Assignments count:', data.data.assignments.length);
      console.log('Floaters count:', data.data.floaters.length);
      
      // Check if our group is in the assignments
      const groupAssignment = data.data.assignments.find(a => a.isGroup && a.talentId === group.id);
      if (groupAssignment) {
        console.log('\n🎉 Group found in assignments!');
        console.log('Group assignment:', groupAssignment);
      } else {
        console.log('\n❌ Group NOT found in assignments');
        console.log('All assignments:', data.data.assignments);
      }
    } else {
      console.log('\n❌ API call failed');
      console.log('Response:', responseText);
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testAssignmentsAPI();