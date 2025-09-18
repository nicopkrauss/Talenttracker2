-- Fix Login Issues: Create RLS Policies for Profile Access
-- This allows users to read and update their own profiles during authentication

-- First, check if RLS is enabled (it should be)
-- If not enabled, you can enable it with: ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

-- Create policy for users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Create policy for users to update their own profile  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create policy for service role to manage all profiles (for registration)
CREATE POLICY "Service role can manage all profiles" ON profiles
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Grant necessary permissions to authenticated users
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Ensure anon users can't access profiles (security)
REVOKE ALL ON profiles FROM anon;