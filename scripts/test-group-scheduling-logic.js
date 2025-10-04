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

async function testGroupSchedulingLogic() {
  try {
    console.log('🧪 Testing group scheduling logic...\n');
    
    const projectId = '08aaad7f-dc7d-47a4-8d48-c1297ea3bdc1';
    const dateStr = '2026-01-28';
    
    console.log(`📋 Testing with project: ${projectId}`);
    console.log(`📅 Testing with date: ${dateStr}\n`);
    
    // Test the first query - group_daily_assignments
    console.log('🔍 Checking group_daily_assignments...');
    const { data: groupAssignments, error: groupsError } = await supabase
      .from('group_daily_assignments')
      .select(`
        id,
        group_id,
        escort_id,
        group:group_id (
          id,
          group_name,
          display_order
        ),
        escort:escort_id (
          id,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .eq('assignment_date', dateStr);
    
    if (groupsError) {
      console.error('❌ Error:', groupsError);
    } else {
      console.log('📊 Group assignments found:', groupAssignments?.length || 0);
      if (groupAssignments && groupAssignments.length > 0) {
        console.table(groupAssignments);
      }
    }
    
    // Test the second query - talent_groups.scheduled_dates
    console.log('\n🔍 Checking talent_groups.scheduled_dates...');
    const { data: scheduledGroups, error: scheduledGroupsError } = await supabase
      .from('talent_groups')
      .select(`
        id,
        group_name,
        display_order,
        scheduled_dates
      `)
      .eq('project_id', projectId)
      .contains('scheduled_dates', [dateStr]);
    
    if (scheduledGroupsError) {
      console.error('❌ Error:', scheduledGroupsError);
    } else {
      console.log('📊 Scheduled groups found:', scheduledGroups?.length || 0);
      if (scheduledGroups && scheduledGroups.length > 0) {
        console.table(scheduledGroups);
      }
    }
    
    // Simulate the logic from the API
    console.log('\n🔧 Simulating API logic...');
    
    const groupAssignmentMap = new Map();
    
    // Add groups with assignments
    if (groupAssignments) {
      for (const assignment of groupAssignments) {
        const groupId = assignment.group_id;
        if (!groupAssignmentMap.has(groupId)) {
          groupAssignmentMap.set(groupId, []);
        }
        groupAssignmentMap.get(groupId).push({
          escortId: assignment.escort_id,
          escortName: assignment.escort?.full_name || ''
        });
      }
    }
    
    // Add scheduled groups without assignments
    const groupsWithAssignments = new Set(groupAssignmentMap.keys());
    if (scheduledGroups) {
      for (const group of scheduledGroups) {
        if (!groupsWithAssignments.has(group.id)) {
          groupAssignmentMap.set(group.id, []);
        }
      }
    }
    
    console.log(`📊 Total groups to process: ${groupAssignmentMap.size}`);
    
    // Process groups
    const assignments = [];
    groupAssignmentMap.forEach((escorts, groupId) => {
      // Find group info
      let groupInfo = groupAssignments?.find(ga => ga.group_id === groupId)?.group;
      if (!groupInfo) {
        const scheduledGroup = scheduledGroups?.find(sg => sg.id === groupId);
        if (scheduledGroup) {
          groupInfo = {
            id: scheduledGroup.id,
            group_name: scheduledGroup.group_name,
            display_order: scheduledGroup.display_order
          };
        }
      }
      
      if (groupInfo) {
        const assignedEscorts = escorts.filter(e => e.escortId !== null);
        const primaryEscort = assignedEscorts[0];
        
        const escortAssignments = assignedEscorts.length > 0 
          ? assignedEscorts.map(e => ({
              escortId: e.escortId || undefined,
              escortName: e.escortName || undefined
            }))
          : [{ escortId: undefined, escortName: undefined }];
        
        assignments.push({
          talentId: groupId,
          talentName: groupInfo.group_name,
          isGroup: true,
          escortId: primaryEscort?.escortId || undefined,
          escortName: primaryEscort?.escortName || undefined,
          escortAssignments,
          displayOrder: groupInfo.display_order || 0
        });
      }
    });
    
    console.log('\n🎉 Final assignments:');
    console.table(assignments);
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testGroupSchedulingLogic();