# Registration System Fix Guide

## Current Issues
The role-based registration system was implemented but the database schema doesn't match the new requirements, causing registration failures.

## Database Issues Found
1. **Missing Columns**: `registration_role`, `nearest_major_city`, `willing_to_fly` columns don't exist
2. **Incomplete Enum**: `system_role` enum only has `admin` and `in_house`, missing the new roles
3. **Old Field Usage**: Auth context still tries to use `city` and `state` fields
4. **Constraint Missing**: No validation constraint for `registration_role` values

## Step-by-Step Fix

### 1. Run Database Migration (REQUIRED)
Copy and paste this SQL into your Supabase SQL Editor:

```sql
-- Step 1: Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS registration_role TEXT,
ADD COLUMN IF NOT EXISTS nearest_major_city TEXT,
ADD COLUMN IF NOT EXISTS willing_to_fly BOOLEAN DEFAULT false;

-- Step 2: Update the system_role enum to include all registration roles
ALTER TYPE public.system_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.system_role ADD VALUE IF NOT EXISTS 'talent_logistics_coordinator';
ALTER TYPE public.system_role ADD VALUE IF NOT EXISTS 'talent_escort';

-- Step 3: Add check constraint for registration_role
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS check_registration_role;

ALTER TABLE public.profiles 
ADD CONSTRAINT check_registration_role 
CHECK (registration_role IN ('in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'));

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_registration_role ON public.profiles(registration_role);
CREATE INDEX IF NOT EXISTS idx_profiles_nearest_major_city ON public.profiles(nearest_major_city);
CREATE INDEX IF NOT EXISTS idx_profiles_willing_to_fly ON public.profiles(willing_to_fly) WHERE willing_to_fly = true;

-- Step 5: Add comments for documentation
COMMENT ON COLUMN public.profiles.registration_role IS 'Role selected during registration process';
COMMENT ON COLUMN public.profiles.nearest_major_city IS 'Nearest major city selected from predefined list';
COMMENT ON COLUMN public.profiles.willing_to_fly IS 'Whether user is willing to fly for projects (only relevant for covered roles)';

-- Step 6: Update any existing profiles to have a default registration_role
UPDATE public.profiles 
SET registration_role = CASE 
  WHEN role = 'admin' THEN 'in_house'
  WHEN role = 'in_house' THEN 'in_house'
  ELSE 'talent_escort'  -- Default for users without a system role
END
WHERE registration_role IS NULL;
```

### 2. Update Prisma Schema (COMPLETED)
The Prisma schema has been updated to include:
- New columns in the `profiles` model
- Updated `system_role` enum with all registration roles
- Proper indexes for the new fields

### 3. Generate Prisma Client (COMPLETED)
```bash
npx prisma generate
```

### 4. Updated Auth Context (COMPLETED)
The auth context now uses the new `/api/auth/register` endpoint instead of trying to create profiles directly.

## Files Modified
- ✅ `lib/auth-context.tsx` - Updated to use new registration API
- ✅ `prisma/schema.prisma` - Added new fields and updated enums
- ✅ `app/api/auth/register/route.ts` - New registration API endpoint
- ✅ `app/api/auth/update-registration-role/route.ts` - Role update API
- ✅ `components/auth/registration-form.tsx` - Role-based form
- ✅ `components/auth/pending-users-table.tsx` - Admin interface updates
- ✅ `lib/types.ts` - New types and validation schemas

## Testing the Fix

### 1. Run the Database Migration
Execute the SQL above in your Supabase dashboard.

### 2. Test Registration API (Optional)
```bash
# Make sure your dev server is running
npm run dev

# In another terminal, test the API
node scripts/test-registration-api.js
```

### 3. Test Full Registration Flow
1. Go to `/register` in your browser
2. Select a role (e.g., "Supervisor")
3. Fill out the form with valid data
4. Submit and verify success message
5. Check the pending users in `/team` page

## Expected Behavior After Fix

### Registration Form
- Shows role selection first
- Displays relevant fields based on role
- Shows flight willingness only for covered roles (In-House, Supervisor, Coordinator)
- Uses major cities dropdown instead of free-form city/state

### Database
- New users get stored with `registration_role`, `nearest_major_city`, `willing_to_fly`
- Old `city`/`state` fields remain for backward compatibility
- Proper validation and indexing in place

### Admin Interface
- Pending users show with registration role (editable)
- Major city location displayed
- Flight willingness indicator for eligible roles

## Troubleshooting

### If Registration Still Fails
1. Check browser console for specific error messages
2. Check Supabase logs for database errors
3. Verify all database columns exist: `SELECT * FROM profiles LIMIT 1;`
4. Ensure enum values exist: `SELECT unnest(enum_range(NULL::system_role));`

### If Prisma Errors Occur
```bash
# Pull latest schema from database
npx prisma db pull

# Generate client again
npx prisma generate
```

### If API Errors Occur
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify the registration API endpoint exists and is accessible
- Check network tab in browser for API response details

## Next Steps After Fix
1. Test the complete registration → approval → login flow
2. Verify pending users table shows all new fields correctly
3. Test role editing functionality for admins
4. Consider removing old `city`/`state` columns if no longer needed

This fix addresses all the database schema mismatches and should resolve the registration errors you encountered.