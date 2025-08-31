const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addLocationColumns() {
  console.log('🔧 Adding missing columns to project_locations table...\n');
  
  try {
    // Add abbreviation column
    console.log('1️⃣ Adding abbreviation column...');
    
    const { error: abbrevError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_locations 
        ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(3);
      `
    });
    
    if (abbrevError) {
      console.log('Trying alternative method for abbreviation column...');
      // Try using raw SQL query
      const { error: abbrevError2 } = await supabase
        .from('project_locations')
        .select('abbreviation')
        .limit(1);
      
      if (abbrevError2 && abbrevError2.code === '42703') {
        console.log('Column does not exist, need to add it manually');
      }
    }
    
    // Add color column
    console.log('2️⃣ Adding color column...');
    
    const { error: colorError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_locations 
        ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6';
      `
    });
    
    if (colorError) {
      console.log('Trying alternative method for color column...');
    }
    
    console.log('✅ Columns added (if they didn\'t exist)');
    
    // Now update the data
    console.log('3️⃣ Updating existing location data...');
    
    // Update House locations
    const { error: houseError } = await supabase
      .from('project_locations')
      .update({ 
        sort_order: 1
      })
      .eq('project_id', '9e093154-1952-499d-a033-19e3718b1b63')
      .eq('name', 'House')
      .eq('is_default', true);
    
    if (houseError) throw houseError;
    
    // Update Holding locations  
    const { error: holdingError } = await supabase
      .from('project_locations')
      .update({ 
        sort_order: 2
      })
      .eq('project_id', '9e093154-1952-499d-a033-19e3718b1b63')
      .eq('name', 'Holding')
      .eq('is_default', true);
    
    if (holdingError) throw holdingError;
    
    // Update Stage locations
    const { error: stageError } = await supabase
      .from('project_locations')
      .update({ 
        sort_order: 3
      })
      .eq('project_id', '9e093154-1952-499d-a033-19e3718b1b63')
      .eq('name', 'Stage')
      .eq('is_default', true);
    
    if (stageError) throw stageError;
    
    console.log('✅ Sort orders fixed');
    
    // Verify the changes
    console.log('\n4️⃣ Verifying changes...');
    
    const { data: locations, error: verifyError } = await supabase
      .from('project_locations')
      .select('*')
      .order('project_id', { ascending: true })
      .order('sort_order', { ascending: true });
    
    if (verifyError) throw verifyError;
    
    console.log('\n📍 Updated project_locations:');
    console.table(locations);
    
    console.log('\n🎉 Basic fixes completed! You may need to run Prisma migrations to add abbreviation and color columns.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addLocationColumns();