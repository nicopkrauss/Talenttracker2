const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  console.log('👥 Checking users...');

  try {
    // Get all users with timecard test emails
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .like('email', '%timecardtest.com%');

    if (usersError) {
      console.error('❌ Error getting users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} users with timecardtest.com emails:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.full_name} (${user.email}) - Status: ${user.status}`);
    });

    // Also check timecards to see which users have them
    const { data: timecards, error: timecardsError } = await supabase
      .from('timecard_headers')
      .select(`
        user_id,
        user:profiles!timecard_headers_user_id_fkey(full_name, email)
      `)
      .like('user.email', '%timecardtest.com%');

    if (timecardsError) {
      console.error('❌ Error getting timecards:', timecardsError);
    } else {
      console.log(`\n📋 Found ${timecards.length} timecards from test users:`);
      timecards.slice(0, 5).forEach((timecard, index) => {
        console.log(`   ${index + 1}. ${timecard.user?.full_name} (${timecard.user?.email})`);
      });
      if (timecards.length > 5) {
        console.log(`   ... and ${timecards.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkUsers();