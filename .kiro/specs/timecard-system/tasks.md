# Timecard System Implementation Plan

## Task Overview

This implementation plan focuses on building the core timecard system components without integrating them into the operational interfaces yet. The approach prioritizes creating robust, testable components that can be integrated later when the operational interfaces are ready.

## Implementation Tasks

- [x] 1. Database Schema and Configuration Setup





  - ✅ Enhanced existing timecards table with proper constraints and indexes (migration 005)
  - ✅ Created project-specific break duration settings in project_settings table (migration 030)
  - ✅ Added global settings infrastructure via system_settings table
  - ✅ Implemented database constraints for time sequence validation
  - ✅ Added indexes for performance optimization (user_id, project_id, date, status)
  - ✅ Created unique constraints to prevent duplicate timecards for same user/project/date
  - ✅ Fix timecards table time fields to use TIMESTAMPTZ instead of TIME for real-time tracking (manual SQL migration created)
  - ✅ Add global settings for break duration configuration (escort vs staff)
  - ✅ Add shift limit and notification frequency settings to global configuration
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3, 9.4_

- [x] 2. Time Tracking State Management Hook





  - Create `useTimeTracking` hook with state machine logic that derives state from timecard records
  - Implement database persistence for timecard record updates (no separate status storage)
  - Add state restoration functionality that calculates current state from existing timecard data
  - Implement break duration enforcement with configurable defaults
  - Add role-specific workflow handling (escort vs supervisor/coordinator)
  - Create 20-hour shift limit monitoring with automatic stop and notification
  - Generate contextual information based on current state and scheduled times
  - _Requirements: 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.15, 3.1, 3.2, 3.3, 3.4, 3.7_

- [x] 3. Time Tracking Action Bar Component





  - Create `TimeTrackingActionBar` component with stateful button interface
  - Implement dynamic contextual information display below button based on current state
  - Add timer display for break duration tracking
  - Add grace period logic for break end timing
  - Create role-based button behavior (escort button disappears after break)
  - Implement shift duration tracking and overtime warnings
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.12, 1.13, 1.14, 3.5, 3.6_

- [x] 4. Timecard Calculation Engine





  - Create service for automatic timecard generation from time tracking data
  - Implement total hours calculation based on check-in/check-out times
  - Add break duration calculation with grace period handling
  - Integrate pay rate calculation from team_assignments table
  - Add manual edit detection and flagging logic
  - Implement real-time calculation updates as time tracking progresses
  - _Requirements: 4.1, 8.7, 9.5, 9.6, 9.7_

- [x] 5. Missing Break Resolution System





  - Create `MissingBreakResolutionModal` component for >6 hour shifts
  - Implement break validation logic for timecard submission
  - Add "Add Break" vs "I Did Not Take a Break" resolution options
  - Create submission blocking mechanism for unresolved missing breaks
  - Integrate resolution workflow with timecard submission process
  - _Requirements: 4.3, 4.4, 4.5, 4.6_

- [x] 6. Enhanced Timecard Submission Workflow






  - ✅ Basic timecard submission implemented in `TimecardList` component
  - ✅ Automatic timecard status transitions (draft → submitted)
  - ✅ Submission timestamp recording
  - ❌ Missing break validation logic for >6 hour shifts (requirement 4.3)
  - ❌ Submission blocking mechanism for unresolved missing breaks (requirement 4.4)
  - ❌ Post-submission view restrictions need proper implementation
  - ❌ Show day submission timing validation needs implementation
  - _Requirements: 4.2, 4.3, 4.4, 4.7, 4.8, 7.5, 9.8_

- [x] 7. Administrative Approval Interface Enhancements






  - ✅ Basic `SupervisorApprovalQueue` component with manual edit flagging
  - ✅ Comments system for timecard approval/rejection
  - ✅ Bulk approval functionality
  - ✅ Approval timestamp and approver recording
  - ❌ Two-way confirmation for administrator edits (requirement 5.3)
  - ❌ Role-based permission validation in approval interface (requirement 6.1-6.6)
  - ❌ Required comments validation for rejection workflow (requirement 5.4)
  - ❌ Proper validation checks before bulk approval (requirement 5.9)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 6.1-6.6_

- [ ] 8. Role-Based Permission System
  - Implement configurable approval permissions for in-house staff
  - Create global role settings for timecard approval rights
  - Add permission checking middleware for approval interfaces
  - Implement role-based UI filtering for timecard access
  - Create immediate permission updates for configuration changes
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 9. Notification System Integration
  - Create timecard-specific notification triggers and templates
  - Implement configurable reminder frequency for unsubmitted timecards
  - Add day-after-show-day reminder notifications
  - Create approval/rejection status notification system
  - Add 20-hour shift limit exceeded notifications
  - Integrate with existing notification infrastructure
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 1.15_

- [ ] 10. Audit Trail and Data Integrity System
  - Implement comprehensive audit logging for all timecard modifications
  - Create manual edit flagging and tracking system
  - Add approval/rejection audit trail with timestamps and users
  - Implement timecard status change logging
  - Create audit trail viewing interface for administrators
  - Add 20-hour shift automatic stop audit logging
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.8_

