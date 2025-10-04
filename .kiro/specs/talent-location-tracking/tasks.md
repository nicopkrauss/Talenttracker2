# Implementation Plan

- [ ] 1. Set up database schema and API foundations

  - ✅ Database schema already exists (talent_status, team_assignments tables)
  - ✅ Basic API endpoint exists at `/api/projects/[id]/talent-location-update`
  - ❌ Missing floater designation columns in team_assignments table
  - ❌ Missing database indexes for efficient talent access queries
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 2. Add floater designation to team assignments schema
  - Add is_floater boolean column with default false to team_assignments table
  - Add floater_designated_at timestamp column to team_assignments table
  - Add floater_designated_by foreign key to profiles table in team_assignments
  - Create database migration script for schema changes
  - Add database indexes for efficient floater queries
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 3. Implement floater assignment management
  - Create FloaterAssignmentManager component for project team assignments interface
  - Add floater toggle controls to existing roles-team-tab.tsx component
  - Implement API endpoint for updating floater designation status
  - Add validation to ensure only authorized users can designate floaters
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 4. Create talent access control system
  - Implement useTalentAccess hook to determine which talent a user can manage
  - Add logic for floater vs assigned escort access patterns
  - Create talent access validation utilities for both client and server
  - Integrate access control with existing role-based permission system
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5. Update navigation system for operational vs database views
  - Modify navigation-config.ts to support role-based navigation items
  - Create separate navigation paths for operational users (Team, Talent) vs admin users (Team Database, Talent Database)
  - Update NavigationLayout component to handle new navigation structure
  - Ensure proper role-based filtering of navigation items
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 6. Create project-specific talent detail page with location tracking
  - Create new project-specific talent detail page at app/(app)/projects/[id]/talent/[talentId]/page.tsx
  - Integrate existing TimeTrackingActionBar component into talent detail layout
  - Add talent name and photo display at the top of the page
  - Implement check-in status integration to control page access for escorts
  - Create different views for checked-out escorts (call time display)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 7. Enhance existing TalentLocationTracker component


  - ✅ Component already exists with basic functionality
  - ✅ Has location update capabilities and history display
  - ✅ Integrates with existing API endpoint
  - ❌ Missing real-time capabilities
  - ❌ Missing access control integration
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 8. Create location update controls interface
  - Build LocationUpdateControls component with touch-friendly button grid
  - Implement color-coded location buttons matching project location colors
  - Add loading states and error handling for location updates
  - Create optimistic UI updates with rollback capability on failure
  - Ensure minimum 44px touch targets for mobile accessibility
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 9. Enhance talent location update API endpoints
  - ✅ Basic API route exists at `/api/projects/[id]/talent-location-update`
  - Add validation for user permissions and talent access rights
  - Implement database transaction for location updates with audit logging
  - Add rate limiting to prevent abuse of location update endpoints
  - Create error handling with appropriate HTTP status codes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 10. Set up real-time location synchronization
  - Configure Supabase Realtime subscriptions for talent_status table changes
  - Implement real-time event broadcasting for location updates
  - Create client-side real-time update handlers with conflict resolution
  - Add connection recovery and offline queue management
  - Implement last-write-wins conflict resolution strategy
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 11. Add representative contact visibility controls
  - ✅ Representative contact display already exists in global talent detail page
  - Implement role-based visibility for representative contact information in project context
  - Create RepresentativeContactSection component with conditional rendering
  - Add click-to-contact functionality for phone and email
  - Ensure talent escorts never see representative contact information
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 12. Implement contact escort functionality
  - Add ContactEscortButton component with conditional visibility
  - Hide contact escort button when user is viewing their own assigned talent
  - Implement click-to-call and click-to-message functionality
  - Add proper error handling for communication failures
  - Integrate with existing team assignment data to find assigned escorts
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 13. Create location history and audit trail interface
  - ✅ Basic location history exists in TalentLocationTracker component
  - Enhance LocationHistorySection component with better formatting
  - Display timestamps, locations, and users who made changes
  - Add duration calculations for time spent at each location
  - Implement pagination for large location history datasets
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 14. Implement notification system for location changes
  - ✅ Basic notification creation exists in API endpoint
  - Enhance notification logic for assigned talent location changes (excluding self-updates)
  - Implement favorites-based notifications for floaters and supervisors/coordinators
  - Create notification preference management interface
  - Integrate with existing notification delivery system
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 15. Add talent favorites system for notifications
  - Create TalentFavoriteButton component with star icon toggle
  - Implement API endpoints for managing user talent favorites
  - Add favorites filtering and priority display in talent lists
  - Create notification preferences tied to favorites system
  - Ensure favorites are project-specific and role-appropriate
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 16. Create responsive mobile-first interface
  - Ensure all location buttons meet minimum 44px touch target requirements
  - Implement responsive layouts that adapt between mobile and desktop
  - Add touch gesture support for mobile interactions
  - Create proper spacing and visual hierarchy for mobile screens
  - Test interface across different screen sizes and orientations
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 17. Implement comprehensive error handling and recovery
  - Create error boundary components for location tracking interfaces
  - Add retry mechanisms with exponential backoff for failed requests
  - Implement graceful degradation when real-time connections fail
  - Create user-friendly error messages with actionable guidance
  - Add error logging and monitoring for debugging and improvement
  - _Requirements: 3.6, 4.6, 11.4_

- [ ]* 18. Add comprehensive testing coverage
  - Write unit tests for all new components and hooks
  - Create integration tests for real-time location updates
  - Add end-to-end tests for complete user workflows by role
  - Test permission enforcement across different user roles
  - Create performance tests for real-time scalability
  - _Requirements: All requirements validation_

- [ ] 19. Create project-specific talent operational interface
  - Build new operational talent list page for supervisors, coordinators, and escorts
  - Implement project-based talent filtering and display
  - Add quick location update controls directly in talent list
  - Create search and filtering capabilities for operational efficiency
  - Integrate with existing talent assignment and status data
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 6.1, 6.2, 6.3, 6.4, 6.5, 12.3_

- [ ] 20. Integrate with existing project management workflow
  - Update project setup checklist to include talent location configuration
  - Add location tracking status to project dashboard and statistics
  - Create project-level location management interface for administrators
  - Ensure location tracking works with existing project lifecycle management
  - Add location tracking metrics to project reporting
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 21. Finalize system integration and deployment preparation
  - Create database migration scripts for production deployment
  - Add feature flags for gradual rollout of location tracking features
  - Create user documentation and training materials
  - Implement monitoring and alerting for location tracking system health
  - Perform final integration testing with existing systems
  - _Requirements: All requirements integration and deployment_