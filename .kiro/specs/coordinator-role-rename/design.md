# Design Document

## Overview

This design outlines the systematic approach to rename "Talent Logistics Coordinator" to "Coordinator" throughout the entire application. The change affects database schemas, TypeScript enums, display functions, user interfaces, documentation, and test files. The design prioritizes data integrity, backward compatibility during migration, and comprehensive coverage of all references.

## Architecture

### Database Schema Changes

The core change involves updating two PostgreSQL enums:
- `system_role` enum: Change `talent_logistics_coordinator` to `coordinator`
- `project_role` enum: Change `talent_logistics_coordinator` to `coordinator`

**Migration Strategy:**
1. Create new enum values alongside existing ones
2. Update all data to use new values
3. Remove old enum values
4. Verify data integrity throughout the process

### Application Layer Changes

**TypeScript Type Definitions:**
- Update `lib/types.ts` role type definitions
- Update role display name mappings
- Update role utility functions

**User Interface Updates:**
- Update all dropdown options and form selections
- Update role display components
- Update navigation role descriptions
- Update role-based conditional rendering

**API and Business Logic:**
- Update API route handlers
- Update role validation logic
- Update role-based access control
- Update team assignment logic

## Components and Interfaces

### Database Migration Component

**Migration Script Structure:**
```sql
-- Step 1: Add new enum values
ALTER TYPE system_role ADD VALUE IF NOT EXISTS 'coordinator';
ALTER TYPE project_role ADD VALUE IF NOT EXISTS 'coordinator';

-- Step 2: Update existing data
UPDATE profiles SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';
UPDATE team_assignments SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';
UPDATE project_role_templates SET role = 'coordinator' WHERE role = 'talent_logistics_coordinator';

-- Step 3: Verify data migration
-- Step 4: Remove old enum values (requires enum recreation)
```

### Role Utility Interface

**Updated Role Functions:**
```typescript
// lib/role-utils.ts
export const ROLE_DISPLAY_NAMES = {
  admin: 'Admin',
  in_house: 'In-House Manager',
  supervisor: 'Supervisor',
  coordinator: 'Coordinator', // Updated from talent_logistics_coordinator
  talent_escort: 'Talent Escort'
}

export const PROJECT_ROLE_DESCRIPTIONS = {
  supervisor: 'On-site Manager',
  coordinator: 'Informational Oversight', // Updated
  talent_escort: 'On-the-ground Operator'
}
```

### UI Component Updates

**Form Components:**
- Registration form role selection buttons
- Team assignment role dropdowns
- Project role template management
- User profile role displays

**Navigation Components:**
- Role-based navigation filtering
- Mobile and desktop navigation role descriptions
- Role permission checking

## Data Models

### Affected Database Tables

**Primary Tables:**
- `profiles.role` (system_role enum)
- `team_assignments.role` (project_role enum)
- `project_role_templates.role` (project_role enum)

**Secondary Tables:**
- Any tables with role-based constraints or checks
- Tables with role-based indexes

### TypeScript Type Updates

**Core Type Definitions:**
```typescript
// Before
type SystemRole = 'admin' | 'in_house' | 'supervisor' | 'talent_logistics_coordinator' | 'talent_escort'
type ProjectRole = 'supervisor' | 'talent_logistics_coordinator' | 'talent_escort'

// After  
type SystemRole = 'admin' | 'in_house' | 'supervisor' | 'coordinator' | 'talent_escort'
type ProjectRole = 'supervisor' | 'coordinator' | 'talent_escort'
```

## Error Handling

### Migration Error Handling

**Data Integrity Checks:**
- Verify all role references are updated before removing old enum values
- Check for any foreign key constraints that might be affected
- Validate that no orphaned data exists after migration

**Rollback Strategy:**
- Maintain old enum values until migration is fully verified
- Provide rollback scripts to revert changes if needed
- Log all migration steps for audit trail

### Application Error Handling

**Role Validation:**
- Update role validation functions to accept new role names
- Maintain backward compatibility during transition period
- Provide clear error messages for invalid role references

**API Error Handling:**
- Update API validation schemas
- Ensure proper error responses for role-related operations
- Maintain consistent error messaging

## Testing Strategy

### Database Testing

**Migration Testing:**
- Test migration scripts on development database
- Verify data integrity before and after migration
- Test rollback procedures
- Performance testing for large datasets

**Schema Testing:**
- Verify enum constraints work correctly
- Test foreign key relationships
- Validate indexes are maintained

### Application Testing

**Unit Testing:**
- Update all role-related unit tests
- Test role utility functions with new values
- Test role validation logic
- Test role display functions

**Integration Testing:**
- Test complete user workflows with new role names
- Test API endpoints with role parameters
- Test role-based access control
- Test navigation and UI components

**End-to-End Testing:**
- Test user registration with coordinator role
- Test team assignment workflows
- Test role-based navigation
- Test project management with coordinator assignments

### Test Data Updates

**Mock Data:**
- Update all test fixtures to use new role names
- Update factory functions for test data generation
- Update seed data for development environments

**Test Assertions:**
- Update test expectations to match new role names
- Update snapshot tests if applicable
- Update visual regression tests

## Implementation Phases

### Phase 1: Database Migration
1. Create and test migration scripts
2. Execute migration on development environment
3. Verify data integrity
4. Create rollback procedures

### Phase 2: Core Application Updates
1. Update TypeScript type definitions
2. Update role utility functions
3. Update API validation and business logic
4. Update role-based access control

### Phase 3: User Interface Updates
1. Update form components and dropdowns
2. Update display components and role labels
3. Update navigation components
4. Update role-based conditional rendering

### Phase 4: Documentation and Testing
1. Update all documentation files
2. Update test files and test data
3. Update API documentation
4. Update steering files and guidelines

### Phase 5: Verification and Cleanup
1. Comprehensive testing of all changes
2. Remove old enum values from database
3. Final verification of data integrity
4. Performance testing and optimization

## Security Considerations

### Role-Based Access Control
- Ensure role permission mappings are correctly updated
- Verify that access control logic handles new role names
- Test that security boundaries are maintained

### Data Migration Security
- Ensure migration scripts don't expose sensitive data
- Verify that role changes don't inadvertently grant or remove permissions
- Audit trail for all role-related changes

## Performance Considerations

### Database Performance
- Minimize downtime during enum updates
- Optimize migration scripts for large datasets
- Maintain database indexes during migration

### Application Performance
- Ensure role lookup functions remain efficient
- Cache role display names appropriately
- Minimize impact on role-based queries

## Monitoring and Observability

### Migration Monitoring
- Log all migration steps and their outcomes
- Monitor database performance during migration
- Track any errors or warnings during the process

### Application Monitoring
- Monitor for any role-related errors after deployment
- Track usage of role-based features
- Monitor performance of role-related queries