# Design Document

## Overview

This design integrates timecard status changes into the unified change log and enhances the database schema to properly track all status transitions. The solution consolidates status information display, improves audit trails, and maintains visual consistency across the timecard detail interface.

## Architecture

### Database Schema Changes

The core change involves removing the `approved_by` and `approved_at` columns from the `timecard_headers` table and using the existing audit log system:

```sql
-- Migration: Remove approved_by and approved_at columns
ALTER TABLE timecard_headers 
DROP COLUMN approved_by,
DROP COLUMN approved_at;
```

All status changes will be tracked in the `timecard_audit_log` table with:
- `action_type`: 'status_change'
- `field_name`: null
- `old_value`: previous status (e.g., 'draft')
- `new_value`: new status (e.g., 'submitted')
- `work_date`: null
- `changed_by`: user ID who made the change

### API Integration Points

1. **Timecard Submission API** (`/api/timecards/submit`)
   - Create audit log entry with action_type 'status_change', old_value 'draft'/'rejected', new_value 'submitted'
   - Set changed_by to the submitting user's ID

2. **Timecard Rejection API** (`/api/timecards/reject`)
   - Create audit log entry with action_type 'status_change', old_value 'submitted', new_value 'rejected'
   - Set changed_by to the rejecting admin's ID

3. **Timecard Approval API** (`/api/timecards/approve`)
   - Create audit log entry with action_type 'status_change', old_value 'submitted', new_value 'approved'
   - Set changed_by to the approving admin's ID

4. **Admin Edit API** (`/api/timecards/edit`)
   - When editing draft timecards, change timecard status to 'edited_draft' and create audit log entry
   - Create audit log entry with old_value 'draft', new_value 'edited_draft'

4. **Audit Log API** (`/api/timecards/[id]/audit-logs`)
   - Include status change entries in the response
   - Format status changes with proper attribution

## Components and Interfaces

### Enhanced Audit Trail Section

The `AuditTrailSection` component will be updated to handle status change entries alongside field changes:

```typescript
interface StatusChangeAuditEntry {
  id: string
  action_type: 'status_change'
  timecard_id: string
  field_name: null
  old_value: string // Previous status (e.g., 'draft', 'submitted')
  new_value: string // New status (e.g., 'submitted', 'approved', 'edited_draft')
  work_date: null
  changed_by: string
  changed_at: Date
  changed_by_profile: {
    full_name: string
  }
}

// The existing AuditLogEntry interface already supports this structure
// We just need to handle action_type 'status_change' specifically
```

### Status Change Rendering

Status changes will be rendered with a specific format:

**Left Side Content:**
- "Status changed to [StatusBadge]"
- Includes properly styled status badge

**Right Side Content:**
- User who made the change
- Timestamp of the change
- Same layout as field change entries

### Status Badge Component

A reusable status badge component will be used within change log entries:

```typescript
interface StatusBadgeProps {
  status: timecard_status
  size?: 'sm' | 'md'
}

const StatusBadge = ({ status, size = 'sm' }: StatusBadgeProps) => {
  const config = getStatusConfig(status)
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
```

## Data Models

### Updated Timecard Headers Schema

```prisma
model timecard_headers {
  id                   String                   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  user_id              String?                  @db.Uuid
  project_id           String?                  @db.Uuid
  status               timecard_status?         @default(draft) // Includes: draft, edited_draft, submitted, rejected, approved
  submitted_at         DateTime?                @db.Timestamptz(6)
  // approved_at and approved_by columns removed - tracked in audit log
  rejection_reason     String?
  rejected_fields      String[]                 @default([])
  admin_notes          String?
  period_start_date    DateTime                 @db.Date
  period_end_date      DateTime                 @db.Date
  total_hours          Decimal?                 @default(0) @db.Decimal(5, 2)
  total_break_duration Decimal?                 @default(0) @db.Decimal(4, 2)
  total_pay            Decimal?                 @default(0) @db.Decimal(10, 2)
  pay_rate             Decimal?                 @default(0) @db.Decimal(8, 2)
  manually_edited      Boolean?                 @default(false)
  edit_comments        String?
  admin_edited         Boolean?                 @default(false)
  last_edited_by       String?
  edit_type            String?
  created_at           DateTime?                @default(now()) @db.Timestamptz(6)
  updated_at           DateTime?                @default(now()) @db.Timestamptz(6)
  
  // Removed status_changed_by_profile relationship
  project                   projects?           @relation("timecard_headers_project", fields: [project_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  user                      profiles?           @relation("timecard_headers_user", fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  
  timecard_audit_log        timecard_audit_log[]
  daily_entries             timecard_daily_entries[]

  @@unique([user_id, project_id, period_start_date])
  @@index([user_id, project_id], map: "idx_timecard_headers_user_project")
  @@index([status], map: "idx_timecard_headers_status")
  @@index([period_start_date, period_end_date], map: "idx_timecard_headers_period")
  @@index([submitted_at], map: "idx_timecard_headers_submitted")
  @@schema("public")
}
```

