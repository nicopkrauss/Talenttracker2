# Timecard Field Separation Implementation

## Overview
This document outlines the proper separation and usage of timecard edit tracking fields to ensure clear data boundaries and proper user experience.

## Field Definitions

### `admin_notes` - Private Administrative Notes
- **Purpose**: Internal notes for admins/supervisors only
- **Visibility**: Never shown to timecard submitter
- **Use Cases**:
  - Multi-day pattern metadata: "5-Day Standard Week - Total of 5 working days"
  - Internal tracking notes: "Verified with security footage"
  - Payroll processing notes: "Overtime pre-approved by production manager"
  - Private administrative context that doesn't need user visibility

### `edit_comments` - User-Facing Edit Explanations
- **Purpose**: Comments shown to timecard submitter when returned/edited
- **Visibility**: Always visible to the person who submitted the timecard
- **Use Cases**:
  - "Please verify break times and resubmit"
  - "Hours adjusted based on security footage review"
  - "Break time corrected - please confirm accuracy"
  - Any feedback that helps the user understand changes or required actions

### `edit_type` - Edit Classification
- **Purpose**: Categorizes the type of edit for audit purposes
- **Values**: 
  - `'user_correction'` - User made corrections to their own timecard
  - `'admin_adjustment'` - Admin/supervisor made changes
  - `'system_correction'` - Automated system corrections

### `admin_edited` - Admin Edit Flag
- **Purpose**: Boolean flag indicating if admin/supervisor modified the timecard
- **Usage**: Set to `true` when anyone other than the timecard owner makes changes

### `manually_edited` - Legacy Edit Flag
- **Purpose**: Legacy field for tracking manual edits
- **Status**: Being phased out in favor of more specific tracking fields

## Implementation Changes

### 1. UI Visibility Rules
- **Admin/Supervisor Views**: Can see both `admin_notes` and `edit_comments`
- **User Views**: Only see `edit_comments`, never `admin_notes`
- **Multi-day Detection**: Continue using `admin_notes` for pattern metadata

### 2. Admin Notes Management
- Add admin notes input field to timecard detail pages for authorized users
- Allow editing of admin notes without affecting user-visible comments
- Preserve existing multi-day pattern data in admin_notes

### 3. API Updates
- Separate handling of `admin_notes` vs `edit_comments` in edit endpoints
- Ensure proper field usage in approval/rejection workflows
- Maintain audit trail with proper field attribution

## Benefits
1. **Clean Audit Trail**: Internal notes stay internal
2. **Clear Communication**: Users only see relevant feedback
3. **Proper Multi-day Support**: Pattern metadata stored appropriately
4. **Flexible Admin Workflow**: Admins can add private notes without confusing users

## Migration Notes
- No database schema changes required
- Existing multi-day timecards continue to work
- UI changes are backward compatible
- API maintains existing functionality while adding proper field separation