const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTimecardTestData() {
  console.log('🧹 Starting timecard test data setup...');

  try {
    // Step 1: Delete all existing timecards
    console.log('📋 Deleting existing timecards...');
    
    // Delete daily entries first (foreign key constraint)
    const { error: dailyEntriesError } = await supabase
      .from('timecard_daily_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (dailyEntriesError) {
      console.error('Error deleting daily entries:', dailyEntriesError);
      throw dailyEntriesError;
    }

    // Delete timecard headers
    const { error: headersError } = await supabase
      .from('timecard_headers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (headersError) {
      console.error('Error deleting timecard headers:', headersError);
      throw headersError;
    }

    console.log('✅ All existing timecards deleted');

    // Step 2: Create the test project
    console.log('🏗️ Creating "The Timecard Test" project...');
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: 'The Timecard Test',
        production_company: 'Test Productions LLC',
        hiring_contact: 'test@example.com',
        location: 'Test Studio, Los Angeles, CA',
        description: 'Test project for timecard functionality validation',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'active',
        talent_expected: 25
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      throw projectError;
    }

    console.log(`✅ Project created with ID: ${project.id}`);

    // Step 3: Create default project locations
    console.log('📍 Creating project locations...');
    
    const locations = [
      { name: 'House', abbreviation: 'H', color: '#10B981', sort_order: 1, is_default: true },
      { name: 'Holding', abbreviation: 'HLD', color: '#F59E0B', sort_order: 2, is_default: false },
      { name: 'Stage', abbreviation: 'STG', color: '#EF4444', sort_order: 3, is_default: false }
    ];

    for (const location of locations) {
      const { error: locationError } = await supabase
        .from('project_locations')
        .insert({
          project_id: project.id,
          ...location
        });

      if (locationError) {
        console.error('Error creating location:', locationError);
        throw locationError;
      }
    }

    console.log('✅ Project locations created');

    // Step 4: Create project setup checklist
    console.log('📋 Creating project setup checklist...');
    
    const { error: checklistError } = await supabase
      .from('project_setup_checklist')
      .insert({
        project_id: project.id,
        roles_and_pay_completed: true,
        talent_roster_completed: true,
        team_assignments_completed: true,
        locations_completed: true,
        completed_at: new Date().toISOString()
      });

    if (checklistError) {
      console.error('Error creating checklist:', checklistError);
      throw checklistError;
    }

    // Step 5: Create role template for talent escorts
    console.log('👥 Creating role template...');
    
    const { error: roleError } = await supabase
      .from('project_role_templates')
      .insert({
        project_id: project.id,
        role: 'talent_escort',
        display_name: 'Talent Escort',
        base_pay_rate: 25.00,
        time_type: 'hourly',
        description: 'On-the-ground talent management',
        is_active: true,
        is_default: true,
        sort_order: 1
      });

    if (roleError) {
      console.error('Error creating role template:', roleError);
      throw roleError;
    }

    console.log('✅ Role template created');

    // Step 6: Get existing test users or create new ones
    console.log('👤 Getting test users...');
    
    // First, try to get existing users
    const { data: existingUsers, error: getUsersError } = await supabase
      .from('profiles')
      .select('*')
      .like('email', 'escort%@timecardtest.com')
      .eq('status', 'active')
      .limit(25);

    if (getUsersError) {
      console.error('Error getting existing users:', getUsersError);
      throw getUsersError;
    }

    let users = existingUsers || [];
    
    // If we don't have enough users, create more
    const usersNeeded = 25 - users.length;
    console.log(`Found ${users.length} existing users, need to create ${usersNeeded} more`);
    
    for (let i = users.length + 1; i <= 25; i++) {
      const email = `escort${i.toString().padStart(2, '0')}@timecardtest.com`;
      
      // Create auth user first
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: `Test Escort ${i.toString().padStart(2, '0')}`
        }
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          // User exists, try to get their profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();
          
          if (existingProfile) {
            users.push(existingProfile);
            console.log(`✅ Found existing user ${i}/25: ${existingProfile.full_name}`);
          }
        } else {
          console.error(`Error creating auth user ${i}:`, authError);
        }
        continue;
      }

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update the profile that was created by the trigger
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: `Test Escort ${i.toString().padStart(2, '0')}`,
          phone: `555-0${i.toString().padStart(3, '0')}`,
          status: 'active',
          nearest_major_city: 'Los Angeles',
          willing_to_fly: Math.random() > 0.5
        })
        .eq('id', authUser.user.id)
        .select()
        .single();

      if (profileError) {
        console.error(`Error updating profile ${i}:`, profileError);
        continue;
      }

      users.push(profile);
      console.log(`✅ Created user ${i}/25: ${profile.full_name}`);
    }

    console.log(`✅ Created ${users.length} test users`);

    // Step 7: Assign users to project as talent escorts
    console.log('🎯 Assigning users to project...');
    
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
        console.error(`Error assigning user ${user.full_name}:`, assignmentError);
      }
    }

    console.log('✅ All users assigned to project');

    // Step 8: Create 25 timecards (20 submitted, 5 drafts)
    console.log('⏰ Creating timecards...');
    
    const startDate = new Date('2024-09-16'); // Monday
    const endDate = new Date('2024-09-20');   // Friday
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const isDraft = i >= 20; // Last 5 are drafts
      
      // Create timecard header
      const { data: timecardHeader, error: headerError } = await supabase
        .from('timecard_headers')
        .insert({
          user_id: user.id,
          project_id: project.id,
          status: isDraft ? 'draft' : 'submitted',
          submitted_at: isDraft ? null : new Date().toISOString(),
          period_start_date: startDate.toISOString().split('T')[0],
          period_end_date: endDate.toISOString().split('T')[0],
          pay_rate: 25.00,
          total_hours: isDraft ? 0 : 40.00,
          total_break_duration: isDraft ? 0 : 2.50,
          total_pay: isDraft ? 0 : 1000.00
        })
        .select()
        .single();

      if (headerError) {
        console.error(`Error creating timecard header for ${user.full_name}:`, headerError);
        continue;
      }

      // Create daily entries for submitted timecards
      if (!isDraft) {
        for (let day = 0; day < 5; day++) {
          const workDate = new Date(startDate);
          workDate.setDate(startDate.getDate() + day);
          
          const { error: dailyError } = await supabase
            .from('timecard_daily_entries')
            .insert({
              timecard_header_id: timecardHeader.id,
              work_date: workDate.toISOString().split('T')[0],
              check_in_time: '08:00:00',
              check_out_time: '16:30:00',
              break_start_time: '12:00:00',
              break_end_time: '12:30:00',
              hours_worked: 8.00,
              break_duration: 0.50,
              daily_pay: 200.00
            });

          if (dailyError) {
            console.error(`Error creating daily entry for ${user.full_name}, day ${day + 1}:`, dailyError);
          }
        }
      }

      const status = isDraft ? 'DRAFT' : 'SUBMITTED';
      console.log(`✅ Created timecard ${i + 1}/25 for ${user.full_name} (${status})`);
    }

    console.log('🎉 Timecard test data setup complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Project: "${project.name}" (ID: ${project.id})`);
    console.log(`   - Users created: ${users.length}`);
    console.log(`   - Timecards created: ${users.length} (20 submitted, 5 drafts)`);
    console.log(`   - Period: ${startDate.toDateString()} - ${endDate.toDateString()}`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupTimecardTestData();