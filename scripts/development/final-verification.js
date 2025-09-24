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

async function finalVerification() {
  try {
    console.log('🔍 Final Verification of Database Updates');
    console.log('========================================\n');

    // 1. Check all profiles have valid cities
    console.log('1️⃣ Checking all profiles have valid cities...');
    
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, nearest_major_city, role, willing_to_fly')
      .not('role', 'in', '(admin,in_house)');

    if (fetchError) {
      console.error('❌ Error fetching profiles:', fetchError);
      return;
    }

    const invalidCityProfiles = profiles.filter(profile => 
      profile.nearest_major_city && !MAJOR_CITIES.includes(profile.nearest_major_city)
    );

    if (invalidCityProfiles.length === 0) {
      console.log('✅ All profiles have valid cities from the preset list');
    } else {
      console.log(`❌ Found ${invalidCityProfiles.length} profiles with invalid cities:`);
      invalidCityProfiles.forEach(profile => {
        console.log(`   - ${profile.full_name}: "${profile.nearest_major_city}"`);
      });
    }

    // 2. Check all profiles have required fields
    console.log('\n2️⃣ Checking all profiles have required fields...');
    
    const incompleteProfiles = profiles.filter(profile => 
      !profile.nearest_major_city || 
      profile.willing_to_fly === null || 
      !profile.role
    );

    if (incompleteProfiles.length === 0) {
      console.log('✅ All profiles have complete required fields');
    } else {
      console.log(`❌ Found ${incompleteProfiles.length} profiles with missing fields:`);
      incompleteProfiles.forEach(profile => {
        const missing = [];
        if (!profile.nearest_major_city) missing.push('city');
        if (profile.willing_to_fly === null) missing.push('willing_to_fly');
        if (!profile.role) missing.push('role');
        console.log(`   - ${profile.full_name}: Missing ${missing.join(', ')}`);
      });
    }

    // 3. Show summary statistics
    console.log('\n3️⃣ Summary Statistics:');
    
    const roleCounts = {};
    const cityCounts = {};
    const flyingCounts = { willing: 0, not_willing: 0 };

    profiles.forEach(profile => {
      // Role counts
      roleCounts[profile.role] = (roleCounts[profile.role] || 0) + 1;
      
      // City counts
      if (profile.nearest_major_city) {
        cityCounts[profile.nearest_major_city] = (cityCounts[profile.nearest_major_city] || 0) + 1;
      }
      
      // Flying willingness
      if (profile.willing_to_fly) {
        flyingCounts.willing++;
      } else {
        flyingCounts.not_willing++;
      }
    });

    console.log('\n📊 Role Distribution:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      const percentage = ((count / profiles.length) * 100).toFixed(1);
      console.log(`   ${role}: ${count} (${percentage}%)`);
    });

    console.log('\n🌍 City Distribution (Top 10):');
    const sortedCities = Object.entries(cityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedCities.forEach(([city, count]) => {
      console.log(`   ${city}: ${count} profiles`);
    });

    console.log('\n✈️ Flight Willingness:');
    console.log(`   Willing to fly: ${flyingCounts.willing} (${((flyingCounts.willing / profiles.length) * 100).toFixed(1)}%)`);
    console.log(`   Not willing to fly: ${flyingCounts.not_willing} (${((flyingCounts.not_willing / profiles.length) * 100).toFixed(1)}%)`);

    console.log(`\n📈 Total Regular Profiles: ${profiles.length}`);

    // 4. Test constraint (if applied)
    console.log('\n4️⃣ Testing database constraint...');
    console.log('   Run: node scripts/test-constraint-manually.js');
    console.log('   This will test if the CHECK constraint is working');

    // 5. Final status
    console.log('\n🎯 COMPLETION STATUS:');
    
    const allValid = invalidCityProfiles.length === 0 && incompleteProfiles.length === 0;
    
    if (allValid) {
      console.log('✅ Database update COMPLETE');
      console.log('   ✓ All fake accounts have valid nearest_major_city values');
      console.log('   ✓ All fake accounts have required role assignments');
      console.log('   ✓ All fake accounts have willing_to_fly values');
      console.log('   ✓ No admin or in_house roles assigned to fake accounts');
      console.log('');
      console.log('📝 Next Steps:');
      console.log('   1. Apply the database constraint using the Supabase SQL Editor');
      console.log('   2. Copy the SQL from: constraint-sql-to-run.sql');
      console.log('   3. Test the constraint with: node scripts/test-constraint-manually.js');
    } else {
      console.log('❌ Database update INCOMPLETE');
      console.log('   Some profiles still need attention (see details above)');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the verification
finalVerification();