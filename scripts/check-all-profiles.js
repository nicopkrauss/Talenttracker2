const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllProfiles() {
  try {
    console.log('🔍 Checking all profiles in the database...\n');
    
    // Get all profiles
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, nearest_major_city, willing_to_fly, role, status, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching profiles:', fetchError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('📭 No profiles found in database');
      return;
    }

    console.log(`📊 Total profiles found: ${profiles.length}\n`);

    // Categorize profiles
    const adminProfiles = profiles.filter(p => p.role === 'admin');
    const inHouseProfiles = profiles.filter(p => p.role === 'in_house');
    const regularProfiles = profiles.filter(p => !p.role || !['admin', 'in_house'].includes(p.role));
    const incompleteProfiles = regularProfiles.filter(p => 
      !p.nearest_major_city || p.willing_to_fly === null || !p.role
    );

    console.log('🏢 ADMIN PROFILES:');
    if (adminProfiles.length === 0) {
      console.log('  None found\n');
    } else {
      adminProfiles.forEach(profile => {
        console.log(`  ✓ ${profile.full_name} (${profile.email})`);
        console.log(`    Status: ${profile.status}, Created: ${new Date(profile.created_at).toLocaleDateString()}`);
      });
      console.log('');
    }

    console.log('🏠 IN-HOUSE PROFILES:');
    if (inHouseProfiles.length === 0) {
      console.log('  None found\n');
    } else {
      inHouseProfiles.forEach(profile => {
        console.log(`  ✓ ${profile.full_name} (${profile.email})`);
        console.log(`    Status: ${profile.status}, Created: ${new Date(profile.created_at).toLocaleDateString()}`);
      });
      console.log('');
    }

    console.log('👥 REGULAR USER PROFILES:');
    if (regularProfiles.length === 0) {
      console.log('  None found\n');
    } else {
      regularProfiles.forEach(profile => {
        const isComplete = profile.nearest_major_city && profile.willing_to_fly !== null && profile.role;
        const status = isComplete ? '✅' : '❌';
        
        console.log(`  ${status} ${profile.full_name} (${profile.email})`);
        console.log(`    Role: ${profile.role || 'NULL'}`);
        console.log(`    City: ${profile.nearest_major_city || 'NULL'}`);
        console.log(`    Willing to fly: ${profile.willing_to_fly !== null ? profile.willing_to_fly : 'NULL'}`);
        console.log(`    Status: ${profile.status}, Created: ${new Date(profile.created_at).toLocaleDateString()}`);
        console.log('');
      });
    }

    console.log('📋 SUMMARY:');
    console.log(`  Total profiles: ${profiles.length}`);
    console.log(`  Admin profiles: ${adminProfiles.length}`);
    console.log(`  In-house profiles: ${inHouseProfiles.length}`);
    console.log(`  Regular profiles: ${regularProfiles.length}`);
    console.log(`  Incomplete regular profiles: ${incompleteProfiles.length}`);

    if (incompleteProfiles.length > 0) {
      console.log('\n⚠️  PROFILES NEEDING UPDATES:');
      incompleteProfiles.forEach(profile => {
        const missing = [];
        if (!profile.nearest_major_city) missing.push('city');
        if (profile.willing_to_fly === null) missing.push('willing_to_fly');
        if (!profile.role) missing.push('role');
        
        console.log(`  - ${profile.full_name}: Missing ${missing.join(', ')}`);
      });
    } else {
      console.log('\n✅ All regular profiles are complete!');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the check
checkAllProfiles();