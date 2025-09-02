-- Migration: Add constraint to ensure nearest_major_city uses only preset values
-- This migration adds a CHECK constraint to the profiles table to ensure
-- nearest_major_city can only contain values from the preset list used in the registration form

-- Add CHECK constraint for nearest_major_city
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
);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT profiles_nearest_major_city_check ON profiles IS 
'Ensures nearest_major_city uses only preset values from the registration form dropdown';

-- Update the migration tracking table
INSERT INTO public.schema_migrations (migration_name, applied_at, notes)
VALUES (
  '021_add_major_cities_constraint.sql',
  NOW(),
  'Added CHECK constraint to profiles.nearest_major_city to enforce preset city values'
);