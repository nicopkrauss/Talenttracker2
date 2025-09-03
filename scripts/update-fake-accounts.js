const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// List of major cities for random assignment
const majorCities = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
  'Seattle', 'Denver', 'Washington DC', 'Boston', 'El Paso', 'Nashville',
  'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville',
  'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento',
  'Kansas City', 'Mesa', 'Atlanta', 'Colorado Springs', 'Omaha', 'Raleigh',
  'Miami', 'Long Beach', 'Virginia Beach', 'Oakland', 'Minneapolis', 'Tampa',
  'Tulsa', 'Arlington', 'New Orleans'
];

// Available roles (excluding admin and in_house as requested)
const availableRoles = [
  'supervisor',
  'coordinator', 
  'talent_escort'
];

async function updateFakeAccounts() {
  try {
    console.log('🔍 Finding fake accounts to update...');
    
    // Get all profiles that don't have admin or in_house system roles
    // and are missing the required fields
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, nearest_major_city, willing_to_fly, role')
      .or('nearest_major_city.is.null,role.is.null');

    // Filter out admin and in_house roles on the client side to handle NULLs properly
    const filteredProfiles = profiles?.filter(profile => 
      profile.role !== 'admin' && profile.role !== 'in_house'
    ) || [];

    if (fetchError) {
      console.error('❌ Error fetching profiles:', fetchError);
      return;
    }

    if (!filteredProfiles || filteredProfiles.length === 0) {
      console.log('✅ No profiles found that need updating');
      return;
    }

    console.log(`📋 Found ${filteredProfiles.length} profiles to update:`);
    filteredProfiles.forEach(profile => {
      console.log(`  - ${profile.full_name} (${profile.email})`);
      console.log(`    Current: city=${profile.nearest_major_city}, fly=${profile.willing_to_fly}, role=${profile.role}`);
    });

    console.log('\n🔄 Updating profiles...');

    // Update each profile with random values
    const updates = [];
    for (const profile of filteredProfiles) {
      const randomCity = majorCities[Math.floor(Math.random() * majorCities.length)];
      const randomWillingToFly = Math.random() > 0.5; // 50/50 chance
      const randomRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];

      const updateData = {};
      
      // Only update fields that are null
      if (!profile.nearest_major_city) {
        updateData.nearest_major_city = randomCity;
      }
      
      if (profile.willing_to_fly === null) {
        updateData.willing_to_fly = randomWillingToFly;
      }
      
      if (!profile.role) {
        updateData.role = randomRole;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString();
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);

        if (updateError) {
          console.error(`❌ Error updating ${profile.full_name}:`, updateError);
        } else {
          console.log(`✅ Updated ${profile.full_name}:`);
          if (updateData.nearest_major_city) console.log(`    City: ${updateData.nearest_major_city}`);
          if (updateData.willing_to_fly !== undefined) console.log(`    Willing to fly: ${updateData.willing_to_fly}`);
          if (updateData.role) console.log(`    Role: ${updateData.role}`);
          updates.push(profile.id);
        }
      } else {
        console.log(`⏭️  Skipped ${profile.full_name} - all fields already set`);
      }
    }

    console.log(`\n🎉 Successfully updated ${updates.length} profiles`);

    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const { data: updatedProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name, email, nearest_major_city, willing_to_fly, role')
      .in('id', updates);

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError);
      return;
    }

    console.log('\n📊 Updated profiles summary:');
    updatedProfiles.forEach(profile => {
      console.log(`  ✓ ${profile.full_name}`);
      console.log(`    City: ${profile.nearest_major_city}`);
      console.log(`    Willing to fly: ${profile.willing_to_fly}`);
      console.log(`    Role: ${profile.role}`);
      console.log('');
    });

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the update
updateFakeAccounts();