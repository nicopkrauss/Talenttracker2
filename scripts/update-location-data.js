const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateLocationData() {
  console.log('🔧 Updating project locations data...\n');
  
  try {
    // Fix sort orders for the first project (they're all 0)
    console.log('1️⃣ Fixing sort orders for first project...');
    
    // Update House to sort_order 1
    const { error: houseSort } = await supabase
      .from('project_locations')
      .update({ sort_order: 1 })
      .eq('project_id', '9e093154-1952-499d-a033-19e3718b1b63')
      .eq('name', 'House');
    
    if (houseSort) throw houseSort;
    
    // Update Holding to sort_order 2
    const { error: holdingSort } = await supabase
      .from('project_locations')
      .update({ sort_order: 2 })
      .eq('project_id', '9e093154-1952-499d-a033-19e3718b1b63')
      .eq('name', 'Holding');
    
    if (holdingSort) throw holdingSort;
    
    // Update Stage to sort_order 3
    const { error: stageSort } = await supabase
      .from('project_locations')
      .update({ sort_order: 3 })
      .eq('project_id', '9e093154-1952-499d-a033-19e3718b1b63')
      .eq('name', 'Stage');
    
    if (stageSort) throw stageSort;
    
    console.log('✅ Sort orders fixed');
    
    // Update all House locations with abbreviation and color
    console.log('2️⃣ Updating House locations...');
    
    const { error: houseUpdate } = await supabase
      .from('project_locations')
      .update({ 
        abbreviation: 'HOU',
        color: '#10b981'  // Green (emerald-500)
      })
      .eq('name', 'House')
      .eq('is_default', true);
    
    if (houseUpdate) throw houseUpdate;
    
    // Update all Holding locations with abbreviation and color
    console.log('3️⃣ Updating Holding locations...');
    
    const { error: holdingUpdate } = await supabase
      .from('project_locations')
      .update({ 
        abbreviation: 'HLD',
        color: '#f59e0b'  // Amber (amber-500)
      })
      .eq('name', 'Holding')
      .eq('is_default', true);
    
    if (holdingUpdate) throw holdingUpdate;
    
    // Update all Stage locations with abbreviation and color
    console.log('4️⃣ Updating Stage locations...');
    
    const { error: stageUpdate } = await supabase
      .from('project_locations')
      .update({ 
        abbreviation: 'STG',
        color: '#ef4444'  // Red (red-500)
      })
      .eq('name', 'Stage')
      .eq('is_default', true);
    
    if (stageUpdate) throw stageUpdate;
    
    console.log('✅ Abbreviations and colors updated');
    
    // Verify the changes
    console.log('\n5️⃣ Verifying final results...');
    
    const { data: locations, error: verifyError } = await supabase
      .from('project_locations')
      .select('*')
      .order('project_id', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (verifyError) throw verifyError;
    
    console.log('\n📍 Final project_locations:');
    console.table(locations);
    
    // Summary
    console.log('\n📊 Summary:');
    const locationGroups = {};
    locations.forEach(location => {
      if (!locationGroups[location.name]) {
        locationGroups[location.name] = [];
      }
      locationGroups[location.name].push(location);
    });
    
    Object.entries(locationGroups).forEach(([name, locs]) => {
      const firstLoc = locs[0];
      console.log(`${name}: ${locs.length} instances, abbreviation: ${firstLoc.abbreviation}, color: ${firstLoc.color}`);
    });
    
    console.log('\n🎉 All location data updated successfully!');
    console.log('\nNote: The "duplicates" are actually correct - each project should have its own set of default locations.');
    
  } catch (error) {
    console.error('❌ Error updating location data:', error);
    process.exit(1);
  }
}

updateLocationData();