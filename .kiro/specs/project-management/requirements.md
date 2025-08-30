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

1. WHEN I access project role management THEN the system SHALL display existing roles (Admin, In-House, Supervisor, Talent Logistics Coordinator, Talent Escort)
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
3. WHEN I am a Supervisor, Talent Logistics Coordinator, or Escort THEN the system SHALL show only active projects where I am assigned
4. WHEN I am a Supervisor, Talent Logistics Coordinator, or Escort AND a project is no longer active THEN the system SHALL show the project list card but prevent access to project details
5. WHEN viewing an inactive project as Supervisor, Talent Logistics Coordinator, or Escort AND I have a submitted timecard or invoice THEN the system SHALL provide a "View My Timecard" or "View My Invoice" button
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