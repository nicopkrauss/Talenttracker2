# Registration System Fix

## Problem Summary

The registration system was failing with three main errors:
1. "Failed to create user profile. Please try again."
2. "Registration system error: {}"
3. Generic error handling issues

## Root Causes

After debugging, I found two main issues:
1. **Missing Database Trigger**: The automatic profile creation trigger was never set up
2. **Service Role Permissions**: The service role key doesn't have permissions to access the public schema

## Solution Implemented

### 1. Service Role Permissions Fix (REQUIRED - Manual Step)

**First, run this SQL in your Supabase SQL Editor to fix permissions:**

```sql
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
```

### 2. Database Trigger Fix (REQUIRED - Manual Step)

**Then, run this SQL in your Supabase SQL Editor to create the trigger:**

```sql
-- Fix Registration System: Create User Profile Trigger
-- This creates the missing trigger for automatic profile creation

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    status, 
    created_at, 
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'pending',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
```

### 3. API Fallback Enhancement

Enhanced the registration API (`app/api/auth/register/route.ts`) to handle cases where the trigger doesn't exist:

- First tries to update an existing profile (created by trigger)
- If profile doesn't exist (PGRST116 error), creates it manually
- Provides better error handling and cleanup

### 4. Error Message Improvements

Improved error handling in the auth context (`lib/auth-context.tsx`):

- More specific error messages for common cases
- Better handling of profile creation errors
- Clearer messaging for duplicate email addresses

## Steps to Fix

1. **Run the permissions SQL in Supabase SQL Editor** (critical first step)
2. **Run the trigger SQL in Supabase SQL Editor** (critical second step)
3. The API and error handling improvements are already applied
4. Test registration with a new email address

## How It Works

### Normal Flow (with trigger):
1. User submits registration form
2. Supabase Auth creates user account
3. Database trigger automatically creates profile record
4. API updates profile with registration details
5. Success!

### Fallback Flow (without trigger):
1. User submits registration form
2. Supabase Auth creates user account
3. API tries to update profile (fails - no profile exists)
4. API detects the error and creates profile manually
5. Success!

## Testing

After applying the fix:

1. Try registering with a new email address
2. Should see success message: "Registration successful. Your account is pending approval."
3. Check Supabase dashboard - should see new user in auth.users and profiles tables

## Files Created/Modified

- `migrations/031_create_user_registration_trigger.sql` - New migration file
- `app/api/auth/register/route.ts` - Enhanced with fallback logic
- `lib/auth-context.tsx` - Improved error messages
- `scripts/fix-registration-trigger.js` - Helper script for trigger SQL
- `scripts/fix-supabase-permissions.js` - Helper script for permissions SQL
- `scripts/debug-registration-api.js` - Debug script for testing
- `fix-registration-trigger.sql` - Trigger SQL file for easy copying
- `fix-supabase-permissions.sql` - Permissions SQL file for easy copying

## Prevention

These issues occurred because:
1. The database trigger was never created during initial setup
2. The service role permissions were not properly configured

The migration file `031_create_user_registration_trigger.sql` and the permissions SQL should be applied to prevent this in the future.

## Quick Test

After applying both SQL fixes, you can test with:
```bash
node scripts/debug-registration-api.js
```

This will verify that:
- Service role has proper permissions
- Profile creation works
- Registration API works end-to-end