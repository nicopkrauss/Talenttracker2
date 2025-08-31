const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixProjectLocations() {
  console.log('🔧 Fixing project locations data...\n');
  
  try {
    // First, fix the sort orders for the first project
    console.log('1️⃣ Fixing sort orders for first project...');
    
    const { error: sortError } = await supabase
      .from('project_locations')
      .update({ sort_order: 1 })
      .eq('project_id', '9e093154-1952-499d-a033-19e3718b1b63')
      .eq('name', 'House')
      .eq('is_default', true);
    
    if (sortError) throw sortError;
    
    const { error: sortError2 } = await supabase
      .from('project_locations')
      .update({ sort_order: 2 })
      .eq('project_id', '9e093154-1952-499d-a033-19e3718b1b63')
      .eq('name', 'Holding')
      .eq('is_default', true);
    
    if (sortError2) throw sortError2;
    
    const { error: sortError3 } = await supabase
      .from('project_locations')
      .update({ sort_order: 3 })
      .eq('project_id', '9e093154-1952-499d-a033-19e3718b1b63')
      .eq('name', 'Stage')
      .eq('is_default', true);
    
    if (sortError3) throw sortError3;
    
    console.log('✅ Sort orders fixed');
    
    // Now add abbreviations and colors to House locations
    console.log('2️⃣ Adding abbreviations and colors to House locations...');
    
    const { error: houseError } = await supabase
      .from('project_locations')
      .update({ 
        abbreviation: 'HOU',
        color: '#10b981'  // Green (emerald-500)
      })
      .eq('name', 'House')
      .eq('is_default', true);
    
    if (houseError) throw houseError;
    
    // Add abbreviations and colors to Holding locations
    console.log('3️⃣ Adding abbreviations and colors to Holding locations...');
    
    const { error: holdingError } = await supabase
      .from('project_locations')
      .update({ 
        abbreviation: 'HLD',
        color: '#f59e0b'  // Amber (amber-500)
      })
      .eq('name', 'Holding')
      .eq('is_default', true);
    
    if (holdingError) throw holdingError;
    
    // Add abbreviations and colors to Stage locations
    console.log('4️⃣ Adding abbreviations and colors to Stage locations...');
    
    const { error: stageError } = await supabase
      .from('project_locations')
      .update({ 
        abbreviation: 'STG',
        color: '#ef4444'  // Red (red-500)
      })
      .eq('name', 'Stage')
      .eq('is_default', true);
    
    if (stageError) throw stageError;
    
    console.log('✅ Abbreviations and colors added');
    
    // Verify the changes
    console.log('\n5️⃣ Verifying changes...');
    
    const { data: locations, error: verifyError } = await supabase
      .from('project_locations')
      .select('*')
      .order('project_id', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (verifyError) throw verifyError;
    
    console.log('\n📍 Updated project_locations:');
    console.table(locations);
    
    console.log('\n🎉 All fixes completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing project locations:', error);
    process.exit(1);
  }
}

fixProjectLocations();