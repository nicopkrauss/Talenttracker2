-- Migration: Add registration role and location fields to profiles table
-- Date: 2025-01-31
-- Description: Add fields to support role-based registration with major city selection and flight willingness

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS registration_role TEXT,
ADD COLUMN IF NOT EXISTS nearest_major_city TEXT,
ADD COLUMN IF NOT EXISTS willing_to_fly BOOLEAN DEFAULT false;

-- Add check constraint for registration_role
ALTER TABLE public.profiles 
ADD CONSTRAINT check_registration_role 
CHECK (registration_role IN ('in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'));

-- Add index for registration_role for efficient filtering
CREATE INDEX IF NOT EXISTS idx_profiles_registration_role ON public.profiles(registration_role);

-- Add index for nearest_major_city for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_nearest_major_city ON public.profiles(nearest_major_city);

-- Add index for willing_to_fly for flight-capable staff queries
CREATE INDEX IF NOT EXISTS idx_profiles_willing_to_fly ON public.profiles(willing_to_fly) WHERE willing_to_fly = true;

-- Update RLS policies to include new fields (if needed)
-- Note: Existing RLS policies should automatically cover new columns

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.registration_role IS 'Role selected during registration process';
COMMENT ON COLUMN public.profiles.nearest_major_city IS 'Nearest major city selected from predefined list';
COMMENT ON COLUMN public.profiles.willing_to_fly IS 'Whether user is willing to fly for projects (only relevant for covered roles)';