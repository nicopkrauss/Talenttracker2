# Login Troubleshooting Guide

## Problem: "Failed to fetch user profile" Error

This error occurs when users try to log in but the system cannot access their profile data from the database.

## Root Cause

The most common cause is **missing Row Level Security (RLS) policies** that prevent authenticated users from reading their own profiles.

## Solution

### Step 1: Apply RLS Policies (REQUIRED)

Run this SQL in your Supabase SQL Editor:

```sql
-- Fix Login Issues: Create RLS Policies for Profile Access
-- This allows users to read and update their own profiles during authentication

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
```

### Step 2: Check User Status

If login still fails, the user might be in "pending" status and need approval:

```sql
-- Check user status
SELECT email, status, role, created_at 
FROM profiles 
WHERE email = 'user@example.com';

-- Approve user if needed
UPDATE profiles 
SET status = 'active', updated_at = NOW() 
WHERE email = 'user@example.com';
```

## Debugging Steps

### 1. Check RLS Policies
```sql
-- Check existing policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

### 2. Check User Profile
```sql
-- Find user profile
SELECT * FROM profiles WHERE email = 'user@example.com';
```

### 3. Check Auth User
```sql
-- Check if user exists in auth
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'user@example.com';
```

## Common Issues

### Issue 1: No RLS Policies
**Symptom**: "Failed to fetch user profile" error  
**Solution**: Apply the RLS policies above

### Issue 2: User Status is "pending"
**Symptom**: Profile fetch succeeds but user can't access app  
**Solution**: Update user status to 'active'

### Issue 3: Profile Doesn't Exist
**Symptom**: User exists in auth but no profile  
**Solution**: Check registration trigger is working

### Issue 4: Email Not Confirmed
**Symptom**: Login fails with email confirmation error  
**Solution**: Confirm email or set email_confirm: true in registration

## Testing

After applying fixes:

1. **Test Login**: Try logging in with the problematic account
2. **Check Console**: Look for any remaining errors
3. **Verify Profile**: Ensure user profile loads correctly
4. **Test Navigation**: Confirm user can access appropriate pages

## Prevention

To prevent future login issues:

1. **Always apply RLS policies** when setting up profiles table
2. **Test registration and login flow** in development
3. **Monitor user status** and approval workflow
4. **Set up proper error handling** for profile fetch failures

## Helper Scripts

- `node scripts/debug-login-issue.js` - Check user status and recent registrations
- `node scripts/fix-login-rls-policies.js` - Get RLS policy SQL
- `node scripts/check-rls-policies.js` - Check existing policies

## Success Indicators

After fixing:
- ✅ Users can log in without errors
- ✅ Profile data loads correctly
- ✅ Navigation works based on user role
- ✅ No console errors during authentication