const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyCitiesConstraint() {
  try {
    console.log('🔧 Adding CHECK constraint for nearest_major_city...');
    
    // First, let's check if the constraint already exists
    const { data: existingConstraints, error: checkError } = await supabase
      .rpc('sql', {
        query: `
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'profiles' 
          AND constraint_name = 'profiles_nearest_major_city_check'
        `
      });

    if (checkError) {
      console.log('ℹ️  Could not check existing constraints, proceeding with constraint creation...');
    } else if (existingConstraints && existingConstraints.length > 0) {
      console.log('✅ Constraint already exists!');
      return;
    }

    // Add the CHECK constraint
    const constraintSQL = `
      ALTER TABLE profiles 
      ADD CONSTRAINT profiles_nearest_major_city_check 
      CHECK (
        nearest_major_city IS NULL OR 
        nearest_major_city IN (
          'Atlanta, GA',
          'Austin, TX',
          'Boston, MA',
          'Charlotte, NC',
          'Chicago, IL',
          'Dallas, TX',
          'Denver, CO',
          'Detroit, MI',
          'Houston, TX',
          'Las Vegas, NV',
          'Los Angeles, CA',
          'Miami, FL',
          'Nashville, TN',
          'New York, NY',
          'Orlando, FL',
          'Philadelphia, PA',
          'Phoenix, AZ',
          'Portland, OR',
          'San Diego, CA',
          'San Francisco, CA',
          'Seattle, WA',
          'Washington, DC'
        )
      )
    `;

    const { error: constraintError } = await supabase.rpc('sql', {
      query: constraintSQL
    });

    if (constraintError) {
      console.error('❌ Error adding constraint:', constraintError);
      return;
    }

    console.log('✅ Successfully added CHECK constraint for nearest_major_city');

    // Record the migration
    const { error: recordError } = await supabase
      .from('public_schema_migrations')
      .insert({
        migration_name: '021_add_major_cities_constraint.sql',
        applied_at: new Date().toISOString(),
        notes: 'Added CHECK constraint to profiles.nearest_major_city to enforce preset city values'
      });

    if (recordError) {
      console.warn('⚠️  Could not record migration:', recordError.message);
    } else {
      console.log('📝 Migration recorded in schema_migrations table');
    }

    // Test the constraint by trying to insert an invalid city
    console.log('\n🧪 Testing constraint with invalid city...');
    
    const { error: testError } = await supabase
      .from('profiles')
      .update({ nearest_major_city: 'Invalid City, XX' })
      .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID

    if (testError && testError.message.includes('profiles_nearest_major_city_check')) {
      console.log('✅ Constraint is working - invalid cities are rejected');
    } else {
      console.log('ℹ️  Constraint test completed (no error expected for non-existent ID)');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the constraint application
applyCitiesConstraint();