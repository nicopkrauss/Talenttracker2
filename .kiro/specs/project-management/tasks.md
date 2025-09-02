# Implementation Plan

- [x] 1. Set up database schema and migrations for project management
  - Create migration file for projects table with all required fields
  - Create migration file for project_setup_checklist table
  - Create migration file for project_roles table  
  - Create migration file for project_locations table
  - Add necessary indexes for performance optimization
  - _Requirements: 1.3, 1.4, 1.5, 3.1, 4.1, 5.1_

- [x] 2. Create core project data models and TypeScript interfaces
  - Define Project interface with all fields from design
  - Define ProjectSetupChecklist interface for tracking completion
  - Define ProjectRole interface for role configuration
  - Define ProjectLocation interface for location management
  - Create form data interfaces for creation and editing
  - _Requirements: 1.3, 3.2, 4.2, 5.2_

- [x] 3. Create project API routes
  - Implement GET /api/projects route with role-based filtering
  - Implement POST /api/projects route for project creation
  - Implement GET /api/projects/[id] route for project details
  - Implement PUT /api/projects/[id] route for project updates
  - Implement POST /api/projects/[id]/activate route for status changes
  - Add proper error handling and validation to all routes
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 3.5, 6.7, 7.3, 7.4_

- [x] 4. Build project form components
  - Create ProjectForm component for creation and editing
  - Implement form validation with real-time feedback
  - Add date validation ensuring start date is before end date
  - Handle both required fields (name, dates) and optional fields
  - Create reusable form field components for consistency
  - _Requirements: 1.2, 1.3, 1.5, 7.2, 7.5_

- [x] 5. Implement project list and card components
  - Create ProjectCard component with role-based action buttons
  - Implement ProjectHub component for project listing
  - Add empty state handling when no projects exist
  - Create loading states and error handling for project lists
  - Implement project status indicators and progress displays
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 6.4, 6.5_

- [x] 6. Create project pages and routing
  - Create /projects route for project hub
  - Create /projects/new route for project creation
  - Create /projects/[id] route for project details
  - Create /projects/[id]/edit route for project editing
  - Integrate with existing navigation system
  - _Requirements: 1.1, 2.3, 7.1_

- [x] 7. Create project setup checklist database schema
  - Create migration for project_setup_checklist table
  - Update Prisma schema to add setup checklist model and relationships
  - Rename talent_locations to project_locations for clarity
  - Add missing fields to project_locations (is_default, sort_order)
  - Add indexes for performance optimization
  - _Requirements: 3.1, 4.1, 5.1_

- [x] 8. Build project detail view and setup checklist UI
  - Update ProjectDetailView component with setup checklist display
  - Implement checklist progress tracking and completion status
  - Add project activation functionality when checklist is complete
  - Create edit project functionality within detail view
  - Handle role-based access to different sections
  - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.6_

- [x] 9. Implement project roles and pay rate management
  - Create role configuration interface within project setup
  - Add base pay rate setting functionality for each role
  - Implement validation for positive pay rate values
  - Create UI for marking roles and pay as complete
  - Handle modification of finalized roles with checklist updates
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10. Enhance project API routes with setup checklist functionality
  - Update project detail API to include setup checklist data
  - Add API routes for updating checklist completion status
  - Implement setup checklist validation in project activation
  - Add proper error handling for checklist-related operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 11. Implement role-based project access control
  - Add middleware for project access validation
  - Implement admin access to all projects
  - Create in-house user project assignment filtering
  - Add supervisor/TLC/escort active project filtering
  - Implement inactive project card display with restricted access
  - Add "View My Timecard" button for inactive projects with user timecards
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 12. Create project archival system
  - Implement archive project functionality for completed projects
  - Create archived projects section in project hub
  - Add unarchive functionality for reactivating projects
  - Ensure all associated data is preserved during archival
  - Add date-based archive suggestions for past end dates
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 13. Implement comprehensive error handling and validation
  - Add client-side form validation with immediate feedback
  - Implement server-side validation as backup
  - Create user-friendly error messages for all scenarios
  - Add loading states and error boundaries for all components
  - Handle concurrent modification scenarios gracefully
  - _Requirements: 1.5, 7.3, 7.4, 7.5_

- [x] 14. Create comprehensive test suite
  - Write unit tests for all project service methods
  - Create component tests for ProjectForm, ProjectCard, and ProjectHub
  - Add integration tests for all API routes
  - Implement end-to-end tests for complete project workflows
  - Create test data factories for consistent test setup
  - _Requirements: All requirements validation through testing_

- [x] 15. Restructure project detail page with new layout and header





  - Create sticky header with project title, status badge, and quick actions
  - Add project overview card with comprehensive project stats
  - Implement tabbed navigation for prep status projects
  - Create operations mode layout for active projects
  - Add responsive design for mobile and desktop views
  - _Follow wireframe: project-details-wireframe.md_
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 16. Add project statistics and KPI tracking





  - Add talent_expected field to projects table
  - Create API endpoints for project statistics (talent counts, staff counts)
  - Implement real-time KPI calculations for active projects
  - Add shift duration tracking and alert system
  - Create staff check-in status tracking
  - _Requirements: 9.5, 14.1, 14.5_

