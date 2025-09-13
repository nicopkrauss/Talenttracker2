# Implementation Plan

- [x] 1. Create new database tables and triggers for day-specific assignments
  - Create `talent_daily_assignments` table with proper indexes and constraints
  - Create `group_daily_assignments` table with proper indexes and constraints  
  - Implement database triggers to automatically maintain `scheduled_dates` arrays
  - Add validation constraints for date ranges and duplicate prevention
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3_

- [x] 2. Add database-level TypeScript interfaces for daily assignment tables
  - Add `TalentDailyAssignment` and `GroupDailyAssignment` interfaces to lib/types.ts for database records
  - Add validation schemas using Zod for API request/response validation
  - Existing `TalentEscortPair` and `DayAssignment` interfaces already support the UI requirements
  - _Requirements: 4.4, 6.4_

- [x] 3. Implement data migration scripts for existing assignments
  - Create migration script to convert `talent_project_assignments.escort_id` to daily assignments
  - Create migration script to convert `talent_groups` escort fields to daily assignments
  - Implement data validation and integrity checks for migrated data
  - Create rollback scripts in case migration needs to be reversed
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 4. Update GET assignments/[date] API endpoint to use new daily assignment tables
  - Modify existing endpoint at `app/api/projects/[id]/assignments/[date]/route.ts`
  - Query from `talent_daily_assignments` and `group_daily_assignments` tables instead of old tables
  - Keep existing response format using `TalentEscortPair[]` - no interface changes needed
  - Ensure proper error handling and validation
  - _Requirements: 2.1, 4.2, 4.4_

- [x] 5. Implement POST assignments/[date] API endpoint for creating/updating assignments
  - Add POST method to existing `app/api/projects/[id]/assignments/[date]/route.ts`
  - Support both individual talent and group assignments with multiple escorts
  - Implement proper validation for date ranges and escort availability
  - Add comprehensive error handling and rollback capabilities
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.2, 4.4_

- [x] 6. Update Clear Day functionality to work with date-specific assignments
  - Modify `app/api/projects/[id]/assignments/clear-day/route.ts` to delete from new tables
  - Delete from `talent_daily_assignments` and `group_daily_assignments` for specific date
  - Ensure scheduled_dates arrays are properly updated via database triggers
  - Test that clearing one date doesn't affect assignments on other dates
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7. Update assignment management UI components to use new API endpoints
  - Update `AssignmentsTab` component at `components/projects/tabs/assignments-tab.tsx` to use new POST endpoint
  - UI already supports date-specific assignments - just needs to call updated APIs
  - Fix optimistic UI updates to work with the new backend structure
  - Ensure proper error handling and rollback for failed assignment operations
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 8. Verify multi-escort support for talent groups works with new backend
  - Test that new backend properly populates the `escortAssignments` array for groups with multiple escorts
  - Verify assignment and removal of individual escorts works correctly with new daily assignment tables
  - Test edge cases like removing middle escort from multi-escort assignment
  - Ensure proper validation prevents duplicate escort assignments on same date
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 9. Remove redundant escort fields from existing tables
  - Remove `escort_id` field from `talent_project_assignments` table
  - Remove `assigned_escort_id`, `assigned_escort_ids`, and `escort_dropdown_count` from `talent_groups`
  - Update all remaining code references to use the new daily assignment system
  - Ensure no functionality is broken by the field removal
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 10. Create comprehensive tests for the new assignment system
  - Write unit tests for database triggers and validation functions
  - Create integration tests for all new API endpoints (GET, POST, DELETE)
  - Test assignment conflict detection and date range validation
  - Write end-to-end tests for the complete assignment workflow including UI interactions
  - Test multi-escort assignments and edge cases
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 11. Update existing assignment-related functionality
  - Update any remaining components that reference the old escort assignment fields
  - Ensure assignment display in other parts of the app works with new structure
  - Update assignment-related queries and data fetching logic throughout the codebase
  - Verify that all assignment functionality works consistently across the application
  - _Requirements: 5.3, 6.4, 7.1_