# Timecard Status Change Migration Guide

This document provides a comprehensive guide for migrating the timecard approval system from using dedicated `approved_by` and `approved_at` columns to using the audit log system for status change tracking.

## Overview

The migration consolidates timecard status information into the unified audit log system, providing better tracking of all status changes (submissions, rejections, approvals) with proper attribution.

## PostgreSQL Constraints and Requirements

### Enum Value Constraints
PostgreSQL has a strict requirement that new enum values must be committed in a separate transaction before they can be used in INSERT statements. This is why the migration is split into multiple steps.

### Row Level Security (RLS)
The migration temporarily disables RLS on the `timecard_audit_log` table to ensure the migration can insert records without permission issues. RLS is re-enabled after each step.

### Transaction Management
Each migration step must be committed separately:
1. Add enum value → COMMIT
2. Use enum value in INSERT → COMMIT  
3. Remove old columns → COMMIT

## Migration Components

### 1. Database Schema Changes

#### Files Created:
- `scripts/database/migrate-approval-data-to-audit-log.sql` - Migrates existing approval data
- `scripts/database/remove-approval-columns.sql` - Removes the old columns
- `scripts/run-approval-migration.js` - Orchestrates the migration process
- `scripts/update-prisma-schema.js` - Updates the Prisma schema
- `scripts/test-approval-migration.js` - Tests the migration

#### Schema Changes:
1. **Added `edited_draft` to `timecard_status` enum**
   - Allows tracking when admins edit draft timecards
   
2. **Removed columns from `timecard_headers`:**
   - `approved_by` (String?, @db.Uuid)
   - `approved_at` (DateTime?, @db.Timestamptz(6))
   
3. **Removed relationships:**
   - `approved_by_profile` relationship from `timecard_headers`
   - `timecard_headers_approved_by` relationship from `profiles`

4. **Enhanced `timecard_audit_log`:**
   - Added support for `action_type: 'status_change'`
   - Status changes use `field_name: null`
   - `old_value` contains previous status
   - `new_value` contains new status

### 2. Data Migration Process

#### Step 1: Migrate Existing Data
```sql
-- Creates audit log entries for existing approved timecards
INSERT INTO timecard_audit_log (
    timecard_id,
    change_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    changed_at,
    action_type,
    work_date
) SELECT ...
```

#### Step 2: Remove Old Columns
```sql
-- Removes the deprecated columns
ALTER TABLE timecard_headers 
DROP CONSTRAINT IF EXISTS timecard_headers_approved_by_fkey;
ALTER TABLE timecard_headers DROP COLUMN IF EXISTS approved_by;
ALTER TABLE timecard_headers DROP COLUMN IF EXISTS approved_at;
```

## Migration Execution Steps

### Prerequisites
1. Ensure you have database backup
2. Verify all tests pass
3. Have rollback plan ready

### Execution Order

1. **Update Prisma Schema**
   ```bash
   node scripts/update-prisma-schema.js
   npx prisma generate
   ```

2. **Test Migration Readiness**
   ```bash
   node scripts/test-approval-migration.js
   ```

3. **Prepare Migration Scripts**
   ```bash
   node scripts/execute-migration-steps.js
   ```

4. **Execute SQL Migrations (Manual - Required due to PostgreSQL enum constraints)**
   ```bash
   # Step 1: Add enum value (must be committed before use)
   psql -f scripts/database/01-add-status-change-enum.sql
   # COMMIT the transaction here
   
   # Step 2: Migrate data (after enum value is committed)
   psql -f scripts/database/02-migrate-approval-data.sql
   
   # Step 3: Remove old columns (after data is migrated)
   psql -f scripts/database/03-remove-approval-columns.sql
   ```

5. **Verify Migration**
   - Check audit log entries were created
   - Verify old columns are removed
   - Test application functionality

### Important Notes

- **PostgreSQL Enum Constraint**: New enum values must be committed before they can be used in INSERT statements
- **RLS Handling**: Scripts temporarily disable Row Level Security during migration
- **Transaction Management**: Each step should be committed separately

## API Changes Required

After migration, the following API endpoints need updates:

### 1. Timecard Submission API (`/api/timecards/submit`)
```typescript
// Add status change logging
await AuditLogService.logStatusChange(
  timecardId,
  'draft', // or 'rejected'
  'submitted',
  userId
)
```

