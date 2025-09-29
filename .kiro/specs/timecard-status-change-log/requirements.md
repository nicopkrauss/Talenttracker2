# Requirements Document

## Introduction

This feature consolidates timecard status information into the change log and enhances status change tracking. Currently, timecard status information is displayed separately from the change log, and the database only tracks who approved timecards. This enhancement will integrate status changes into the unified change log and track all status changes (submissions, rejections, approvals) with proper attribution.

## Requirements

### Requirement 1

**User Story:** As a user viewing timecard details, I want to see status changes integrated into the change log, so that I have a unified view of all timecard modifications and status transitions.

#### Acceptance Criteria

1. WHEN viewing a timecard detail page THEN status change entries SHALL appear in the change log alongside field modifications
2. WHEN a status change entry is displayed THEN it SHALL show "Status changed to [badge]" format on the left side
3. WHEN a status change entry is displayed THEN it SHALL show who made the change and the time of change on the right side, consistent with other change log entries
4. WHEN multiple changes occur THEN status changes SHALL be chronologically ordered with field changes in the unified change log

### Requirement 2

**User Story:** As an administrator, I want to track who changes timecard statuses, so that I can maintain proper audit trails for all status transitions including rejections.

#### Acceptance Criteria

1. WHEN a timecard is submitted THEN the system SHALL record the employee as the person who changed the status
2. WHEN a timecard is rejected THEN the system SHALL record the admin/approver as the person who changed the status
3. WHEN a timecard is approved THEN the system SHALL record the admin/approver as the person who changed the status
4. WHEN querying timecard audit logs THEN status changes SHALL include proper attribution to the person who made the change

### Requirement 3

**User Story:** As a developer, I want the database schema to use the existing audit log system for status changes, so that all timecard changes are tracked consistently in one place.

#### Acceptance Criteria

1. WHEN the database schema is updated THEN the `approved_by` and `approved_at` columns SHALL be removed from timecard_headers
2. WHEN a timecard status changes THEN a new audit log entry SHALL be created with action_type 'status_change'
3. WHEN status change audit entries are created THEN field_name SHALL be null, old_value SHALL contain the previous status, and new_value SHALL contain the new status
4. WHEN admin edits occur on draft timecards THEN the timecard status SHALL change to "edited_draft" and the audit log SHALL record "draft" to "edited_draft"

### Requirement 4

**User Story:** As a user viewing the change log, I want status changes to be visually consistent with other entries, so that the interface feels cohesive and professional.

#### Acceptance Criteria

1. WHEN status change entries are displayed THEN they SHALL use the same styling and layout as field change entries
2. WHEN status change entries are displayed THEN they SHALL include appropriate icons to distinguish them from field changes
3. WHEN status change entries are displayed THEN status badges SHALL be properly styled and colored
4. WHEN viewing on mobile devices THEN status change entries SHALL follow the same responsive layout as other change log entries

### Requirement 5

**User Story:** As a developer, I want the timecard status enum to include "edited_draft" as a valid status, so that admin-edited draft timecards can be properly tracked and distinguished.

#### Acceptance Criteria

1. WHEN the database schema is updated THEN the timecard_status enum SHALL include "edited_draft" as a valid value
2. WHEN admin edits are made to draft timecards THEN the timecard status SHALL be set to "edited_draft"
3. WHEN "edited_draft" timecards are submitted THEN they SHALL transition to "submitted" status
4. WHEN displaying "edited_draft" status THEN it SHALL be clearly labeled and styled appropriately

### Requirement 6

**User Story:** As a system administrator, I want the current status information section to be removed, so that there is no duplicate or redundant status display.

#### Acceptance Criteria

1. WHEN the change log integration is complete THEN the separate "Status Information" section SHALL be removed from timecard detail pages
2. WHEN users view timecard details THEN they SHALL only see status information within the unified change log
3. WHEN the UI is updated THEN there SHALL be no visual gaps or layout issues from removing the status section
4. WHEN testing the interface THEN all status information SHALL be accessible through the change log