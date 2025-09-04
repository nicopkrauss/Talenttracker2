-- Manual SQL to add CHECK constraint for nearest_major_city
-- Run this in the Supabase SQL Editor

-- First, check if constraint already exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'profiles' 
AND constraint_name = 'profiles_nearest_major_city_check'
AND table_schema = 'public';

-- Add the CHECK constraint (only run if the above query returns no rows)
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
);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT profiles_nearest_major_city_check ON public.profiles IS 
'Ensures nearest_major_city uses only preset values from the registration form dropdown';

-- Record the migration
INSERT INTO public.public_schema_migrations (migration_name, applied_at, notes)
VALUES (
  '021_add_major_cities_constraint.sql',
  NOW(),
  'Added CHECK constraint to profiles.nearest_major_city to enforce preset city values'
);

-- Test the constraint (this should fail)
-- UPDATE public.profiles SET nearest_major_city = 'Invalid City, XX' WHERE id = '00000000-0000-0000-0000-000000000000';

-- Verify constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'profiles_nearest_major_city_check';