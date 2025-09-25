# Implementation Plan

- [x] 1. Create project statistics API endpoint






  - Create `/app/api/timecards/projects/stats/route.ts` to aggregate timecard statistics by project
  - Implement database queries to calculate total timecards, status breakdowns, hours, and pay by project
  - Add role-based filtering so admins see all projects and regular users see only their projects
  - Include error handling and proper response formatting
  - _Requirements: 1.3, 5.2, 5.3, 10.2_

- [x] 2. Create TimecardProjectCard component





  - Create `/components/timecards/timecard-project-card.tsx` based on existing ProjectCard design
  - Display project name, description, production company using same layout as ProjectCard
  - Show timecard-specific statistics: total timecards, status breakdown, total hours, total pay
  - Add "View Timecards" button that calls onSelectProject prop
  - Include pending approval indicators for admin users
  - _Requirements: 1.3, 5.1, 5.2, 5.4, 10.2_

- [x] 3. Create TimecardProjectHub component





  - Create `/components/timecards/timecard-project-hub.tsx` using ProjectHub as template
  - Implement search functionality for project name, description, and production company
  - Add filtering options for projects with draft, submitted, rejected timecards, and recent activity
  - Display TimecardProjectCard components in responsive grid layout
  - Handle loading states, empty states, and error states
  - _Requirements: 1.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Modify main timecards page for role-based routing





  - Update `/app/(app)/timecards/page.tsx` to check user role
  - For admin/in-house users: render TimecardProjectHub component
  - For regular users: maintain existing timecard list behavior
  - Add proper loading states and error handling for both paths
  - Ensure backward compatibility with existing functionality
  - _Requirements: 1.1, 3.1, 3.2, 7.1, 7.3_

- [x] 5. Create project-specific timecard page




  - Create `/app/(app)/timecards/project/[projectId]/page.tsx`
  - Implement project access validation using role-based permissions
  - Render existing timecard tabs (breakdown, approve, summary) with project filtering
  - Add breadcrumb navigation back to project selection
  - Handle invalid project IDs and access denied scenarios
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 4.2, 4.5, 4.6_

- [x] 6. Enhance timecards API with project filtering


  - ~~Modify `/app/api/timecards-v2/route.ts` to accept project_id query parameter~~ (Already implemented)
  - ~~Add database filtering to return only timecards for specified project~~ (Already implemented)
  - ~~Maintain existing functionality when no project filter is provided~~ (Already implemented)
  - ~~Ensure proper error handling and response formatting~~ (Already implemented)
  - Add validation for project access permissions (still needed)
  - _Requirements: 2.6, 3.4, 7.2, 7.4_

- [x] 7. Add project access validation to timecards API


  - Add validation for project access permissions in `/app/api/timecards-v2/route.ts`
  - Ensure users can only access timecards for projects they have permission to view
  - Implement proper error responses for unauthorized access
  - _Requirements: 2.6, 3.4, 7.2, 7.4_

- [x] 8. Create project-specific timecard components








  - Create reusable components that accept project filtering
  - Modify existing timecard tabs to work with project context
  - Add breadcrumb navigation for project-specific views
  - Ensure all existing timecard functionality works within project context
  - _Requirements: 2.3, 2.4, 2.5, 4.2, 4.3, 7.3, 7.4_

- [x] 9. Fix timecard details back button navigation



  - Modify TimecardList component to accept projectId prop and include it in timecard links
  - Update ProjectTimecardList to pass projectId to TimecardList
  - Modify timecard details page to use project ID from URL params for back navigation
  - Ensure back button correctly navigates to project timecard view when accessed from project context
  - _Requirements: 4.4, 4.5 - proper navigation flow between project and timecard views_

- [-] 10. Implement comprehensive testing

  - Write unit tests for new components (TimecardProjectHub, TimecardProjectCard)
  - Test project statistics API endpoint with different user roles
  - Create integration tests for role-based routing and project access validation
  - Test complete user workflows for admin and regular users
  - _Requirements: All requirements - comprehensive testing coverage_

- [x] 11. Add mobile responsiveness and accessibility





  - Ensure all new components work properly on mobile devices
  - Implement proper touch targets and mobile-optimized layouts
  - Add WCAG 2.1 AA compliance (ARIA labels, keyboard navigation, focus indicators)
  - Test search and filter functionality on touch devices
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_