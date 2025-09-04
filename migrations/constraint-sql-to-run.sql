-- Add CHECK constraint for nearest_major_city
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_nearest_major_city_check
CHECK (
  nearest_major_city IS NULL OR
  nearest_major_city IN (
    'Atlanta, GA',
    'Austin, TX',
    'Baltimore, MD',
    'Boston, MA',
    'Charlotte, NC',
    'Chicago, IL',
    'Cleveland, OH',
    'Dallas, TX',
    'Denver, CO',
    'Detroit, MI',
    'Houston, TX',
    'Indianapolis, IN',
    'Kansas City, MO',
    'Las Vegas, NV',
    'Los Angeles, CA',
    'Miami, FL',
    'Minneapolis, MN',
    'Nashville, TN',
    'New Orleans, LA',
    'New York, NY',
    'Orlando, FL',
    'Philadelphia, PA',
    'Phoenix, AZ',
    'Portland, OR',
    'Salt Lake City, UT',
    'San Antonio, TX',
    'San Diego, CA',
    'San Francisco, CA',
    'Seattle, WA',
    'St. Louis, MO',
    'Tampa, FL',
    'Washington, DC'
  )
);

-- Add documentation comment
COMMENT ON CONSTRAINT profiles_nearest_major_city_check ON public.profiles IS
'Ensures nearest_major_city uses only preset values from the registration form dropdown';

-- Record the migration
INSERT INTO public.schema_migrations (migration_name, applied_at, notes)
VALUES (
  '021_add_major_cities_constraint.sql',
  NOW(),
  'Added CHECK constraint to profiles.nearest_major_city to enforce preset city values'
);