### 2. Timecard Rejection API (`/api/timecards/reject`)
```typescript
// Add status change logging
await AuditLogService.logStatusChange(
  timecardId,
  'submitted',
  'rejected',
  adminUserId
)
```

### 3. Timecard Approval API (`/api/timecards/approve`)
```typescript
// Add status change logging
await AuditLogService.logStatusChange(
  timecardId,
  'submitted',
  'approved',
  adminUserId
)
```

### 4. Admin Edit API (`/api/timecards/edit`)
```typescript
// Add draft editing status change
if (currentStatus === 'draft') {
  await AuditLogService.logStatusChange(
    timecardId,
    'draft',
    'edited_draft',
    adminUserId
  )
}
```

## Audit Log Service Updates

### New Method: `logStatusChange`
```typescript
static async logStatusChange(
  timecardId: string,
  oldStatus: string | null,
  newStatus: string,
  changedBy: string
): Promise<void> {
  await supabase.from('timecard_audit_log').insert({
    timecard_id: timecardId,
    action_type: 'status_change',
    field_name: null,
    old_value: oldStatus,
    new_value: newStatus,
    work_date: null,
    changed_by: changedBy,
    changed_at: new Date().toISOString()
  })
}
```

## UI Component Updates

### Audit Trail Component
- Update to handle `action_type: 'status_change'`
- Display status changes with proper badges
- Show "Status changed to [badge]" format
- Maintain chronological ordering with field changes

### Status Display
- Remove separate status information sections
- Rely on audit trail for all status information
- Handle `edited_draft` status display as "draft (edited)"

## Testing Checklist

### Pre-Migration Tests
- [ ] Backup database
- [ ] Run `scripts/test-approval-migration.js`
- [ ] Verify Prisma schema generates correctly
- [ ] Test existing timecard queries work

### Post-Migration Tests
- [ ] Verify audit log entries created for existing approvals
- [ ] Test status change logging in all APIs
- [ ] Verify UI shows status changes correctly
- [ ] Test chronological ordering of mixed entries
- [ ] Verify no data loss occurred

### Integration Tests
- [ ] Complete submission → rejection → resubmission → approval workflow
- [ ] Admin edit on draft timecards
- [ ] Status change attribution is correct
- [ ] Audit trail displays properly

## Rollback Plan

If migration needs to be rolled back:

1. **Restore Database Backup**
   - Restore from backup taken before migration

2. **Revert Prisma Schema**
   ```bash
   git checkout HEAD~1 -- prisma/schema.prisma
   npx prisma generate
   ```

3. **Revert Code Changes**
   - Restore API endpoints to use `approved_by`/`approved_at`
   - Revert UI components to show separate status sections

## Performance Considerations

### Database Indexes
Existing indexes on audit log table should handle the additional status change entries:
- `idx_timecard_audit_log_timecard_id`
- `idx_timecard_audit_log_changed_at`
- `idx_timecard_audit_log_change_id`

### Query Performance
- Status change queries use same patterns as field change queries
- No significant performance impact expected
- Monitor audit log table size growth

## Security Considerations

### Access Control
- Status change logs respect existing RLS policies
- Only authorized users can change timecard status
- Audit trail maintains immutable record

### Data Integrity
- Migration includes verification steps
- Foreign key constraints maintained
- No orphaned data created

## Monitoring and Alerts

### Post-Migration Monitoring
- Monitor audit log table growth
- Check for any missing status change entries
- Verify UI performance with mixed entry types
- Monitor API response times

### Success Metrics
- All existing approved timecards have audit log entries
- No data loss in migration
- UI displays status changes correctly
- API endpoints log status changes properly

## Support and Troubleshooting

### Common Issues

1. **Migration Script Fails**
   - Check database permissions
   - Verify enum type exists
   - Check for conflicting data

2. **Prisma Generation Fails**
   - Verify schema syntax
   - Check for missing relationships
   - Ensure enum values are correct

3. **UI Not Showing Status Changes**
   - Verify audit log API includes status changes
   - Check component handles `action_type: 'status_change'`
   - Ensure proper chronological ordering

### Getting Help
- Check migration logs for specific errors
- Verify each step completed successfully
- Test individual components in isolation
- Review audit log entries manually if needed

## Conclusion

This migration consolidates timecard status tracking into the unified audit log system, providing better visibility into all timecard changes while maintaining data integrity and performance.