- [ ] 11. API Endpoints for Time Tracking Operations
  - Create `/api/timecards` base endpoints for CRUD operations
  - Create `/api/timecards/[id]/time-tracking` endpoints for state management
  - Implement real-time timecard record update endpoints (check-in, break, check-out)
  - Add timecard calculation and validation endpoints
  - Create submission workflow API endpoints
  - Implement approval workflow API endpoints with role validation
  - Add 20-hour shift limit monitoring and automatic stop endpoints
  - _Requirements: 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 4.7, 5.9, 5.10, 1.15_

- [ ] 12. Global Settings Management System

  - ✅ Global settings table created via system_settings table
  - ✅ Project-specific break duration configuration implemented
  - ✅ Settings validation and default value handling in project settings API
  - ❌ Global break duration configuration (escort vs staff) needs implementation
  - ❌ Notification frequency configuration needs implementation
  - ❌ Shift limit and overtime warning configurations need implementation
  - ❌ Settings change propagation to active sessions needs implementation
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 7.2, 1.15_

- [x] 13. Data Migration and Schema Updates

  - ✅ Migration script for enhanced timecards table structure (migration 005)
  - ✅ Database constraints for time sequence validation
  - ✅ Indexes for performance optimization (user_id, project_id, date, status)
  - ✅ Constraints to prevent duplicate timecards for same user/project/date
  - ✅ Data validation and integrity checks via database constraints
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

- [ ] 14. Component Testing Suite
  - Create unit tests for `useTimeTracking` hook state derivation logic
  - Implement tests for `TimeTrackingActionBar` component behavior and contextual information
  - Add integration tests for timecard calculation engine with team_assignments pay rates
  - Create tests for missing break resolution workflow
  - Implement approval workflow testing with role permissions
  - Add tests for 20-hour shift limit monitoring and automatic stop
  - Test state derivation from timecard records across various scenarios
  - _Requirements: All requirements - comprehensive testing coverage_

- [ ] 15. Error Handling and Recovery Systems
  - Implement network connectivity error handling for timecard updates
  - Create conflict resolution for concurrent timecard modifications
  - Add validation error handling for invalid time sequences
  - Implement graceful degradation for offline scenarios
  - Create user-friendly error messages and recovery guidance
  - Add error handling for state derivation failures
  - Implement 20-hour shift limit error handling and user notification
  - _Requirements: 3.4, 3.5, 3.6, 8.1, 8.4, 1.15_

- [ ] 16. Existing Component Integration and Enhancement
  - Integrate time tracking functionality with existing `TimecardList` component
  - Enhance existing `SupervisorApprovalQueue` with two-way confirmation workflow
  - Add missing break resolution integration to existing submission workflow
  - Update existing timecard page (`/timecards`) to support new time tracking features
  - Integrate with existing project settings for break duration configuration
  - _Requirements: 4.3, 4.4, 4.5, 4.6, 5.3, 5.4_

## Implementation Notes

### Current Status Summary
**Completed Infrastructure:**
- ✅ Database schema with enhanced timecards table (migration 005)
- ✅ Project-specific settings with break duration configuration (migration 030)
- ✅ Basic timecard list and approval queue components
- ✅ Submission and approval workflow functionality
- ✅ Database constraints and performance indexes

**Missing Core Components:**
- ❌ `useTimeTracking` hook for real-time state management
- ❌ `TimeTrackingActionBar` component for check-in/break/checkout workflow
- ❌ `MissingBreakResolutionModal` for >6 hour shift validation
- ❌ API endpoints for time tracking operations
- ❌ Global break duration settings (escort vs staff)

### Component Isolation Strategy
- Core time tracking components need to be built as standalone, reusable modules
- Existing timecard components provide foundation but need time tracking integration
- Components should be thoroughly tested in isolation before operational interface integration
- Integration points are clearly defined for future implementation

### State Management Architecture
- No separate status storage - all state derived from timecard records
- Current state calculated from check_in_time, break_start_time, break_end_time, check_out_time
- Real-time updates modify timecard records directly
- State restoration handled through timecard record analysis

### Database Architecture
- ✅ Single table approach using existing `timecards` table is implemented
- ✅ Draft timecard records serve as the source of truth for current state
- ✅ All time tracking data persisted immediately to timecard records
- ✅ Pay rates derived from team_assignments table for accurate individual rates

### Testing Approach
- Each component will have comprehensive unit tests
- Integration tests will focus on database operations and API endpoints
- Mock data will be used to simulate various timecard scenarios
- Performance testing will ensure real-time updates don't impact system performance
- Special focus on testing state derivation logic from timecard records

### Future Integration Points
- `TimeTrackingActionBar` designed to be embedded in operational interfaces
- Hook-based architecture allows easy integration with existing components
- API endpoints designed to support both current and future UI requirements
- Component props designed for flexible integration scenarios
- Contextual information system ready for integration with scheduling data