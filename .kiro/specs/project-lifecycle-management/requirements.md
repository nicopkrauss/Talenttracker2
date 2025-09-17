# Requirements Document

## Introduction

This feature redesigns the project lifecycle management system to replace the simple "activate project" concept with a comprehensive mode toggle system that accurately reflects the different phases of a production project. The system will automatically transition between phases based on project dates and completion criteria, while providing clear visual indicators and appropriate functionality for each phase.

## Requirements

### Requirement 1

**User Story:** As a project manager, I want the system to automatically track project phases based on dates and completion status, so that I can see exactly where each project stands in its lifecycle without manual activation.

#### Acceptance Criteria

1. WHEN a project is created THEN the system SHALL set the initial mode to "prep"
2. WHEN all vital project information is complete THEN the system SHALL allow transition to "staffing" mode
3. WHEN staffing is complete, talent assignment is complete AND the local timezone reaches midnight on the first rehearsal day THEN the system SHALL automatically transition to "active" mode
4. WHEN the show ends AND the local timezone reaches 6:00 AM the day after the final show THEN the system SHALL automatically transition to "post-show" mode
5. WHEN all timecards are approved and paid THEN the system SHALL automatically transition to "complete" mode
6. WHEN the configurable archive date arrives (default April 1st) AND the project is from the previous year THEN the system SHALL automatically transition to "archived" mode

### Requirement 2

**User Story:** As a user, I want to see clear visual indicators of the current project phase and understand what actions are available in each phase, so that I can work efficiently within the current project context.

#### Acceptance Criteria

1. WHEN viewing a project THEN the system SHALL display the current mode prominently with appropriate visual styling
2. WHEN in "prep" mode THEN the system SHALL show action items for completing vital project information
3. WHEN in "staffing" mode THEN the system SHALL show action items for hiring, assigning talent, and team assignment completion
4. WHEN in "pre-show" mode THEN the system SHALL show action items for final preparations before rehearsals begin
5. WHEN in "active" mode THEN the system SHALL show operational dashboards and real-time tracking features
6. WHEN in "post-show" mode THEN the system SHALL show timecard management and payroll processing features
7. WHEN in "complete" mode THEN the system SHALL show project summary and archival preparation features
8. WHEN in "archived" mode THEN the system SHALL show read-only project information with historical data access

### Requirement 3

**User Story:** As a system administrator, I want to configure the automatic transition rules and archive schedules, so that the lifecycle management can be adapted to different organizational needs.

#### Acceptance Criteria

1. WHEN configuring system settings THEN the administrator SHALL be able to set the archive date (month and day)
2. WHEN configuring system settings THEN the administrator SHALL be able to set the post-show transition time (default 6:00 AM)
3. WHEN a project has override settings THEN the system SHALL respect manual mode changes over automatic transitions
4. IF automatic transition fails due to timezone or date calculation errors THEN the system SHALL log the error and maintain current mode

### Requirement 4

**User Story:** As a project stakeholder, I want to understand the criteria for each phase transition and see progress toward the next phase, so that I can plan accordingly and ensure smooth project progression.

#### Acceptance Criteria

1. WHEN viewing project details THEN the system SHALL display current phase completion criteria
2. WHEN phase transition criteria are not met THEN the system SHALL show specific action items needed for progression
3. WHEN phase transition is imminent THEN the system SHALL show countdown or preparation indicators
4. WHEN automatic transition occurs THEN the system SHALL log the transition with timestamp and trigger reason
5. WHEN manual override is used THEN the system SHALL require administrator confirmation and log the manual change

### Requirement 5

**User Story:** As a developer, I want the phase transition logic to be timezone-aware and handle edge cases gracefully, so that projects in different locations transition at the correct local times.

#### Acceptance Criteria

1. WHEN calculating transition times THEN the system SHALL use the project's configured timezone
2. WHEN project timezone is not set THEN the system SHALL use the organization's default timezone
3. WHEN daylight saving time transitions occur THEN the system SHALL handle time calculations correctly
4. WHEN project dates span multiple years THEN the system SHALL calculate transitions accurately across year boundaries
5. IF timezone data is unavailable THEN the system SHALL fall back to UTC and log a warning

### Requirement 6

**User Story:** As a user, I want the action items list to reflect the current project phase and show relevant next steps, so that I can focus on phase-appropriate tasks without confusion.

#### Acceptance Criteria

1. WHEN in "prep" mode THEN action items SHALL include project setup tasks (roles, locations, basic info)
2. WHEN in "staffing" mode THEN action items SHALL include team assignment and talent roster completion
3. WHEN in "pre-show" mode THEN action items SHALL include final preparations and readiness checks
4. WHEN in "active" mode THEN action items SHALL focus on operational tasks and real-time management
5. WHEN in "post-show" mode THEN action items SHALL include timecard review and payroll processing
6. WHEN in "complete" or "archived" modes THEN action items SHALL be minimal or read-only
7. WHEN action items are completed THEN they SHALL be automatically removed from the list
8. WHEN new phase-appropriate tasks become available THEN they SHALL be automatically added to the action items