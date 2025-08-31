const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function completeLocationSetup() {
  console.log('🔧 Completing location setup for all projects...\n');
  
  try {
    const firstProjectId = '9e093154-1952-499d-a033-19e3718b1b63';
    const secondProjectId = 'fc928ecf-153f-4544-9878-4bc7e85f2949';
    
    // Check current state
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
    
    console.log('\n📊 Current locations by project:');
    Object.entries(locationsByProject).forEach(([projectId, locations]) => {
      const projectName = projectId === firstProjectId ? 'First Project' : 'Second Project';
      console.log(`${projectName}: ${locations.join(', ')}`);
    });
    
    // Required locations for each project
    const requiredLocations = ['House', 'Holding', 'Stage'];
    
    // Check and add missing locations for both projects
    for (const [projectId, projectName] of [
      [firstProjectId, 'First Project'],
      [secondProjectId, 'Second Project']
    ]) {
      const currentLocations = locationsByProject[projectId] || [];
      const missingLocations = requiredLocations.filter(loc => !currentLocations.includes(loc));
      
      if (missingLocations.length > 0) {
        console.log(`\n➕ Adding missing locations for ${projectName}: ${missingLocations.join(', ')}`);
        
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
              project_id: projectId,
              name: locationName,
              abbreviation: abbreviation,
              color: color,
              is_default: true,
              sort_order: sortOrder
            });
          
          if (insertError) {
            console.error(`❌ Failed to add ${locationName} to ${projectName}:`, insertError);
          } else {
            console.log(`✅ Added ${locationName} to ${projectName}`);
          }
        }
      } else {
        console.log(`\n✅ ${projectName} already has all required locations`);
      }
    }
    
    // Final verification
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
      finalLocationsByProject[loc.project_id].push(`${loc.name} (${loc.abbreviation}, ${loc.color})`);
    });
    
    console.log('\n📋 Final summary:');
    Object.entries(finalLocationsByProject).forEach(([projectId, locations]) => {
      const projectName = projectId === firstProjectId ? 'First Project' : 'Second Project';
      console.log(`${projectName}: ${locations.join(', ')}`);
    });
    
    console.log('\n🎉 All projects now have complete location sets!');
    console.log('Each project has: House (HOU, green), Holding (HLD, amber), Stage (STG, red)');
    
  } catch (error) {
    console.error('❌ Error completing location setup:', error);
    process.exit(1);
  }
}

completeLocationSetup();