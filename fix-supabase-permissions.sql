-- Fix Service Role Permissions for Registration System
-- This grants the necessary permissions for the service role to manage user profiles

-- Grant usage on public schema to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant all privileges on profiles table to service_role
GRANT ALL ON public.profiles TO service_role;

-- Grant all privileges on all tables in public schema to service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant all privileges on all sequences in public schema to service_role
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant all privileges on all functions in public schema to service_role
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- Ensure service_role can create users (should already have this)
-- This is typically granted by default, but let's be explicit
GRANT ALL ON auth.users TO service_role;