# Timecard System Requirements

## Introduction

The Talent Tracker application needs a comprehensive timecard system that allows talent escorts, supervisors, and coordinators to track their time, submit timecards for approval, and enables administrators to review and approve submitted timecards. This system will integrate with the existing project management infrastructure and provide accurate payroll data.

## Requirements

### Requirement 1: Time Tracking State Machine

**User Story:** As a talent escort, supervisor, or coordinator, I want a simple one-button interface to manage my shift status (check-in, break, check-out) so that I can accurately track my time without navigating between screens.

#### Acceptance Criteria

1. WHEN a user is assigned to an active project THEN they SHALL see a stateful action button component
2. WHEN the button state is "Check In" THEN contextual information SHALL display "Shift starts at [scheduled time]" below the button
3. WHEN the button state is "Start My Break" THEN contextual information SHALL display "Break expected to start at [current time]" below the button
4. WHEN the button state is "End My Break" THEN contextual information SHALL display expected end time and duration information below the button
5. WHEN the button state is "Check Out" THEN contextual information SHALL display expected check out time below the button
6. WHEN a user taps "Check In" THEN the system SHALL log the timestamp and change the button to "Start My Break"
7. WHEN a user taps "Start My Break" THEN the system SHALL log the break start time, display a counting timer, and change the button to "End My Break"
8. WHEN a user starts a break THEN the "End My Break" button SHALL be disabled until the default break duration has passed
9. WHEN the break duration is met THEN the "End My Break" button SHALL become clickable
10. WHEN a user taps "End My Break" THEN the system SHALL log the break end time and proceed based on role:
    - IF user is a talent escort THEN the button SHALL disappear (checkout handled by supervisor)
    - IF user is supervisor or coordinator THEN the button SHALL change to "Check Out"
11. WHEN a supervisor or coordinator taps "Check Out" THEN the system SHALL log the checkout time and reset the button to "Check In" for the next day
12. WHEN "End My Break" is tapped within 5 minutes of becoming available THEN the system SHALL log the exact default duration
13. WHEN "End My Break" is tapped after the grace period THEN the system SHALL log the actual time taken
14. WHEN time tracking data is modified by more than 15 minutes during final review THEN the system SHALL flag the timecard as manually edited
15. WHEN a shift exceeds 20 hours THEN the system SHALL automatically stop time tracking and send a notification to the user to update their time accurately

### Requirement 2: Break Duration Configuration

**User Story:** As an administrator, I want to configure default break durations per project with different settings for escorts and staff so that break enforcement matches project requirements.

#### Acceptance Criteria

1. WHEN an administrator accesses project settings THEN they SHALL be able to set default break durations for "Escort" and "Staff" categories
2. WHEN no project-specific break duration is set THEN the system SHALL use global default settings
3. WHEN break durations are configured THEN they SHALL apply to the appropriate user roles:
   - Escort break duration applies to talent_escort role
   - Staff break duration applies to supervisor and coordinator roles
4. WHEN break duration settings are changed THEN they SHALL apply to new shifts but not affect shifts already in progress

### Requirement 3: Time Tracking Persistence

**User Story:** As a user tracking time, I want my check-in status to persist across browser refreshes and app restarts so that I don't lose my current shift state.

#### Acceptance Criteria

1. WHEN a user checks in THEN their check-in time SHALL be recorded in the database immediately
2. WHEN a user refreshes the browser or restarts the app THEN their current shift state SHALL be determined from existing timecard records
3. WHEN a user starts a break THEN the break start time SHALL be recorded and timer state SHALL be calculable from the database
4. WHEN a user is checked in and logs in from another device THEN they SHALL see their current shift state derived from timecard records
5. WHEN multiple devices show conflicting states THEN the most recent database timestamp SHALL take precedence
6. WHEN a user's shift spans multiple days THEN the system SHALL handle the transition appropriately
7. WHEN determining current status THEN the system SHALL use existing timecard records rather than storing separate status flags

### Requirement 4: Timecard Generation and Submission

**User Story:** As a talent escort, supervisor, or coordinator, I want to submit my completed timecards for approval so that I can receive accurate payment for my work.

#### Acceptance Criteria

1. WHEN a user completes their shift THEN the system SHALL automatically generate a timecard entry with calculated hours and pay
2. WHEN a user accesses the timecards section THEN they SHALL see all their draft, submitted, approved, and rejected timecards
3. WHEN a user has a shift longer than 6 hours without break information THEN submission SHALL be blocked until resolved
4. WHEN submission is blocked due to missing breaks THEN a modal SHALL appear listing dates with missing break data
5. WHEN resolving missing breaks THEN the user SHALL choose between "Add Break" and "I Did Not Take a Break" for each date
6. WHEN all missing break information is resolved THEN the user SHALL be able to submit their timecard
7. WHEN a timecard is submitted THEN the status SHALL change to "submitted" and the submission timestamp SHALL be recorded
8. WHEN a timecard is submitted THEN the user SHALL be able to view but not edit the timecard

