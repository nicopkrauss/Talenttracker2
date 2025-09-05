# Requirements Document

## Introduction

The Project Management system is a core feature that enables administrators and in-house users to create, configure, and manage live production projects within the Talent Tracker application. This system serves as the foundation for all other operations including talent management, team assignments, and time tracking. Projects follow a lifecycle from preparation to active status, with comprehensive setup requirements that must be completed before activation.

## Requirements

### Requirement 1

**User Story:** As an Admin or In-House user, I want to create new projects with basic information, so that I can establish the foundation for managing a live production.

#### Acceptance Criteria

1. WHEN I navigate to the projects page THEN the system SHALL display a "Create New Project" button
2. WHEN I click "Create New Project" THEN the system SHALL display a project creation form
3. WHEN I fill out the project form THEN the system SHALL require project name, start date, and end date as mandatory fields
4. WHEN I fill out the project form THEN the system SHALL provide optional fields for production company, hiring contact, project location, and description
5. WHEN I submit a valid project form THEN the system SHALL create the project with "Prep" status
6. WHEN I submit an invalid project form THEN the system SHALL display validation errors and prevent submission

### Requirement 2

**User Story:** As an Admin or In-House user, I want to view all projects I have access to, so that I can manage multiple productions efficiently.

#### Acceptance Criteria

1. WHEN I access the projects page THEN the system SHALL display a list of all projects I have access to
2. WHEN viewing the project list THEN the system SHALL show project name, status, start date, end date, and progress indicators
3. WHEN I click on a project THEN the system SHALL navigate to the project detail page
4. WHEN there are no projects THEN the system SHALL display an empty state with guidance to create the first project
5. WHEN projects are loading THEN the system SHALL display appropriate loading indicators

### Requirement 3

**User Story:** As an Admin or In-House user, I want to configure project settings and complete setup requirements, so that the project can be activated for operational use.

#### Acceptance Criteria

1. WHEN I view a project in "Prep" status THEN the system SHALL display a setup checklist with four items
2. WHEN viewing the setup checklist THEN the system SHALL show "Add Project Roles & Pay Rates", "Finalize Talent Roster", "Finalize Team Assignments", and "Define Talent Locations"
3. WHEN I complete a checklist item THEN the system SHALL mark it as completed and update the project progress
4. WHEN all checklist items are completed THEN the system SHALL enable the "Activate Project" button
5. WHEN I activate a project THEN the system SHALL change the status from "Prep" to "Active"

### Requirement 4

**User Story:** As an Admin or In-House user, I want to manage project roles and pay rates, so that team members can be assigned with appropriate compensation.

#### Acceptance Criteria

1. WHEN I access project role management THEN the system SHALL display existing roles (Admin, In-House, Supervisor, Coordinator, Talent Escort)
2. WHEN I configure a role THEN the system SHALL allow setting base pay rates for that role
3. WHEN I save role configurations THEN the system SHALL validate pay rates are positive numbers
4. WHEN roles are configured THEN the system SHALL mark "Add Project Roles & Pay Rates" as complete
5. WHEN I modify finalized roles THEN the system SHALL untick the checklist item but maintain "Active" status

### Requirement 5

**User Story:** As an Admin or In-House user, I want to define project locations, so that talent can be tracked and managed across different areas of the production.

#### Acceptance Criteria

1. WHEN I access location management THEN the system SHALL provide default locations (House, Holding, Stage)
2. WHEN I manage locations THEN the system SHALL allow adding, editing, and removing custom locations
3. WHEN I save location configurations THEN the system SHALL validate location names are unique within the project
4. WHEN locations are defined THEN the system SHALL mark "Define Talent Locations" as complete
5. WHEN I modify finalized locations THEN the system SHALL untick the checklist item but maintain "Active" status

### Requirement 6

**User Story:** As a user with appropriate permissions, I want to see projects filtered by my role and access level, so that I only see relevant projects.

#### Acceptance Criteria

1. WHEN I am an Admin THEN the system SHALL show all projects in the system
2. WHEN I am an In-House user THEN the system SHALL show projects where I have been assigned
3. WHEN I am a Supervisor, Coordinator, or Escort THEN the system SHALL show only active projects where I am assigned
4. WHEN I am a Supervisor, Coordinator, or Escort AND a project is no longer active THEN the system SHALL show the project list card but prevent access to project details
5. WHEN viewing an inactive project as Supervisor, Coordinator, or Escort AND I have a submitted timecard or invoice THEN the system SHALL provide a "View My Timecard" or "View My Invoice" button
6. WHEN I have no project assignments THEN the system SHALL display an appropriate message
7. WHEN my project access changes THEN the system SHALL update the visible projects immediately

### Requirement 7

**User Story:** As an Admin or In-House user, I want to edit project details, so that I can update information as production requirements change.

#### Acceptance Criteria

1. WHEN I view a project detail page THEN the system SHALL provide an "Edit Project" option
2. WHEN I edit project details THEN the system SHALL allow modifying all project fields including name, production company, hiring contact, project location, start date, end date, and description
3. WHEN I save project changes THEN the system SHALL validate the updated information
4. WHEN I cancel editing THEN the system SHALL revert to the original project information
5. WHEN project dates change THEN the system SHALL validate that start date is before end date
6. WHEN I update project information THEN the system SHALL preserve all existing project data including roles, talent roster, and team assignments

### Requirement 8