- [x] 17. Build Info tab with enhanced project details





  - Create editable description text block component
  - Build talent locations manager with default locations (House, Holding, Stage)
  - Add location creation with name, abbreviation, and color picker
  - Implement location sorting and management UI
  - Create locations checklist completion functionality
  - _Follow wireframe: project-details-wireframe.md - Info Tab section_
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 18. Create Roles & Team tab with assignment interface





  - Build role definition table showing Supervisor ($300/day, Daily), Escort ($20/hr, Hourly), and Talent Logistics Coordinator ($350/day, Daily) with base pay, time type, and assignment counts
  - Create filterable staff list with multiple filter options (name search, role, location, status, experience level)
  - Add bulk selection with "Select All" checkbox and bulk assignment to roles
  - Implement inline pay rate overrides and schedule notes for individual assignments
  - Create assignment summary showing role counts, total staff assigned, and estimated daily cost
  - Add "Finalize Team Assignments" button and checklist integration
  - Create API routes for team assignments (GET/POST/PUT /api/projects/[id]/team-assignments)
  - Create API route for available staff (GET /api/projects/[id]/available-staff)
  - _Follow wireframe: project-details-wireframe.md - Roles & Team Tab section_
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [ ] 19. Build Talent Roster tab with import and management
  - Create CSV import functionality for talent data
  - Build talent table with sorting and filtering capabilities
  - Add manual talent entry form
  - Implement bulk actions toolbar (export, remove, reassign escort)
  - Create "Finalize Talent Roster" button and checklist integration
  - _Follow wireframe: project-details-wireframe.md - Talent Roster Tab section_
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 20. Create Assignments tab with drag-and-drop pairing
  - Build two-column layout with unassigned talent and escort cards
  - Implement drag-and-drop talent-escort pairing functionality
  - Add "Randomize Remaining" and "Clear All Assignments" actions
  - Create roster list showing talent-escort pairs
  - Integrate with team assignments checklist completion
  - _Follow wireframe: project-details-wireframe.md - Assignments Tab section_
  - _Requirements: 12.3, 12.4, 12.5_

- [ ] 21. Build Settings tab with project configuration
  - Connect existing UI to backend API for default break duration setting
  - Implement functional payroll export configuration options
  - Create notification rules management interface and backend integration
  - Connect audit log display to real project changes data
  - Implement functional attachments and notes with file upload
  - _Follow wireframe: project-details-wireframe.md - Settings Tab section_
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 22. Complete operations mode dashboard for active projects
  - Fix Supabase client import issues and complete live KPIs section implementation
  - Complete talent locations board with real-time status tracking and quick-move actions
  - Finish team status board with shift duration alerts and color-coded warnings
  - Implement functional supervisor checkout controls with multi-select functionality
  - Add real-time data subscriptions and WebSocket connections for live updates
  - _Follow wireframe: project-details-wireframe.md - Operations Mode section_
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 23. Add project location management API routes
  - Create GET /api/projects/[id]/locations route for fetching project locations
  - Create POST /api/projects/[id]/locations route for adding new locations
  - Create PUT /api/projects/[id]/locations/[locationId] route for updating locations
  - Create DELETE /api/projects/[id]/locations/[locationId] route for removing locations
  - Create POST /api/projects/[id]/locations/complete route for marking locations checklist complete
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 24. Add unarchive functionality and enhanced archival management
  - Create POST /api/projects/[id]/unarchive route for reactivating archived projects
  - Add unarchive button to archived project cards
  - Implement date-based archive suggestions for past end dates
  - Add confirmation dialogs for archive/unarchive actions
  - Create archived projects filtering and management interface
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 25. Complete team assignments API implementation
  - Create GET /api/projects/[id]/team-assignments route for fetching project team assignments
  - Create POST /api/projects/[id]/team-assignments route for creating team assignments
  - Create PUT /api/projects/[id]/team-assignments/[assignmentId] route for updating assignments
  - Create DELETE /api/projects/[id]/team-assignments/[assignmentId] route for removing assignments
  - Create POST /api/projects/[id]/team-assignments/complete route for marking checklist complete
  - Create GET /api/projects/[id]/available-staff route for fetching available staff for assignment
  - _Requirements: 11.2, 11.4, 11.5, 11.7, 11.8_

- [ ] 26. Add talent roster and assignments API routes
  - Create GET /api/projects/[id]/talent-roster route for fetching project talent
  - Create POST /api/projects/[id]/talent-roster route for adding talent (manual entry)
  - Create POST /api/projects/[id]/talent-roster/import route for CSV import
  - Create PUT /api/projects/[id]/talent-roster/[talentId] route for updating talent
  - Create DELETE /api/projects/[id]/talent-roster/[talentId] route for removing talent
  - Create POST /api/projects/[id]/talent-roster/complete route for marking roster complete
  - Create GET /api/projects/[id]/talent-assignments route for fetching talent-escort assignments
  - Create POST /api/projects/[id]/talent-assignments route for creating assignments
  - Create PUT /api/projects/[id]/talent-assignments/[assignmentId] route for updating assignments
  - Create POST /api/projects/[id]/talent-assignments/randomize route for randomizing remaining assignments
  - Create DELETE /api/projects/[id]/talent-assignments/clear route for clearing all assignments
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 27. Add project settings and audit API routes
  - Create GET /api/projects/[id]/settings route for fetching project configuration
  - Create PUT /api/projects/[id]/settings route for updating project settings
  - Create GET /api/projects/[id]/audit-log route for fetching project audit history
  - Create POST /api/projects/[id]/attachments route for uploading project files
  - Create GET /api/projects/[id]/attachments route for fetching project attachments
  - Create DELETE /api/projects/[id]/attachments/[attachmentId] route for removing attachments
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 28. Enhance role-based access with team assignment filtering
  - Implement project assignment filtering for non-admin users
  - Add "View My Timecard" button for inactive projects with user timecards
  - Create middleware for project access validation based on assignments
  - Add proper access control for project detail views and tabs
  - Implement role-based feature restrictions within project interface
  - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_