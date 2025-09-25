# Project-Based Timecard Navigation Requirements

## Introduction

The current timecard system displays all timecards in a single list, which becomes difficult to navigate as users work on multiple projects. This feature will restructure the timecard interface to group timecards by project, providing a more organized and intuitive user experience. Admin users will first select a project from a project selection page (using the same UI design as the existing projects page), then view the familiar timecard breakdown, approve, and summary tabs for that specific project only. Regular users will continue to see their own timecards directly without the project selection step.

## Requirements

### Requirement 1: Project Selection Interface

**User Story:** As a user accessing the timecards section, I want to first see a project selection page that shows all projects I have timecards for, so that I can easily navigate to the specific project's timecard data.

#### Acceptance Criteria

1. WHEN an admin or in-house user navigates to /timecards THEN they SHALL see a project selection interface instead of the current timecard list
2. WHEN the project selection page loads THEN it SHALL display project cards using the same UI design as the projects page but with timecard-specific information instead of project management information
3. WHEN displaying project cards THEN each card SHALL show:
   - Project name and description
   - Total timecard count for the user on that project
   - Status breakdown (draft, submitted, approved, rejected counts)
   - Total hours worked on the project
   - Total pay earned from the project
   - Last timecard submission date
4. WHEN an admin has no timecards to review for any project THEN they SHALL see an empty state indicating no timecards are available for review
5. WHEN a user clicks on a project card THEN they SHALL navigate to the project-specific timecard view at /timecards/[projectId]
6. WHEN loading project timecard data THEN the system SHALL show appropriate loading states
7. WHEN there are errors loading project data THEN the system SHALL display clear error messages with retry options

### Requirement 2: Project-Specific Timecard View

**User Story:** As a user who has selected a project, I want to see the familiar timecard breakdown, approve, and summary tabs but filtered to show only timecards for that specific project, so that I can focus on one project at a time.

#### Acceptance Criteria

1. WHEN a user navigates to /timecards/[projectId] THEN they SHALL see the existing timecard interface (breakdown, approve, summary tabs) filtered to the selected project
2. WHEN viewing project-specific timecards THEN the existing timecard page header SHALL remain unchanged, with project context indicated through URL and breadcrumb navigation
3. WHEN on the breakdown tab (for admins) THEN it SHALL show only timecards for the selected project
4. WHEN on the approve tab (for admins) THEN it SHALL show only submitted timecards for the selected project
5. WHEN on the summary tab (for admins) THEN it SHALL show payroll summary data filtered to the selected project
6. WHEN filtering by status THEN the filters SHALL apply only to timecards within the selected project
7. WHEN a user has no timecards for the selected project THEN they SHALL see an appropriate empty state
8. WHEN navigating back from project-specific view THEN the user SHALL return to the project selection page

### Requirement 3: Role-Based Project Access

**User Story:** As a user with different roles, I want to see only the projects I have access to in the timecard project selection, so that I don't see irrelevant project data.

#### Acceptance Criteria

1. WHEN a regular user (escort, supervisor, coordinator) accesses /timecards THEN they SHALL bypass the project selection and go directly to their own timecards view since they typically have only one timecard per project
2. WHEN an admin or in-house user accesses timecard project selection THEN they SHALL see all projects that have any timecards submitted by any user
3. WHEN determining project access THEN the system SHALL use the same role-based permissions as the existing timecard system
4. WHEN a user has different roles on different projects THEN their access SHALL be determined by their highest permission level
5. WHEN project access changes THEN the timecard project selection SHALL reflect the updated permissions immediately

### Requirement 4: Navigation and URL Structure

**User Story:** As a user navigating the timecard system, I want clear and bookmarkable URLs that reflect the current project context, so that I can easily return to specific project timecard views.

#### Acceptance Criteria

1. WHEN accessing /timecards THEN the user SHALL see the project selection interface
2. WHEN accessing /timecards/project/[projectId] THEN the user SHALL see the project-specific timecard view
3. WHEN accessing /timecards/project/[projectId]/[timecardId] THEN the user SHALL see the individual timecard detail view with project context
4. WHEN a user bookmarks a project-specific timecard URL THEN they SHALL be able to return directly to that view
5. WHEN a user navigates using browser back/forward buttons THEN the navigation SHALL work correctly between project selection and project-specific views
6. WHEN a user accesses an invalid project ID THEN they SHALL see an appropriate error message and be redirected to project selection
7. WHEN a user accesses a project they don't have permission to view THEN they SHALL see an access denied message

### Requirement 5: Project Card Information Display

**User Story:** As a user selecting a project for timecard management, I want to see relevant timecard statistics on each project card, so that I can quickly understand my timecard status for each project.

