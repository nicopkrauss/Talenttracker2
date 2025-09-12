# Requirements Document

## Introduction

This feature enhances the Talent Tracker application to support multi-day production scheduling and talent group management. Productions typically involve multiple rehearsal days followed by show days, with different talent and escort requirements for each day. Additionally, some talent work as groups (bands, dance troupes) rather than individuals, requiring specialized management while maintaining the same assignment workflow. This system enables efficient scheduling, staff availability tracking, and flexible talent-escort assignments across multiple production days.

## Requirements

### Requirement 1

**User Story:** As an Admin or In-House user, I want the system to automatically calculate rehearsal and show days based on project start and end dates, so that I can establish the production timeline without manual day designation.

#### Acceptance Criteria

1. WHEN I create a new project THEN the system SHALL automatically determine rehearsal and show days from the start and end dates
2. WHEN I set project dates THEN the system SHALL designate the end date as the show day and all preceding days as rehearsal days
3. WHEN I have a single-day project THEN the system SHALL designate that day as a show day
4. WHEN I save the project THEN the system SHALL calculate and display the project schedule automatically
5. WHEN I edit project dates THEN the system SHALL recalculate the rehearsal and show day designations
6. WHEN viewing project details THEN the system SHALL display the calculated project schedule with clear rehearsal/show day indicators

### Requirement 2

**User Story:** As an Admin or In-House user, I want to manage team member availability through a confirmation workflow, so that I can track which staff are available for which days before making assignments.

#### Acceptance Criteria

1. WHEN I view team assignments THEN the system SHALL display "Pending Team Assignments" instead of "Current Team Assignments"
2. WHEN I have pending team members THEN the system SHALL provide a "Confirm" button for each team member
3. WHEN I click "Confirm" THEN the system SHALL open a popup asking me to enter their availability for each project day
4. WHEN I enter availability THEN the system SHALL use circular date selectors matching the project schedule
5. WHEN I confirm a team member THEN the system SHALL move them to a "Confirmed Team Members" section
6. WHEN viewing confirmed team members THEN the system SHALL display their availability instead of location and flight willingness information
7. WHEN I need to edit confirmed team members THEN the system SHALL provide edit and delete options

### Requirement 3

**User Story:** As an Admin or In-House user, I want to schedule individual talent for specific days, so that I can manage which talent attend rehearsals versus show days.

#### Acceptance Criteria

1. WHEN I view the talent roster tab THEN the system SHALL replace the Representative and Status columns with a Schedule column
2. WHEN I view talent scheduling THEN the system SHALL display circular date selectors for each project day
3. WHEN I click a date circle THEN the system SHALL toggle the talent's attendance for that day (filled = scheduled, empty = not scheduled)
4. WHEN I modify talent schedules THEN the system SHALL save the changes immediately
5. WHEN talent schedules change during operations THEN the system SHALL allow real-time updates
6. WHEN I view talent assignments THEN the system SHALL clearly show which days each talent is scheduled

### Requirement 4

**User Story:** As an Admin or In-House user, I want to create and manage talent groups (bands, dance troupes), so that I can assign one escort to manage multiple related performers.

#### Acceptance Criteria

1. WHEN I access the talent roster tab THEN the system SHALL provide an "Add Group" button alongside the existing "Add Talent" button
2. WHEN I click "Add Group" THEN the system SHALL open a modal for group creation
3. WHEN creating a group THEN the system SHALL require a group name and allow me to add multiple members with names and roles
4. WHEN I add group members THEN the system SHALL provide add/remove functionality for the member list
5. WHEN I save a group THEN the system SHALL create it as a talent entry with group designation
6. WHEN viewing talent roster THEN the system SHALL display groups with a "GROUP" badge
7. WHEN I schedule groups THEN the system SHALL use the same date selection interface as individual talent
8. WHEN groups are created THEN the system SHALL store member information for check-in tracking purposes

### Requirement 5

**User Story:** As an Admin or In-House user, I want to assign escorts to talent and groups using a simple day-based interface, so that I can efficiently manage assignments across multiple production days.

#### Acceptance Criteria

