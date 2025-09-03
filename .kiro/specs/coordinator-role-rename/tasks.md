# Implementation Plan

- [x] 1. Create database migration script for enum updates





  - Write SQL migration script to add new 'coordinator' enum values to both system_role and project_role enums
  - Include data migration queries to update existing records from 'talent_logistics_coordinator' to 'coordinator'
  - Add verification queries to ensure data integrity after migration
  - Create rollback script for safe reversal if needed
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2, 6.3, 6.4_

- [x] 2. Update TypeScript type definitions and role utilities





  - Modify `lib/types.ts` to change 'talent_logistics_coordinator' to 'coordinator' in SystemRole and ProjectRole types
  - Update ROLE_DISPLAY_NAMES mapping in `lib/role-utils.ts` to use 'Coordinator' display name
  - Update PROJECT_ROLE_DESCRIPTIONS to use 'coordinator' key with appropriate description
  - Update any role validation functions to handle the new role name
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Update user interface components for role selection and display





  - Modify registration form in `components/auth/registration-form.tsx` to display "Coordinator" button text
  - Update role dropdown options in team assignment components
  - Update role display functions in project role template manager
  - Update any role-based conditional rendering to use new role name
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4. Update API routes and business logic


  - Modify API validation schemas to accept 'coordinator' instead of 'talent_logistics_coordinator'
  - Update role-based access control logic in middleware and API routes
  - Update team assignment API routes to handle new role name
  - Update project role template API routes for coordinator role
  - _Requirements: 3.1, 3.2_

- [x] 5. Update navigation and role-based UI logic

  - Modify navigation configuration to use 'coordinator' in role-based filtering
  - Update mobile and desktop navigation role descriptions
  - Update role permission checking functions
  - Update any role-based feature toggles or conditional displays
  - _Requirements: 1.4, 3.1_

- [x] 6. Update database constraints and validation


  - Update database check constraints that reference role values
  - Modify any stored procedures or triggers that handle role validation
  - Update database indexes that include role columns
  - Verify foreign key relationships are maintained after enum changes
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 7. Update test files and test data





  - Update all test scripts in `/scripts` directory to use 'coordinator' instead of 'talent_logistics_coordinator'
  - Update test data generators and factory functions in test scripts
  - Update flight eligibility logic in registration tests to use 'coordinator'
  - Update role template tests to use new role name
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Update steering files and documentation
  - [x] Update `.kiro/steering/database-patterns.md` to use 'coordinator' instead of 'talent_logistics_coordinator'
  - [x] Update `spec.md` to use 'coordinator' instead of 'talent logistics coordinator'
  - [x] Update any remaining documentation references to use "Coordinator" display name
  - [x] Update code comments to use appropriate naming conventions
  - [x] Update all test files to use new role names
  - [x] Update all summary documentation files
  - [x] Update navigation and project management documentation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Execute database migration to complete data migration





  - Run the database migration script to update remaining data from 'talent_logistics_coordinator' to 'coordinator'
  - Verify all existing data has been correctly migrated using verification script
  - Test that no references to old role name remain in database
  - Execute comprehensive data integrity checks
  - _Requirements: 2.3, 6.3_

- [ ] 10. Comprehensive testing and validation
  - Execute updated test scripts to verify functionality with new role names
  - Test complete user registration flow with coordinator role selection
  - Test team assignment workflows with coordinator role
  - Verify role-based navigation and UI components work correctly with coordinator role
  - _Requirements: 5.1, 5.2, 5.3, 5.4_