const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateProfileSummary() {
  try {
    console.log('📊 Generating profile summary...\n');
    
    // Get all regular profiles (non-admin)
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, nearest_major_city, willing_to_fly, role, status')
      .not('role', 'in', '(admin,in_house)')
      .order('role');

    if (fetchError) {
      console.error('❌ Error fetching profiles:', fetchError);
      return;
    }

    // Count by role
    const roleCounts = {};
    const cityCounts = {};
    const flyingCounts = { willing: 0, not_willing: 0 };
    const statusCounts = {};

    profiles.forEach(profile => {
      // Role counts
      roleCounts[profile.role] = (roleCounts[profile.role] || 0) + 1;
      
      // City counts
      cityCounts[profile.nearest_major_city] = (cityCounts[profile.nearest_major_city] || 0) + 1;
      
      // Flying willingness
      if (profile.willing_to_fly) {
        flyingCounts.willing++;
      } else {
        flyingCounts.not_willing++;
      }
      
      // Status counts
      statusCounts[profile.status] = (statusCounts[profile.status] || 0) + 1;
    });

    console.log('🎭 ROLE DISTRIBUTION:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      const percentage = ((count / profiles.length) * 100).toFixed(1);
      console.log(`  ${role}: ${count} (${percentage}%)`);
    });

    console.log('\n🌍 TOP CITIES:');
    const sortedCities = Object.entries(cityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedCities.forEach(([city, count]) => {
      console.log(`  ${city}: ${count} profiles`);
    });

    console.log('\n✈️ FLIGHT WILLINGNESS:');
    console.log(`  Willing to fly: ${flyingCounts.willing} (${((flyingCounts.willing / profiles.length) * 100).toFixed(1)}%)`);
    console.log(`  Not willing to fly: ${flyingCounts.not_willing} (${((flyingCounts.not_willing / profiles.length) * 100).toFixed(1)}%)`);

    console.log('\n📋 STATUS DISTRIBUTION:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = ((count / profiles.length) * 100).toFixed(1);
      console.log(`  ${status}: ${count} (${percentage}%)`);
    });

    console.log(`\n📈 TOTAL REGULAR PROFILES: ${profiles.length}`);

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the summary
generateProfileSummary();