### Requirement 5: Administrative Approval Workflow

**User Story:** As an administrator or authorized in-house staff, I want to review and approve submitted timecards so that payroll can be processed accurately.

#### Acceptance Criteria

1. WHEN users submit timecards THEN administrators and authorized in-house staff SHALL see them in an approval queue
2. WHEN reviewing timecards THEN approvers SHALL see all time tracking details, calculated hours, and pay amounts
3. WHEN a timecard has been manually edited THEN it SHALL be clearly flagged and highlighted for review
4. WHEN approving a timecard THEN the approver SHALL be able to add optional comments
5. WHEN rejecting a timecard THEN the approver SHALL be required to add comments explaining the rejection
6. WHEN a timecard is rejected THEN it SHALL be returned to the user with status "rejected" and they SHALL receive a notification
7. WHEN an administrator edits a timecard THEN they SHALL be required to add a note and the timecard SHALL be returned to the user for re-approval
8. WHEN a user receives a rejected or edited timecard THEN they SHALL be able to make corrections and resubmit
9. WHEN multiple timecards are selected THEN approvers SHALL be able to bulk approve them
10. WHEN a timecard is approved THEN the approval timestamp and approver SHALL be recorded

### Requirement 6: Role-Based Permissions

**User Story:** As a system administrator, I want timecard approval permissions to be configurable by role so that the appropriate staff can manage the approval process.

#### Acceptance Criteria

1. WHEN determining approval permissions THEN administrators SHALL always have full approval rights
2. WHEN determining approval permissions THEN in-house staff SHALL have configurable approval rights based on global role settings
3. WHEN in-house staff approval is enabled THEN they SHALL see the same approval interface as administrators
4. WHEN in-house staff approval is disabled THEN they SHALL only see their own timecards
5. WHEN approval permissions are changed THEN they SHALL take effect immediately for new or existing timecard submissions
6. WHEN supervisors and coordinators access timecards THEN they SHALL only see their own timecards and submission interface

### Requirement 7: Notification System Integration

**User Story:** As a user of the timecard system, I want to receive timely notifications about timecard submission deadlines and approval status so that I can take appropriate action.

#### Acceptance Criteria

1. WHEN the day after show day arrives THEN users who have not submitted timecards SHALL receive a reminder notification
2. WHEN reminder notifications are configured THEN administrators SHALL be able to set the reminder frequency (daily, every 3 days, etc.)
3. WHEN a timecard is rejected THEN the user SHALL receive a notification with the reason for rejection
4. WHEN a timecard is approved THEN the user SHALL receive a confirmation notification
5. WHEN show day begins THEN timecard submission SHALL be available
6. WHEN users have not submitted after the configured reminder period THEN they SHALL continue to receive reminders until submission

### Requirement 8: Data Integrity and Audit Trail

**User Story:** As an administrator, I want complete audit trails for all timecard modifications so that payroll disputes can be resolved accurately.

#### Acceptance Criteria

1. WHEN any timecard data is modified THEN the system SHALL record who made the change and when
2. WHEN timecards are manually edited THEN the manually_edited flag SHALL be set to true
3. WHEN timecards are approved or rejected THEN the approver and timestamp SHALL be recorded
4. WHEN timecard status changes THEN the change SHALL be logged with timestamp and user
5. WHEN break times are modified by more than 15 minutes THEN the timecard SHALL be flagged for supervisor review
6. WHEN viewing timecard history THEN administrators SHALL see all modifications and status changes
7. WHEN calculating pay THEN the system SHALL use the pay rates from team assignments which contain individual rates tied to team members and projects
8. WHEN timecards are submitted THEN all calculated values SHALL be locked to prevent retroactive changes

### Requirement 9: Single Table Data Architecture

**User Story:** As a system architect, I want all timecard-related data stored in a single table so that data consistency is maintained and queries are simplified.

#### Acceptance Criteria

1. WHEN storing time tracking data THEN all information SHALL be stored in the existing timecards table
2. WHEN a user checks in THEN a draft timecard record SHALL be created or updated for that date
3. WHEN break times are recorded THEN they SHALL be stored in the break_start_time and break_end_time columns
4. WHEN shifts are completed THEN total_hours and break_duration SHALL be calculated and stored
5. WHEN timecards are submitted THEN the status SHALL change from "draft" to "submitted"
6. WHEN real-time time tracking occurs THEN the draft timecard SHALL be updated continuously
7. WHEN querying timecard data THEN all related information SHALL be available in a single table query
8. WHEN maintaining data integrity THEN database constraints SHALL prevent invalid time combinations