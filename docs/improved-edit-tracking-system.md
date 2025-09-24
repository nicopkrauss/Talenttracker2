# Improved Timecard Edit Tracking System

## Problem with Current System

The original system used a single `manually_edited` flag for both:
- **Admin edits**: When supervisors/admins edit timecards
- **User edits**: When users correct their own timecards

This created confusion about:
- Who made the edit?
- What type of edit was it?
- How should the UI display the edit information?

## New Improved System

### Database Fields

| Field | Purpose | Used For |
|-------|---------|----------|
| `manually_edited` | User made corrections to their own timecard | User self-corrections |
| `edit_comments` | User's explanation for their corrections | User edit notes |
| `admin_edited` | Admin/supervisor edited the timecard | Admin adjustments |
| `admin_edit_reason` | Admin's reason for the edit | Admin edit notes |
| `last_edited_by` | UUID of person who last edited | Audit trail |
| `edit_type` | Type of edit made | Categorization |

### Edit Types

- `user_correction`: User fixed their own timecard
- `admin_adjustment`: Admin/supervisor made changes
- `system_correction`: Automated system corrections

### Workflow Separation

#### Admin Edit Workflow
1. Admin flags timecard with `admin_edited = true`
2. Sets `admin_edit_reason` with explanation
3. Sets `last_edited_by` to admin's user ID
4. Sets `edit_type = 'admin_adjustment'`
5. UI shows admin-specific messaging

#### User Edit Workflow  
1. User corrects their own timecard with `manually_edited = true`
2. Sets `edit_comments` with their explanation
3. Sets `last_edited_by` to user's ID
4. Sets `edit_type = 'user_correction'`
5. UI shows user-specific messaging

### UI Display Logic

```typescript
// Admin flagged draft
if (timecard.admin_edited && timecard.status === 'draft') {
  // Show yellow warning: "This timecard has been flagged for your review"
  // Display: timecard.admin_edit_reason
}

// Admin edited submitted timecard
if (timecard.admin_edited && timecard.status !== 'draft') {
  // Show edit history: "This timecard was manually edited by admin"
  // Display: timecard.admin_edit_reason
}

// User corrected their own timecard
if (timecard.manually_edited && !timecard.admin_edited) {
  // Show user edit note: "User provided correction notes"
  // Display: timecard.edit_comments
}
```

### API Routes

- `/api/timecards/edit` - Admin edits (existing, updated)
- `/api/timecards/user-edit` - User self-corrections (new)

### Benefits

1. **Clear Separation**: Admin vs user edits are distinct
2. **Better Audit Trail**: Know exactly who made what changes
3. **Improved UX**: Different messaging for different edit types
4. **Compliance**: Better tracking for payroll audits
5. **Flexibility**: Can handle different edit workflows

### Migration Required

Run `migrations/038_improve_timecard_edit_tracking.sql` to:
- Add new columns
- Migrate existing data
- Add proper indexes
- Set up constraints

### Backward Compatibility

- Existing `manually_edited` and `edit_comments` fields preserved
- New fields are optional (nullable)
- Existing code continues to work during transition