**User Story:** As an Admin, I want to archive completed projects, so that the active project list remains manageable while preserving historical data.

#### Acceptance Criteria

1. WHEN a project end date has passed THEN the system SHALL provide an "Archive Project" option
2. WHEN I archive a project THEN the system SHALL move it to an archived state
3. WHEN viewing archived projects THEN the system SHALL display them in a separate section
4. WHEN a project is archived THEN the system SHALL preserve all associated data (timecards, talent, assignments)
5. WHEN I need to reactivate an archived project THEN the system SHALL provide an "Unarchive" option

### Requirement 9

**User Story:** As an Admin or In-House user, I want a comprehensive project details page that serves as the central hub for project management, so that I can efficiently manage all aspects of a project from one location.

#### Acceptance Criteria

1. WHEN I view a project details page THEN the system SHALL display a sticky header with project title, status badge, and quick actions
2. WHEN viewing project details THEN the system SHALL show a project overview card with comprehensive statistics including dates, location, production company, hiring contact, talent counts, and staff counts
3. WHEN a project is in "Prep" status THEN the system SHALL display tabbed navigation with Info, Roles & Team, Talent Roster, Assignments, and Settings tabs
4. WHEN a project is in "Active" status THEN the system SHALL display an operations dashboard with live KPIs, talent location tracking, and team status monitoring
5. WHEN viewing project statistics THEN the system SHALL show real-time counts of expected vs assigned talent and needed vs assigned staff

### Requirement 10

**User Story:** As an Admin or In-House user, I want to manage project information and locations through dedicated tabs, so that I can organize project setup efficiently.

#### Acceptance Criteria

1. WHEN I access the Info tab THEN the system SHALL provide an editable description field for project details
2. WHEN managing talent locations THEN the system SHALL display default locations (House, Holding, Stage) and allow adding custom locations with name, abbreviation, and color
3. WHEN adding custom locations THEN the system SHALL validate unique names within the project
4. WHEN I complete location setup THEN the system SHALL mark the locations checklist item as complete
5. WHEN locations are modified after finalization THEN the system SHALL update the checklist status accordingly

### Requirement 11

**User Story:** As an Admin or In-House user, I want to configure team roles and assignments through a dedicated interface, so that I can manage project staffing effectively.

#### Acceptance Criteria

1. WHEN I access the Roles & Team tab THEN the system SHALL display a role definition table showing Supervisor ($300/day, Daily), Escort ($20/hr, Hourly), and Coordinator ($350/day, Daily) with base pay, time type, and assignment counts
2. WHEN managing team assignments THEN the system SHALL provide a filterable staff list with multiple filter options including name search, role, location, status, and experience level
3. WHEN filtering staff THEN the system SHALL allow combining multiple filters simultaneously and provide a "Clear Filters" option
4. WHEN selecting staff THEN the system SHALL provide bulk selection with "Select All" checkbox and bulk assignment to roles
5. WHEN assigning staff to roles THEN the system SHALL allow inline pay rate overrides and schedule notes for individual assignments
6. WHEN viewing assignments THEN the system SHALL display an assignment summary showing role counts, total staff assigned, and estimated daily cost
7. WHEN I finalize team assignments THEN the system SHALL mark the team assignments checklist item as complete
8. WHEN team assignments are modified after finalization THEN the system SHALL update the checklist status accordingly

### Requirement 12

**User Story:** As an Admin or In-House user, I want to manage talent roster through a simplified interface, so that I can efficiently view and organize talent for the project.

#### Acceptance Criteria

1. WHEN I access the Talent Roster tab THEN the system SHALL display talent in a card-based grid layout similar to the main talent page
2. WHEN viewing talent cards THEN the system SHALL show talent name and photo/avatar only for a clean, simplified interface
3. WHEN searching talent THEN the system SHALL filter by talent name only (first name and last name)
4. WHEN managing talent THEN the system SHALL provide CSV import functionality and manual talent entry options
5. WHEN I finalize talent roster THEN the system SHALL mark the talent roster checklist item as complete

### Requirement 13

**User Story:** As an Admin or In-House user, I want to configure project settings and view audit information, so that I can maintain project governance and track changes.

#### Acceptance Criteria

1. WHEN I access the Settings tab THEN the system SHALL provide configuration options for default break duration, payroll export format, and notification rules
2. WHEN viewing project history THEN the system SHALL display an audit log showing who made what changes and when
3. WHEN managing project documentation THEN the system SHALL allow uploading attachments and adding notes
4. WHEN project settings are changed THEN the system SHALL log the changes in the audit trail
5. WHEN accessing audit information THEN the system SHALL display changes in chronological order with user attribution

### Requirement 14

**User Story:** As an Admin or In-House user, I want to monitor active projects through a live operations dashboard, so that I can track project status and manage operations in real-time.

#### Acceptance Criteria

1. WHEN viewing an active project THEN the system SHALL display live KPIs including staff check-in status, talent presence, and shift duration alerts
2. WHEN monitoring talent locations THEN the system SHALL provide a real-time board showing each talent's current location with quick-move actions
3. WHEN managing team status THEN the system SHALL display current shift states, time worked, and overtime warnings with color-coded alerts
4. WHEN supervising staff THEN the system SHALL provide multi-select checkout controls for efficient shift management
5. WHEN shift durations exceed thresholds THEN the system SHALL display yellow warnings at 8 hours and red alerts at 12 hours