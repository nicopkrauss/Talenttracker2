const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreMissingLocations() {
  console.log('🔧 Restoring missing project locations...\n');
  
  try {
    const firstProjectId = '9e093154-1952-499d-a033-19e3718b1b63';
    const secondProjectId = 'fc928ecf-153f-4544-9878-4bc7e85f2949';
    
    // Check what locations exist for each project
    const { data: existingLocations, error: fetchError } = await supabase
      .from('project_locations')
      .select('*')
      .order('project_id', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (fetchError) throw fetchError;
    
    console.log('📍 Current locations:');
    console.table(existingLocations);
    
    // Group by project
    const locationsByProject = {};
    existingLocations.forEach(loc => {
      if (!locationsByProject[loc.project_id]) {
        locationsByProject[loc.project_id] = [];
      }
      locationsByProject[loc.project_id].push(loc.name);
    });
    
    console.log('\n📊 Locations by project:');
    Object.entries(locationsByProject).forEach(([projectId, locations]) => {
      const projectName = projectId === firstProjectId ? 'First Project' : 'Second Project';
      console.log(`${projectName} (${projectId}): ${locations.join(', ')}`);
    });
    
    // Check what's missing for the first project
    const firstProjectLocations = locationsByProject[firstProjectId] || [];
    const requiredLocations = ['House', 'Holding', 'Stage'];
    const missingLocations = requiredLocations.filter(loc => !firstProjectLocations.includes(loc));
    
    console.log(`\n🔍 Missing locations for first project: ${missingLocations.join(', ')}`);
    
    // Add missing locations
    if (missingLocations.length > 0) {
      console.log('\n➕ Adding missing locations...');
      
      for (const locationName of missingLocations) {
        let abbreviation, color, sortOrder;
        
        switch (locationName) {
          case 'House':
            abbreviation = 'HOU';
            color = '#10b981';
            sortOrder = 1;
            break;
          case 'Holding':
            abbreviation = 'HLD';
            color = '#f59e0b';
            sortOrder = 2;
            break;
          case 'Stage':
            abbreviation = 'STG';
            color = '#ef4444';
            sortOrder = 3;
            break;
        }
        
        console.log(`Adding ${locationName} (${abbreviation}, ${color}) with sort order ${sortOrder}`);
        
        const { error: insertError } = await supabase
          .from('project_locations')
          .insert({
            project_id: firstProjectId,
            name: locationName,
            abbreviation: abbreviation,
            color: color,
            is_default: true,
            sort_order: sortOrder
          });
        
        if (insertError) {
          console.error(`❌ Failed to add ${locationName}:`, insertError);
        } else {
          console.log(`✅ Added ${locationName}`);
        }
      }
    }
    
    // Verify final state
    console.log('\n📊 Final verification...');
    
    const { data: finalLocations, error: finalError } = await supabase
      .from('project_locations')
      .select('*')
      .order('project_id', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (finalError) throw finalError;
    
    console.log('\n📍 Final locations:');
    console.table(finalLocations);
    
    // Final summary
    const finalLocationsByProject = {};
    finalLocations.forEach(loc => {
      if (!finalLocationsByProject[loc.project_id]) {
        finalLocationsByProject[loc.project_id] = [];
      }
      finalLocationsByProject[loc.project_id].push(`${loc.name} (${loc.abbreviation})`);
    });
    
    console.log('\n📋 Final summary:');
    Object.entries(finalLocationsByProject).forEach(([projectId, locations]) => {
      const projectName = projectId === firstProjectId ? 'First Project' : 'Second Project';
      console.log(`${projectName}: ${locations.join(', ')}`);
    });
    
    console.log('\n🎉 Location restoration completed!');
    
  } catch (error) {
    console.error('❌ Error restoring locations:', error);
    process.exit(1);
  }
}

restoreMissingLocations();