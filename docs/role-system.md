# Role System Documentation

## Overview

The Talent Tracker application uses a hierarchical role system where **system roles override project roles**. This ensures that users with administrative privileges (like in-house managers) maintain their elevated permissions across all projects, while regular users can be assigned different roles on different projects.

## Role Types

### System Roles (stored in `profiles.role`)
System roles are global and take precedence over project roles:

- **`admin`**: Full system access and management capabilities
- **`in_house`**: System management with configurable permissions  
- **`null`**: Regular user with project-based roles only

### Project Roles (stored in `team_assignments.role`)
Project roles are assigned per project and only apply when no system role exists:

- **`supervisor`**: On-site management with day rate time tracking
- **`talent_logistics_coordinator`**: Informational oversight with day rate tracking
- **`talent_escort`**: On-the-ground operations with hourly time tracking

## Role Priority System

The effective user role is determined using this priority:

1. **System Role** (if present) - Always takes precedence
2. **Project Role** (if no system role) - Used for project-specific permissions
3. **Default Role** (`talent_escort`) - Fallback when no roles are assigned

### Examples

```typescript
// User with admin system role and supervisor project role
// Effective role: 'admin' (system role overrides)
getEffectiveUserRole('admin', 'supervisor') // Returns: 'admin'

// User with no system role but supervisor project role  
// Effective role: 'supervisor' (project role used)
getEffectiveUserRole(null, 'supervisor') // Returns: 'supervisor'

// User with no roles assigned
// Effective role: 'talent_escort' (default fallback)
getEffectiveUserRole(null, null) // Returns: 'talent_escort'
```

## Permission Levels

Each role has a numeric permission level (higher = more permissions):

- **`admin`**: 100
- **`in_house`**: 50  
- **`supervisor`**: 30
- **`talent_logistics_coordinator`**: 20
- **`talent_escort`**: 10

## Key Permission Functions

### Administrative Access
```typescript
// Only admin and in_house system roles
hasAdminAccess(systemRole) 
canAccessAdminFeatures(systemRole)
canApproveTimecards(systemRole)
```

### Team Management
```typescript
// Admin, in_house system roles + supervisor project role
canManageTeam(systemRole, projectRole)
canInitiateCheckout(systemRole, projectRole)
```

### Talent Management  
```typescript
// Most roles can manage talent (different permission levels)
canManageTalent(systemRole, projectRole)
```

## Navigation & Routing

### Default Routes
- **Admin/In-House**: `/projects` (administrative overview)
- **All Other Roles**: `/talent` (operational focus)

### Route Protection
Routes are protected based on effective user role:

```typescript
// Admin-only routes
<ProtectedRoute requiredRoles={['admin', 'in_house']}>
  <TeamManagementPage />
</ProtectedRoute>

// Multi-role access
<ProtectedRoute requiredRoles={['admin', 'in_house', 'supervisor']}>
  <TalentManagementPage />
</ProtectedRoute>
```

## Usage in Components

### Auth Context
```typescript
const { 
  systemRole,           // Current system role
  currentProjectRole,   // Current project role  
  effectiveRole,        // Computed effective role
  hasRole,              // Check specific role
  hasAnyRole,           // Check multiple roles
  canAccessAdminFeatures, // Admin access check
  defaultRoute          // User's default route
} = useAuth()
```

### Role Utilities
```typescript
import { 
  getEffectiveUserRole,
  hasAdminAccess,
  canManageTeam,
  getRoleDisplayName 
} from '@/lib/role-utils'

// Check permissions
const canEdit = canManageTeam(user.systemRole, user.projectRole)

// Get display name
const roleName = getRoleDisplayName(effectiveRole)
```

## Database Schema

### Profiles Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role system_role, -- 'admin' | 'in_house' | NULL
  status user_status DEFAULT 'pending',
  -- other fields...
);
```

### Team Assignments Table  
```sql
CREATE TABLE team_assignments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES projects(id),
  role project_role NOT NULL, -- 'supervisor' | 'talent_logistics_coordinator' | 'talent_escort'
  pay_rate DECIMAL(10,2),
  -- other fields...
);
```

## Migration Notes

The role system was updated to separate system and project roles. Key changes:

1. **Profiles table**: `role` column now uses `system_role` enum (`admin`, `in_house`, `null`)
2. **Team assignments**: `role` column uses `project_role` enum  
3. **Role utilities**: New functions handle the priority system
4. **Auth context**: Updated to support both role types
5. **Navigation**: Uses effective role for menu filtering

## Best Practices

1. **Always use role utilities** instead of direct role comparisons
2. **Check effective role** for UI permissions, not individual role types
3. **System roles override** - don't assume project roles apply to system users
4. **Default gracefully** - handle cases where users have no roles assigned
5. **Test role combinations** - verify system + project role interactions work correctly

## Testing

The role system includes comprehensive tests in `lib/__tests__/role-utils.test.ts` covering:

- Role priority and effective role calculation
- Permission checking functions  
- Navigation and routing logic
- Edge cases and fallbacks

Run tests with: `npm test lib/__tests__/role-utils.test.ts`