#### Acceptance Criteria

1. WHEN displaying project cards THEN each card SHALL show the project name, date, and location
2. WHEN displaying timecard statistics THEN each card SHALL show:
   - Total number of timecards for the users on this project
   - Breakdown by status (X draft, Y submitted, Z approved, W rejected)
   - Total hours worked across all timecards
   - Total pay earned across all approved timecards
3. WHEN calculating totals THEN the system SHALL use the same calculation logic as the existing timecard system
4. WHEN displaying pay information THEN it SHALL show totals for all timecards and only approved timecards
5. WHEN a project has no timecards THEN it SHALL appear in the project selection list

### Requirement 6: Search and Filtering on Project Selection

**User Story:** As a user with many projects, I want to search and filter the project selection page, so that I can quickly find the project I need to work on.

#### Acceptance Criteria

1. WHEN the project selection page has multiple projects THEN it SHALL include a search input field
2. WHEN searching THEN the user SHALL be able to search by project name, description, or production company
3. WHEN filtering THEN the user SHALL be able to filter projects by:
   - Projects with draft timecards
   - Projects with submitted timecards
   - Projects with rejected timecards
   - Projects with recent activity (last 30 days)
4. WHEN search or filter criteria are applied THEN the project cards SHALL update in real-time
5. WHEN no projects match the search/filter criteria THEN an appropriate "no results" message SHALL be displayed
6. WHEN clearing search/filter criteria THEN all accessible projects SHALL be displayed again

### Requirement 7: Backward Compatibility and Migration

**User Story:** As a user familiar with the current timecard system, I want the new project-based navigation to feel familiar and not break existing functionality, so that I can continue working efficiently.

#### Acceptance Criteria

1. WHEN the new project-based navigation is implemented THEN all existing timecard functionality SHALL continue to work within project-specific views
2. WHEN the breakdown, approve, and summary tabs are displayed THEN they SHALL maintain their current functionality and appearance
3. WHEN individual timecard detail pages are accessed THEN they SHALL continue to work with the same features
4. WHEN API endpoints are called THEN they SHALL continue to return the same data structure with project filtering applied

### Requirement 8: Performance and Loading States

**User Story:** As a user accessing timecard data, I want the project selection and project-specific views to load quickly and provide clear feedback during loading, so that I have a smooth user experience.

#### Acceptance Criteria

1. WHEN loading the project selection page THEN it SHALL display a loading state while fetching project data
2. WHEN loading project-specific timecard data THEN it SHALL display appropriate loading indicators
3. WHEN project data is cached THEN subsequent visits SHALL load faster
4. WHEN switching between projects THEN the transition SHALL be smooth with minimal loading time
5. WHEN there are network errors THEN the system SHALL provide clear error messages and retry options
6. WHEN data is being refreshed THEN the user SHALL see appropriate loading indicators without losing their current view
7. WHEN large amounts of timecard data exist THEN the system SHALL implement pagination or virtual scrolling as needed

### Requirement 9: Mobile Responsiveness

**User Story:** As a mobile user, I want the project selection and project-specific timecard views to work well on my mobile device, so that I can manage timecards on the go.

#### Acceptance Criteria

1. WHEN accessing the project selection page on mobile THEN the project cards SHALL be displayed in a single column layout
2. WHEN viewing project cards on mobile THEN all important information SHALL be clearly visible and readable
3. WHEN navigating between project selection and project-specific views on mobile THEN the navigation SHALL be touch-friendly
4. WHEN using the search and filter functionality on mobile THEN the interface SHALL be optimized for touch input
5. WHEN viewing project-specific timecard tabs on mobile THEN they SHALL maintain the existing mobile-optimized layout
6. WHEN accessing individual timecard details on mobile THEN the project context SHALL be clearly displayed
7. WHEN using mobile navigation THEN the breadcrumb and back navigation SHALL work intuitively

### Requirement 10: Admin Experience Enhancement

**User Story:** As an administrator, I want the project-based timecard navigation to help me efficiently manage timecards across multiple projects, so that I can process approvals more effectively.

#### Acceptance Criteria

1. WHEN an admin accesses the project selection page THEN they SHALL see all projects with pending timecard actions highlighted
2. WHEN an admin selects a project THEN the approve tab SHALL show all submitted timecards for that project
3. WHEN processing approvals within a project THEN the admin SHALL complete all approvals for that project before moving to another project
4. WHEN viewing the summary tab THEN payroll data SHALL be filtered to the selected project
5. WHEN an admin needs to see cross-project data THEN there SHALL be a way to access overall system statistics