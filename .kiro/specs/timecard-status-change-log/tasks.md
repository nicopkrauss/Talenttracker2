# Implementation Plan

- [x] 1. Database schema migration for audit log status tracking
  - [x] 1.1 Add 'status_change' to audit_action_type enum
    - Database migration executed successfully - enum now includes 'status_change'
    - Prisma schema updated via `prisma db pull` to reflect current database state
    - _Requirements: 3.3_
  
  - [x] 1.2 Execute data migration for existing approved timecards
    - Migration script executed successfully to migrate existing `approved_by` and `approved_at` data to audit log entries
    - Existing approved timecards now have proper status change audit log entries
    - _Requirements: 3.1_
  
  - [x] 1.3 Remove approved_by and approved_at columns
    - Database migration executed successfully to remove `approved_by` and `approved_at` columns from `timecard_headers` table
    - Prisma schema reflects the updated table structure without these columns
    - _Requirements: 3.2_

- [x] 2. Update API endpoints to use logStatusChange method





  - [x] 2.1 Update timecard submission API to use logStatusChange


    - Modify `/api/timecards/submit` route to use `auditLogService.logStatusChange()` instead of recordChanges
    - Ensure proper error handling for status change logging
    - _Requirements: 2.1, 3.3_

  - [x] 2.2 Update timecard rejection API to use logStatusChange


    - Modify `/api/timecards/reject` route to use `auditLogService.logStatusChange()` instead of recordChanges
    - Ensure proper error handling for status change logging
    - _Requirements: 2.2, 3.3_

  - [x] 2.3 Update timecard approval API to use logStatusChange


    - Modify `/api/timecards/approve` route to use `auditLogService.logStatusChange()` instead of recordChanges
    - Ensure proper error handling for status change logging
    - _Requirements: 2.3, 3.3_

  - [x] 2.4 Update admin edit API to properly handle edited_draft status


    - Modify `/api/timecards/edit` route to change timecard status to 'edited_draft' when editing drafts
    - Use `auditLogService.logStatusChange()` to log the status change from 'draft' to 'edited_draft'
    - _Requirements: 3.4_