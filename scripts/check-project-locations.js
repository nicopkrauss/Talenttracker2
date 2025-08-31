const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLocations() {
  console.log('🔍 Checking project_locations table...\n');
  
  const { data, error } = await supabase
    .from('project_locations')
    .select('*')
    .order('project_id', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📍 Current project_locations:');
  console.table(data);
  
  // Group by name to find duplicates
  const locationGroups = {};
  data.forEach(location => {
    if (!locationGroups[location.name]) {
      locationGroups[location.name] = [];
    }
    locationGroups[location.name].push(location);
  });
  
  console.log('\n🔍 Duplicate analysis:');
  Object.entries(locationGroups).forEach(([name, locations]) => {
    if (locations.length > 1) {
      console.log(`❌ ${name}: ${locations.length} duplicates`);
      locations.forEach(loc => {
        console.log(`   - ID: ${loc.id}, Project: ${loc.project_id}, Sort: ${loc.sort_order}`);
      });
    } else {
      console.log(`✅ ${name}: unique`);
    }
  });
}

checkLocations().catch(console.error);