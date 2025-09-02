const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConstraintManually() {
  try {
    console.log('🧪 Testing if we can insert invalid city values...');
    
    // Try to update a real profile with an invalid city
    // First, get a profile to test with
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, nearest_major_city')
      .limit(1);

    if (fetchError || !profiles || profiles.length === 0) {
      console.error('❌ Could not fetch a profile for testing:', fetchError);
      return;
    }

    const testProfile = profiles[0];
    const originalCity = testProfile.nearest_major_city;
    
    console.log(`📋 Testing with profile: ${testProfile.full_name}`);
    console.log(`   Original city: ${originalCity}`);

    // Test 1: Try to set an invalid city
    console.log('\n🧪 Test 1: Attempting to set invalid city "Invalid City, XX"...');
    
    const { error: invalidCityError } = await supabase
      .from('profiles')
      .update({ nearest_major_city: 'Invalid City, XX' })
      .eq('id', testProfile.id);

    if (invalidCityError) {
      console.log('✅ GOOD: Invalid city was rejected');
      console.log(`   Error: ${invalidCityError.message}`);
    } else {
      console.log('❌ BAD: Invalid city was accepted - constraint not working');
    }

    // Test 2: Try to set a valid city
    console.log('\n🧪 Test 2: Attempting to set valid city "Atlanta, GA"...');
    
    const { error: validCityError } = await supabase
      .from('profiles')
      .update({ nearest_major_city: 'Atlanta, GA' })
      .eq('id', testProfile.id);

    if (validCityError) {
      console.log('❌ BAD: Valid city was rejected');
      console.log(`   Error: ${validCityError.message}`);
    } else {
      console.log('✅ GOOD: Valid city was accepted');
    }

    // Restore original city
    console.log('\n🔄 Restoring original city...');
    const { error: restoreError } = await supabase
      .from('profiles')
      .update({ nearest_major_city: originalCity })
      .eq('id', testProfile.id);

    if (restoreError) {
      console.log('⚠️  Could not restore original city:', restoreError.message);
    } else {
      console.log('✅ Original city restored');
    }

    // Test 3: Check current constraint status
    console.log('\n🔍 Checking if constraint exists in database...');
    
    // We can't directly query information_schema through Supabase client,
    // but we can infer from the behavior above
    
    if (invalidCityError && !validCityError) {
      console.log('✅ Constraint appears to be working correctly');
    } else if (!invalidCityError && !validCityError) {
      console.log('❌ Constraint does not appear to exist - both valid and invalid cities accepted');
    } else {
      console.log('⚠️  Unexpected behavior - constraint may be partially working');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the test
testConstraintManually();