const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simpleLocationUpdate() {
  console.log('🔧 Simple location data update...\n');
  
  try {
    // Get all locations first
    const { data: locations, error: fetchError } = await supabase
      .from('project_locations')
      .select('*')
      .order('project_id', { ascending: true });
    
    if (fetchError) throw fetchError;
    
    console.log('📍 Current locations:');
    console.table(locations);
    
    // Update each location individually by ID
    console.log('\n🔄 Updating locations individually...');
    
    for (const location of locations) {
      let updates = {};
      
      // Fix sort order for first project
      if (location.project_id === '9e093154-1952-499d-a033-19e3718b1b63') {
        if (location.name === 'House') updates.sort_order = 1;
        if (location.name === 'Holding') updates.sort_order = 2;
        if (location.name === 'Stage') updates.sort_order = 3;
      }
      
      // Add abbreviations and colors for all default locations
      if (location.is_default) {
        if (location.name === 'House') {
          updates.abbreviation = 'HOU';
          updates.color = '#10b981';
        }
        if (location.name === 'Holding') {
          updates.abbreviation = 'HLD';
          updates.color = '#f59e0b';
        }
        if (location.name === 'Stage') {
          updates.abbreviation = 'STG';
          updates.color = '#ef4444';
        }
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        console.log(`Updating ${location.name} (${location.id}):`, updates);
        
        const { error: updateError } = await supabase
          .from('project_locations')
          .update(updates)
          .eq('id', location.id);
        
        if (updateError) {
          console.error(`❌ Failed to update ${location.name}:`, updateError);
        } else {
          console.log(`✅ Updated ${location.name}`);
        }
      }
    }
    
    // Verify final results
    console.log('\n📊 Final verification...');
    
    const { data: finalLocations, error: finalError } = await supabase
      .from('project_locations')
      .select('*')
      .order('project_id', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (finalError) throw finalError;
    
    console.log('\n📍 Final locations:');
    console.table(finalLocations);
    
    console.log('\n🎉 Location updates completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

simpleLocationUpdate();