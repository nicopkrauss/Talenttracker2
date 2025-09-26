const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTeamAssignments() {
  console.log('🔧 Fixing team assignments...');

  try {
    // Get the latest "The Timecard Test" project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('name', 'The Timecard Test')
      .order('created_at', { ascending: false })
      .limit(1);

    if (projectError || !projects || projects.length === 0) {
      console.error('❌ Project not found:', projectError);
      return;
    }

    const project = projects[0];
    console.log(`✅ Project found: "${project.name}" (ID: ${project.id})`);

    // Get all test escort users and activate them
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .like('email', 'escort%@timecardtest.com');

    if (usersError) {
      console.error('❌ Error getting users:', usersError);
      return;
    }

    // Activate all test users
    const { error: activateError } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .like('email', 'escort%@timecardtest.com');

    if (activateError) {
      console.error('❌ Error activating users:', activateError);
    } else {
      console.log('✅ Activated all test users');
    }

    console.log(`✅ Found ${users.length} test users`);

    // Assign each user to the project
    for (const user of users) {
      const { error: assignmentError } = await supabase
        .from('team_assignments')
        .insert({
          user_id: user.id,
          project_id: project.id,
          role: 'talent_escort',
          pay_rate: 25.00,
          time_type: 'hourly'
        });

      if (assignmentError) {
        if (assignmentError.code === '23505') {
          console.log(`⚠️  User ${user.full_name} already assigned (skipping)`);
        } else {
          console.error(`❌ Error assigning user ${user.full_name}:`, assignmentError);
        }
      } else {
        console.log(`✅ Assigned ${user.full_name} to project`);
      }
    }

    console.log('🎉 Team assignments fixed!');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Run the fix
fixTeamAssignments();