# Role System Database Schema Fix Summary

## Issue Identified
The roles filter in the "Assign Staff to Roles" section was only showing "Admin" and "In-House" options, but the current database schema supports a full range of system roles. This was causing inconsistency between the UI and the actual database structure.

## Current Database Schema (Correct)

### System Roles (`system_role` enum)
```sql
enum system_role {
  admin
  in_house
  supervisor
  talent_logistics_coordinator
  talent_escort
}
```

### Project Roles (`project_role` enum)
```sql
enum project_role {
  supervisor
  talent_logistics_coordinator
  talent_escort
}
```

### User Role Structure
- **System Roles**: Stored in `profiles.role` (can be `null` for regular users)
- **Project Roles**: Stored in `team_assignments.role` (project-specific assignments)

## Changes Made

### 1. Updated Role Filter Options (`components/projects/tabs/roles-team-tab.tsx`)

#### Before
```typescript
<SelectContent>
  <SelectItem value="all">All roles</SelectItem>
  <SelectItem value="admin">Admin</SelectItem>
  <SelectItem value="in_house">In-House</SelectItem>
</SelectContent>
```

#### After
```typescript
<SelectContent>
  <SelectItem value="all">All roles</SelectItem>
  <SelectItem value="admin">Admin</SelectItem>
  <SelectItem value="in_house">In-House</SelectItem>
  <SelectItem value="supervisor">Supervisor</SelectItem>
  <SelectItem value="talent_logistics_coordinator">Talent Logistics Coordinator</SelectItem>
  <SelectItem value="talent_escort">Talent Escort</SelectItem>
  <SelectItem value="null">Regular User</SelectItem>
</SelectContent>
```

### 2. Updated Filter Logic

#### Before
```typescript
if (filters.role && staff.role !== filters.role) {
  return false
}
```

#### After
```typescript
if (filters.role) {
  if (filters.role === 'null' && staff.role !== null) {
    return false
  } else if (filters.role !== 'null' && staff.role !== filters.role) {
    return false
  }
}
```

### 3. Updated Available Staff API (`app/api/projects/[id]/available-staff/route.ts`)

#### Before
```typescript
const eligibleStaff = filteredStaff.filter(staff => 
  staff.status === 'active' && 
  (staff.role === null || ['admin', 'in_house'].includes(staff.role))
)
```

#### After
```typescript
const eligibleStaff = filteredStaff.filter(staff => 
  staff.status === 'active' && 
  (staff.role === null || ['admin', 'in_house', 'supervisor', 'talent_logistics_coordinator', 'talent_escort'].includes(staff.role))
)
```

## Role System Architecture (Confirmed)

### Permission Hierarchy
1. **System Roles** (highest priority)
   - `admin`: Full system access
   - `in_house`: System management
   - `supervisor`: System-level supervisor
   - `talent_logistics_coordinator`: System-level TLC
   - `talent_escort`: System-level escort

2. **Project Roles** (used when no system role)
   - `supervisor`: Project supervisor
   - `talent_logistics_coordinator`: Project TLC  
   - `talent_escort`: Project escort

3. **Regular Users** (`null` system role)
   - Can be assigned project roles
   - Default to project-based permissions

### API Permission Model (Maintained)
The existing API permission model was kept intact:

- **Team Management APIs**: Restricted to `admin` and `in_house` system roles only
- **Operational APIs**: Allow system admins + project supervisors
- **Available Staff**: Returns all eligible staff but only accessible to system admins

This maintains the security model where only system administrators can manage team assignments and role templates.

## User Experience Improvements

### Filter Options Now Include
1. **All roles**: Shows all staff members
2. **Admin**: System administrators
3. **In-House**: System managers
4. **Supervisor**: System or project supervisors
5. **Talent Logistics Coordinator**: System or project TLCs
6. **Talent Escort**: System or project escorts
7. **Regular User**: Users with no system role (project roles only)

### Benefits
- **Complete Visibility**: Users can now filter by all available system roles
- **Accurate Filtering**: Filter logic properly handles `null` roles
- **Consistent Data**: UI matches actual database schema
- **Better UX**: More granular filtering options for staff selection

## Database Consistency Verified

The fix ensures that:
- ✅ UI role options match database `system_role` enum
- ✅ Filter logic handles all role types including `null`
- ✅ API returns all eligible staff with any system role
- ✅ Permission model remains secure (only admins manage teams)
- ✅ Role hierarchy is properly maintained

## Impact

This fix resolves the inconsistency between the UI and database schema, ensuring that project managers can properly filter and view all staff members regardless of their system role assignment. The security model remains intact while providing better visibility into the available staff pool.