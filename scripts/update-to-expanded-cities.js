const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Your expanded list of major cities
const EXPANDED_MAJOR_CITIES = [
  'Atlanta, GA',
  'Austin, TX',
  'Baltimore, MD',
  'Boston, MA',
  'Charlotte, NC',
  'Chicago, IL',
  'Cleveland, OH',
  'Dallas, TX',
  'Denver, CO',
  'Detroit, MI',
  'Houston, TX',
  'Indianapolis, IN',
  'Kansas City, MO',
  'Las Vegas, NV',
  'Los Angeles, CA',
  'Miami, FL',
  'Minneapolis, MN',
  'Nashville, TN',
  'New Orleans, LA',
  'New York, NY',
  'Orlando, FL',
  'Philadelphia, PA',
  'Phoenix, AZ',
  'Portland, OR',
  'Salt Lake City, UT',
  'San Antonio, TX',
  'San Diego, CA',
  'San Francisco, CA',
  'Seattle, WA',
  'St. Louis, MO',
  'Tampa, FL',
  'Washington, DC'
];

async function updateToExpandedCities() {
  try {
    console.log('🔍 Checking profiles against expanded city list...');
    
    // Get all non-admin profiles
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

    // Check which profiles have cities not in the expanded list
    const profilesToUpdate = profiles.filter(profile => 
      profile.nearest_major_city && !EXPANDED_MAJOR_CITIES.includes(profile.nearest_major_city)
    );

    console.log(`📋 Found ${profilesToUpdate.length} profiles with cities not in expanded list:`);
    profilesToUpdate.forEach(profile => {
      console.log(`  - ${profile.full_name}: "${profile.nearest_major_city}"`);
    });

    if (profilesToUpdate.length === 0) {
      console.log('✅ All profiles already use cities from the expanded list!');
      
      // Show current distribution
      console.log('\n📊 Current city distribution:');
      const cityCounts = {};
      profiles.forEach(profile => {
        if (profile.nearest_major_city) {
          cityCounts[profile.nearest_major_city] = (cityCounts[profile.nearest_major_city] || 0) + 1;
        }
      });

      Object.entries(cityCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([city, count]) => {
          console.log(`  ${city}: ${count} profiles`);
        });

      return;
    }

    console.log('\n🔄 Updating profiles to use expanded city list...');

    // Update each profile with a random city from the expanded list
    const updates = [];
    for (const profile of profilesToUpdate) {
      const randomCity = EXPANDED_MAJOR_CITIES[Math.floor(Math.random() * EXPANDED_MAJOR_CITIES.length)];

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

    // Show final distribution
    console.log('\n📊 Final city distribution:');
    const { data: finalProfiles, error: finalError } = await supabase
      .from('profiles')
      .select('nearest_major_city')
      .not('role', 'in', '(admin,in_house)');

    if (!finalError && finalProfiles) {
      const cityCounts = {};
      finalProfiles.forEach(profile => {
        if (profile.nearest_major_city) {
          cityCounts[profile.nearest_major_city] = (cityCounts[profile.nearest_major_city] || 0) + 1;
        }
      });

      Object.entries(cityCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([city, count]) => {
          console.log(`  ${city}: ${count} profiles`);
        });
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the update
updateToExpandedCities();