const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyConstraintSimple() {
  console.log('📋 Manual Constraint Application Instructions');
  console.log('==========================================');
  console.log('');
  console.log('Since we cannot directly execute DDL through the Supabase client,');
  console.log('please follow these steps to add the constraint:');
  console.log('');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the following SQL:');
  console.log('');
  console.log('-- Add CHECK constraint for nearest_major_city');
  console.log('ALTER TABLE public.profiles');
  console.log('ADD CONSTRAINT profiles_nearest_major_city_check');
  console.log('CHECK (');
  console.log('  nearest_major_city IS NULL OR');
  console.log('  nearest_major_city IN (');
  
  const cities = [
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
  ];

  cities.forEach((city, index) => {
    const isLast = index === cities.length - 1;
    console.log(`    '${city}'${isLast ? '' : ','}`);
  });

  console.log('  )');
  console.log(');');
  console.log('');
  console.log('-- Add documentation comment');
  console.log('COMMENT ON CONSTRAINT profiles_nearest_major_city_check ON public.profiles IS');
  console.log("'Ensures nearest_major_city uses only preset values from the registration form dropdown';");
  console.log('');
  console.log('4. Click "Run" to execute the SQL');
  console.log('5. Run the test script to verify the constraint works');
  console.log('');
  console.log('After applying the constraint, run:');
  console.log('node scripts/test-constraint-manually.js');
  console.log('');

  // Also save the SQL to a file for easy copying
  const sqlContent = `-- Add CHECK constraint for nearest_major_city
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_nearest_major_city_check
CHECK (
  nearest_major_city IS NULL OR
  nearest_major_city IN (
${cities.map(city => `    '${city}'`).join(',\n')}
  )
);

-- Add documentation comment
COMMENT ON CONSTRAINT profiles_nearest_major_city_check ON public.profiles IS
'Ensures nearest_major_city uses only preset values from the registration form dropdown';

-- Record the migration
INSERT INTO public.public_schema_migrations (migration_name, applied_at, notes)
VALUES (
  '021_add_major_cities_constraint.sql',
  NOW(),
  'Added CHECK constraint to profiles.nearest_major_city to enforce preset city values'
);`;

  // Write to file
  const fs = require('fs');
  fs.writeFileSync('constraint-sql-to-run.sql', sqlContent);
  console.log('💾 SQL saved to: constraint-sql-to-run.sql');
  console.log('   You can copy this file content to the Supabase SQL Editor');
}

applyConstraintSimple();