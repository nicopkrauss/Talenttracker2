# Role-Based Registration Implementation Summary

## Overview
Implemented a role-based registration system that asks users to select their position first, then shows relevant form fields based on their role. This addresses the location matching problem by using major cities and flight willingness instead of free-form city/state fields.

## Key Changes Made

### 1. Updated Registration Form (`components/auth/registration-form.tsx`)
- **Role Selection First**: Added role dropdown as the first field that must be selected before other fields appear
- **Conditional Fields**: Form fields only show after role selection
- **Major Cities Dropdown**: Replaced city/state fields with predefined major cities list
- **Flight Willingness**: Shows flight checkbox only for roles where flights are covered (In-House, Supervisor, TLC)
- **Progressive Disclosure**: Better UX by showing relevant fields based on role selection

### 2. Enhanced Type System (`lib/types.ts`)
- **New Types**: Added `RegistrationRole` and `REGISTRATION_ROLE_LABELS`
- **Major Cities List**: Added `MAJOR_CITIES` constant with 22 major US cities
- **Updated Schemas**: Enhanced `registrationSchema` with role-based validation
- **Updated Interfaces**: Modified `RegistrationData` and `PendingUser` to include new fields

### 3. Database Schema Updates (`prisma/schema.prisma`)
- **New Columns**: Added `registration_role`, `nearest_major_city`, `willing_to_fly` to profiles table
- **Indexes**: Added performance indexes for the new fields
- **Constraints**: Added check constraint for valid registration roles

### 4. Registration API (`app/api/auth/register/route.ts`)
- **New Endpoint**: Created complete registration API with role-based field handling
- **Enhanced Validation**: Uses updated schema validation
- **Profile Creation**: Stores all new registration fields
- **Admin Notifications**: Sends notification emails with role information

### 5. Pending Users Management
- **Updated Table** (`components/auth/pending-users-table.tsx`):
  - Shows registration role with editable dropdown
  - Displays major city instead of city/state
  - Shows flight willingness indicator for eligible roles
  - Added role update functionality
- **Role Update API** (`app/api/auth/update-registration-role/route.ts`):
  - Allows admins to change registration roles for pending users
  - Validates role changes and updates database

### 6. Team Page Updates (`app/(app)/team/page.tsx`)
- **Enhanced Query**: Updated to fetch new registration fields
- **Better Display**: Shows role and location information in admin interface

## Database Migration Required

The following SQL needs to be run in Supabase to add the new columns:

```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS registration_role TEXT,
ADD COLUMN IF NOT EXISTS nearest_major_city TEXT,
ADD COLUMN IF NOT EXISTS willing_to_fly BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD CONSTRAINT check_registration_role 
CHECK (registration_role IN ('in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'));

CREATE INDEX IF NOT EXISTS idx_profiles_registration_role ON public.profiles(registration_role);
CREATE INDEX IF NOT EXISTS idx_profiles_nearest_major_city ON public.profiles(nearest_major_city);
CREATE INDEX IF NOT EXISTS idx_profiles_willing_to_fly ON public.profiles(willing_to_fly) WHERE willing_to_fly = true;
```

## Benefits of This Approach

### 1. **Solves Location Matching Problem**
- **Standardized Cities**: 22 predefined major cities eliminate confusion (Santa Monica → Los Angeles, CA)
- **Market-Based Grouping**: Easy to find talent in specific markets
- **Flight Capability**: Clear indication of who can travel for projects

### 2. **Role-Based Experience**
- **Relevant Fields Only**: Talent Escorts don't see flight options since flights aren't covered
- **Better UX**: Progressive disclosure reduces cognitive load
- **Clear Expectations**: Users understand what role they're applying for

### 3. **Admin Efficiency**
- **Role Visibility**: Admins can see and edit what role someone applied for
- **Better Filtering**: Can filter by role, location, and flight willingness
- **Informed Decisions**: More context for approval decisions

### 4. **Future Flexibility**
- **Easy Expansion**: Can add more cities or roles as needed
- **Role-Specific Features**: Can add different fields/requirements per role
- **Market Analysis**: Better data for understanding talent distribution

## Testing
- Created comprehensive test suite for role-based registration form
- Tests cover role selection, conditional field display, and form submission
- Validates that flight willingness only shows for appropriate roles

## Next Steps
1. **Run Database Migration**: Add the new columns to the profiles table
2. **Test Registration Flow**: Verify the complete registration and approval process
3. **Update Documentation**: Update user guides to reflect new registration process
4. **Monitor Usage**: Track which roles and cities are most common for future optimization

## Files Modified
- `components/auth/registration-form.tsx` - Role-based form logic
- `components/auth/pending-users-table.tsx` - Admin role management
- `lib/types.ts` - Type definitions and validation
- `prisma/schema.prisma` - Database schema
- `app/api/auth/register/route.ts` - Registration API
- `app/api/auth/update-registration-role/route.ts` - Role update API
- `app/(app)/team/page.tsx` - Team management page
- Various test files and migration scripts

This implementation provides a much better user experience while solving the core location matching problem through standardized major cities and clear flight availability indicators.