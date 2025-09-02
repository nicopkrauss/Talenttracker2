const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

async function applyCitiesConstraintDirect() {
  // Use direct PostgreSQL connection for DDL operations
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔧 Adding CHECK constraint for nearest_major_city...');
    
    // First, check if the constraint already exists
    const checkConstraintQuery = `
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'profiles' 
      AND constraint_name = 'profiles_nearest_major_city_check'
      AND table_schema = 'public'
    `;

    const existingConstraints = await client.query(checkConstraintQuery);
    
    if (existingConstraints.rows.length > 0) {
      console.log('✅ Constraint already exists!');
      return;
    }

    // Add the CHECK constraint
    const constraintSQL = `
      ALTER TABLE public.profiles 
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

    await client.query(constraintSQL);
    console.log('✅ Successfully added CHECK constraint for nearest_major_city');

    // Add comment to the constraint
    const commentSQL = `
      COMMENT ON CONSTRAINT profiles_nearest_major_city_check ON public.profiles IS 
      'Ensures nearest_major_city uses only preset values from the registration form dropdown'
    `;
    
    await client.query(commentSQL);
    console.log('📝 Added constraint documentation');

    // Record the migration using Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

    // Test the constraint
    console.log('\n🧪 Testing constraint...');
    
    try {
      // Try to update a profile with an invalid city (this should fail)
      await client.query(`
        UPDATE public.profiles 
        SET nearest_major_city = 'Invalid City, XX' 
        WHERE id = '00000000-0000-0000-0000-000000000000'
      `);
      console.log('⚠️  Constraint test: No error (expected for non-existent ID)');
    } catch (testError) {
      if (testError.message.includes('profiles_nearest_major_city_check')) {
        console.log('✅ Constraint is working - invalid cities are rejected');
      } else {
        console.log('ℹ️  Test completed:', testError.message);
      }
    }

    // Test with a valid city
    console.log('\n🧪 Testing constraint with valid city...');
    try {
      await client.query(`
        UPDATE public.profiles 
        SET nearest_major_city = 'Atlanta, GA' 
        WHERE id = '00000000-0000-0000-0000-000000000000'
      `);
      console.log('✅ Valid cities are accepted (no error for non-existent ID)');
    } catch (testError) {
      console.log('ℹ️  Valid city test:', testError.message);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await client.end();
  }
}

// Run the constraint application
applyCitiesConstraintDirect();