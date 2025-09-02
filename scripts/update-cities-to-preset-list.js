const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Exact list from the registration form
const MAJOR_CITIES = [
  'Atlanta, GA',
  'Austin, TX',
  'Boston, MA',
  'Charlotte, NC',
  'Chicago, IL',
  'Dallas, TX',
  'Denver, CO',
  'Detroit, MI',
  'Houston, TX',
  'Las Vegas, NV',
  'Los Angeles, CA',
  'Miami, FL',
  'Nashville, TN',
  'New York, NY',
  'Orlando, FL',
  'Philadelphia, PA',
  'Phoenix, AZ',
  'Portland, OR',
  'San Diego, CA',
  'San Francisco, CA',
  'Seattle, WA',
  'Washington, DC'
];

async function updateCitiesToPresetList() {
  try {
    console.log('🔍 Finding profiles with non-compliant cities...');
    
    // Get all profiles that don't have admin or in_house system roles
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, nearest_major_city, role')
      .not('role', 'in', '(admin,in_house)');

    if (fetchError) {
      console.error('❌ Error fetching profiles:', fetchError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('📭 No profiles found');
      return;
    }

    // Find profiles that need updating (cities not in the preset list)
    const profilesToUpdate = profiles.filter(profile => 
      profile.nearest_major_city && !MAJOR_CITIES.includes(profile.nearest_major_city)
    );

    console.log(`📋 Found ${profilesToUpdate.length} profiles with non-compliant cities:`);
    profilesToUpdate.forEach(profile => {
      console.log(`  - ${profile.full_name}: "${profile.nearest_major_city}"`);
    });

    if (profilesToUpdate.length === 0) {
      console.log('✅ All profiles already have compliant cities!');
      return;
    }

    console.log('\n🔄 Updating profiles to use preset cities...');

    // Update each profile with a random city from the preset list
    const updates = [];
    for (const profile of profilesToUpdate) {
      const randomCity = MAJOR_CITIES[Math.floor(Math.random() * MAJOR_CITIES.length)];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nearest_major_city: randomCity,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error(`❌ Error updating ${profile.full_name}:`, updateError);
      } else {
        console.log(`✅ Updated ${profile.full_name}: "${profile.nearest_major_city}" → "${randomCity}"`);
        updates.push(profile.id);
      }
    }

    console.log(`\n🎉 Successfully updated ${updates.length} profiles`);

    // Verify the updates
    console.log('\n🔍 Verifying all profiles now have compliant cities...');
    const { data: allProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name, nearest_major_city, role')
      .not('role', 'in', '(admin,in_house)');

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError);
      return;
    }

    const nonCompliantAfterUpdate = allProfiles.filter(profile => 
      profile.nearest_major_city && !MAJOR_CITIES.includes(profile.nearest_major_city)
    );

    if (nonCompliantAfterUpdate.length === 0) {
      console.log('✅ All profiles now have compliant cities!');
      
      // Show city distribution
      console.log('\n📊 City distribution:');
      const cityCounts = {};
      allProfiles.forEach(profile => {
        if (profile.nearest_major_city) {
          cityCounts[profile.nearest_major_city] = (cityCounts[profile.nearest_major_city] || 0) + 1;
        }
      });

      Object.entries(cityCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([city, count]) => {
          console.log(`  ${city}: ${count} profiles`);
        });

    } else {
      console.log(`❌ Still have ${nonCompliantAfterUpdate.length} non-compliant profiles:`);
      nonCompliantAfterUpdate.forEach(profile => {
        console.log(`  - ${profile.full_name}: "${profile.nearest_major_city}"`);
      });
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the update
updateCitiesToPresetList();