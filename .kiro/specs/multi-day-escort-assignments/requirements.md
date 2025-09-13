# Requirements Document

## Introduction

The current talent assignment system has critical architectural flaws that prevent proper day-specific escort assignment management, despite having a date-based UI interface:

1. **Individual Talent Assignments**: The `talent_project_assignments` table has a single `escort_id` field and a `scheduled_dates` array, but no way to associate specific escorts with specific dates. The UI shows assignments by date, but the backend can only store one escort per talent across all dates.

2. **Talent Group Assignments**: The `talent_groups` table has redundant and conflicting escort fields that don't support date-specific assignments:
   - `assigned_escort_id` (singular String?) - single escort for all dates
   - `assigned_escort_ids` (plural String[] array) - multiple escorts but for all dates
   - `escort_dropdown_count` (Int?) - UI configuration field
   - `scheduled_dates` (String[] array) - dates but no escort-date relationship

3. **No Date-Specific Relationships**: While the UI and existing interfaces (`TalentEscortPair`, `DayAssignment`) support date-specific assignments, the database tables cannot distinguish which escorts are assigned to which dates, making it impossible to have different escorts on different days.

4. **Clear Day Dysfunction**: The "Clear Day" functionality incorrectly clears entire escort assignments rather than just the assignment for the specific date, because there's no way to clear just one date's assignment.

This architectural problem requires implementing the day-specific assignment tables to support the existing UI interface while maintaining backward compatibility.

## Requirements

### Requirement 1

**User Story:** As a project coordinator, I want to assign different escorts to the same talent on different days, so that I can accommodate escort availability and scheduling constraints across multi-day projects.

#### Acceptance Criteria

1. WHEN I assign an escort to talent for a specific date THEN the system SHALL store the escort-talent-date relationship independently from other dates
2. WHEN I view talent assignments for a specific date THEN the system SHALL show only the escorts assigned for that date
3. WHEN talent is scheduled on multiple dates THEN the system SHALL allow different escorts to be assigned for each date
4. WHEN I change an escort assignment for one date THEN the system SHALL NOT affect escort assignments for other dates

### Requirement 2

**User Story:** As a project coordinator, I want to clear escort assignments for a specific day without affecting other days, so that I can manage daily scheduling changes without disrupting the entire project schedule.

#### Acceptance Criteria

1. WHEN I use the "Clear Day" function for a specific date THEN the system SHALL remove only escort assignments for that date
2. WHEN escort assignments are cleared for one date THEN the system SHALL preserve escort assignments for all other dates
3. WHEN I clear a day's assignments THEN the system SHALL update the talent's scheduled dates to reflect the change
4. WHEN a talent has no remaining escort assignments THEN the system SHALL remove the talent from the scheduled dates array

### Requirement 3

**User Story:** As a project coordinator, I want to assign multiple escorts to talent groups on the same day, so that I can handle large groups that require multiple escorts.

#### Acceptance Criteria

1. WHEN I assign multiple escorts to a talent group for a specific date THEN the system SHALL store all escort assignments for that date
2. WHEN I view a talent group's assignments for a date THEN the system SHALL display all assigned escorts for that date
3. WHEN I remove one escort from a multi-escort assignment THEN the system SHALL preserve the other escort assignments for that date
4. WHEN I clear all escorts from a group for a date THEN the system SHALL remove that date from the group's scheduled dates

### Requirement 4

**User Story:** As a project coordinator, I want the system to maintain data integrity when managing day-specific assignments, so that assignment data remains consistent and reliable.

#### Acceptance Criteria

1. WHEN escort assignments are modified THEN the system SHALL ensure scheduled_dates arrays accurately reflect dates with active assignments
2. WHEN an assignment is created THEN the system SHALL validate that the date falls within the project's date range
3. WHEN an assignment is deleted THEN the system SHALL clean up any orphaned data relationships
4. WHEN assignment data is queried THEN the system SHALL return consistent results across all related tables

### Requirement 5

**User Story:** As a developer, I want the new assignment system to be backward compatible with existing data, so that current assignments are preserved during the migration.

#### Acceptance Criteria

1. WHEN the new system is deployed THEN existing talent assignments SHALL be migrated to the new structure
2. WHEN existing assignments are migrated THEN each scheduled date SHALL create a separate assignment record
3. WHEN migration is complete THEN all existing functionality SHALL work with the new data structure
4. WHEN the migration fails THEN the system SHALL provide rollback capabilities to restore the original state

### Requirement 6

**User Story:** As a developer, I want to clean up the redundant escort assignment fields in talent groups, so that the system has a single, consistent way to manage escort assignments.

#### Acceptance Criteria

1. WHEN the new system is implemented THEN the talent_groups table SHALL use only the new day-specific assignment structure
2. WHEN redundant fields are removed THEN the system SHALL migrate data from `assigned_escort_id`, `assigned_escort_ids`, and `escort_dropdown_count` to the new structure
3. WHEN the migration is complete THEN the old fields SHALL be safely removed from the database schema
4. WHEN the cleanup is finished THEN all existing functionality SHALL work with the simplified, consistent data structure

### Requirement 7

**User Story:** As a project coordinator, I want to view and manage escort assignments through an intuitive interface, so that day-specific assignment management is efficient and error-free.

#### Acceptance Criteria

1. WHEN I view the assignments tab THEN the system SHALL clearly show which escorts are assigned to each talent for the selected date
2. WHEN I change the selected date THEN the system SHALL update the display to show assignments specific to that date
3. WHEN I make assignment changes THEN the system SHALL provide immediate visual feedback
4. WHEN assignment operations fail THEN the system SHALL display clear error messages and revert optimistic updates