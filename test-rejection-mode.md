# Testing Desktop Rejection Mode

## What Should Happen

1. **Entering Rejection Mode**:
   - Click "Reject Timecard" button
   - Button should change to red "Exit Rejection Mode" 
   - Header should show "(Click fields to edit)" text
   - Time fields should become clickable with hover effects

2. **Editing Fields**:
   - Click on any time field (Check In, Break Start, Break End, Check Out)
   - Field should highlight with red border and blue background
   - Time picker should appear (invisible overlay)
   - Original value should show with strikethrough
   - New value should show in red text

3. **Submitting Rejection**:
   - Click "Confirm Rejection" button
   - Rejection reason dialog should appear
   - Enter reason and click "Reject with Edits"
   - Should call `/api/timecards/edit` with:
     - `status: 'rejected'`
     - `fieldEdits` containing the changed fields
     - `editComment` with the rejection reason
     - `adminNote` with list of edited fields

4. **Audit Logging**:
   - Should create audit log entries with `action_type: 'rejection_edit'`
   - Should only log the actual field changes, not metadata
   - Should distinguish from regular admin edits

## Debugging Steps

1. Check browser console for errors
2. Check network tab for API calls
3. Verify field edits are being tracked in component state
4. Check database for audit log entries
5. Verify rejection reason and edited fields are saved correctly

## Expected API Call

```json
{
  "timecardId": "uuid",
  "updates": {
    "check_in_time": "2024-09-15T09:15:00Z",
    "status": "rejected"
  },
  "editComment": "Check-in time was incorrect",
  "adminNote": "Rejected with edits to: Check In",
  "returnToDraft": false
}
```

## Expected Audit Log

```json
[
  {
    "timecard_id": "uuid",
    "field_name": "check_in_time",
    "old_value": "2024-09-15T09:00:00Z",
    "new_value": "2024-09-15T09:15:00Z",
    "action_type": "rejection_edit",
    "changed_by": "admin-user-id"
  }
]
```