1. WHEN I access the Assignments tab THEN the system SHALL display a segmented control for day selection showing all project days
2. WHEN I select a day THEN the system SHALL show only talent and groups scheduled for that day
3. WHEN I view talent assignments THEN the system SHALL display each talent/group with a searchable dropdown for escort selection
4. WHEN I open an escort dropdown THEN the system SHALL organize options into sections: "Available", "Already Assigned Rehearsal Day" (rehearsal days only), and "Already Assigned for [Current Day]"
5. WHEN I assign an escort THEN the system SHALL update all related dropdowns immediately to reflect the new assignment
6. WHEN I switch between days THEN the system SHALL retain all assignment information I have already set
7. WHEN I make assignments THEN the system SHALL allow the same escort to be assigned to different talent on different days
8. WHEN viewing show day assignments THEN the system SHALL only show "Available" escorts (no sectioning needed)

### Requirement 6

**User Story:** As an Admin or In-House user, I want to clear all assignments with proper confirmation, so that I can reset the assignment process when needed.

#### Acceptance Criteria

1. WHEN I view the assignments interface THEN the system SHALL provide a "Clear All Assignments" button
2. WHEN I click "Clear All Assignments" THEN the system SHALL display a confirmation dialog
3. WHEN I confirm clearing assignments THEN the system SHALL remove all talent-escort pairings for the current project
4. WHEN assignments are cleared THEN the system SHALL update all dropdowns to show all escorts as available
5. WHEN I cancel the clear operation THEN the system SHALL maintain all existing assignments

### Requirement 7

**User Story:** As an Admin or In-House user, I want the system to handle schedule changes gracefully, so that I can adapt to production changes without losing assignment data.

#### Acceptance Criteria

1. WHEN talent schedule changes and they have an assigned escort THEN the system SHALL default to unlinking the escort from the talent
2. WHEN I modify talent schedules THEN the system SHALL preserve escort assignments for days that remain unchanged
3. WHEN escort availability changes THEN the system SHALL update assignment dropdowns to reflect new availability
4. WHEN I reassign escorts THEN the system SHALL handle conflicts by updating all affected assignments
5. WHEN schedule conflicts occur THEN the system SHALL provide clear feedback about assignment impacts

### Requirement 8

**User Story:** As a system administrator, I want the database to efficiently store multi-day scheduling and group data using calculated schedules, so that the application performs well with complex assignment scenarios.

#### Acceptance Criteria

1. WHEN the system calculates project schedules THEN it SHALL derive rehearsal and show days from existing start_date and end_date columns
2. WHEN the system tracks talent scheduling THEN it SHALL add scheduled_dates array to talent_project_assignments table
3. WHEN the system manages staff availability THEN it SHALL add available_dates array to team_assignments table
4. WHEN the system stores talent groups THEN it SHALL create a talent_groups table with project_id, group_name, members JSONB, scheduled_dates, and assigned_escort_id
5. WHEN groups are created THEN the system SHALL also create corresponding entries in talent_project_assignments using the group's talent_id
6. WHEN querying assignments THEN the system SHALL efficiently retrieve scheduling and availability data
7. WHEN the system processes date calculations THEN it SHALL handle date comparisons and filtering efficiently using computed rehearsal/show day logic

### Requirement 9

**User Story:** As an Admin or In-House user, I want assignment dropdowns to provide intelligent escort suggestions, so that I can make informed assignment decisions.

#### Acceptance Criteria

1. WHEN I open an escort dropdown THEN the system SHALL only show escorts who are available on the selected day
2. WHEN viewing dropdown sections THEN the system SHALL show escort names and their current assignments for context
3. WHEN I search in dropdowns THEN the system SHALL filter escorts by name across all sections
4. WHEN escorts are assigned THEN the system SHALL immediately update their status in all other dropdowns
5. WHEN I view rehearsal day assignments THEN the system SHALL show which escorts have been assigned to other rehearsal days
6. WHEN making assignments THEN the system SHALL provide clear visual feedback about escort availability and conflicts

### Requirement 10

**User Story:** As an Admin or In-House user, I want the talent roster and assignment interfaces to integrate seamlessly with existing project management workflows, so that multi-day scheduling enhances rather than complicates the current system.

#### Acceptance Criteria

1. WHEN I use multi-day scheduling THEN the system SHALL maintain compatibility with existing talent management features
2. WHEN I create assignments THEN the system SHALL integrate with the existing project setup checklist
3. WHEN I view project statistics THEN the system SHALL account for multi-day assignments in talent and staff counts
4. WHEN I use group assignments THEN the system SHALL work with existing location tracking and status management
5. WHEN I export data THEN the system SHALL include scheduling and group information in reports
6. WHEN the system processes assignments THEN it SHALL maintain data integrity across all related tables and features