### Enhanced Audit Log Service

The audit log service will be extended to handle status changes:

```typescript
class AuditLogService {
  static async logStatusChange(
    timecardId: string,
    oldStatus: string | null,
    newStatus: string,
    changedBy: string
  ): Promise<void> {
    // Create audit log entry for status change using existing audit log structure
    await supabase.from('timecard_audit_log').insert({
      timecard_id: timecardId,
      action_type: 'status_change',
      field_name: null, // null for status changes
      old_value: oldStatus,
      new_value: newStatus,
      work_date: null, // null for status changes
      changed_by: changedBy,
      changed_at: new Date().toISOString()
    })
  }

  static formatStatusChange(entry: AuditLogEntry): string {
    const date = entry.changed_at.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    const time = entry.changed_at.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    
    // Format status display names
    const displayStatus = entry.new_value
    
    return `Status changed to ${displayStatus} on ${date} at ${time}`
  }
}
```

## Error Handling

### Migration Safety

1. **Column Removal Migration**
   - Use a transaction to ensure atomicity
   - Migrate existing approved_by/approved_at data to audit log entries before dropping columns
   - Update Prisma schema to remove foreign key references

2. **API Backward Compatibility**
   - Ensure existing API calls continue to work
   - Gracefully handle legacy data without audit log entries
   - Provide fallback attribution for historical status changes

3. **UI Error States**
   - Handle missing status change attribution gracefully
   - Display "System" or "Unknown" for unattributed changes
   - Maintain change log functionality even with incomplete data

### Data Validation

1. **Status Change Validation**
   - Verify valid status transitions
   - Ensure audit log entries are created for all status changes
   - Validate user permissions for status changes

2. **Audit Log Integrity**
   - Ensure status changes are always logged
   - Handle concurrent status change attempts
   - Maintain chronological ordering of entries

## Testing Strategy

### Database Migration Testing

1. **Schema Migration Tests**
   - Verify column removal after data migration
   - Test audit log entry creation for existing data
   - Validate index updates

2. **Data Integrity Tests**
   - Ensure existing approved_by/approved_at data is migrated to audit log
   - Verify no data loss during migration
   - Test rollback procedures

### Component Testing

1. **Audit Trail Component Tests**
   - Test status change entry rendering
   - Verify proper badge styling
   - Test responsive layout for status changes

2. **Integration Tests**
   - Test status change logging in API endpoints
   - Verify change log includes status changes
   - Test chronological ordering of mixed entry types

### API Testing

1. **Status Change API Tests**
   - Test submission status change tracking
   - Test rejection status change tracking
   - Test approval status change tracking

2. **Audit Log API Tests**
   - Verify status changes appear in audit log responses
   - Test proper attribution for status changes
   - Test pagination with mixed entry types

## Performance Considerations

### Database Optimization

1. **Query Performance**
   - Maintain existing indexes on status column
   - Optimize audit log queries for action_type filtering
   - Ensure efficient queries for mixed entry types

2. **Migration Performance**
   - Use efficient data migration before column removal
   - Minimize downtime during schema changes
   - Test migration performance on large datasets

### Frontend Performance

1. **Change Log Rendering**
   - Maintain efficient rendering for large change logs
   - Use proper React keys for mixed entry types
   - Optimize status badge rendering

2. **API Response Optimization**
   - Include necessary profile data in single query
   - Minimize additional requests for status change attribution
   - Use proper pagination for large audit logs

## Security Considerations

### Access Control

1. **Status Change Authorization**
   - Verify user permissions before logging status changes
   - Ensure only authorized users can change timecard status
   - Maintain audit trail of who can make status changes

2. **Data Privacy**
   - Ensure status change logs respect user privacy
   - Maintain proper access controls for audit data
   - Follow existing RLS policies for timecard data

### Audit Trail Security

1. **Tamper Prevention**
   - Ensure audit log entries cannot be modified
   - Maintain immutable record of status changes
   - Protect against unauthorized audit log access

2. **Data Retention**
   - Follow existing data retention policies
   - Ensure status change logs are preserved appropriately
   - Maintain compliance with audit requirements