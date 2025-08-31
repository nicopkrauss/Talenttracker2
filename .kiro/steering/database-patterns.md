---
inclusion: always
---

# Database Patterns & Data Architecture

## Core Data Models

### User & Role Management
- **users**: Core user profile data with PII encryption
- **project_roles**: Role assignments per project (not global roles)
- **user_project_assignments**: Many-to-many relationship with pay overrides
- **pending_approvals**: Queue for admin approval workflow

### Project Structure
- **projects**: Core project data with lifecycle status (Prep/Active)
- **project_locations**: Customizable location statuses per project
- **project_settings**: Configurable options (break duration, submission deadlines)
- **talent_roster**: Project-specific talent with import tracking

### Time Tracking Schema
- **time_entries**: Universal time tracking for all roles
- **break_records**: Separate table for break start/end with validation
- **timecards**: Aggregated submissions with approval workflow
- **timecard_edits**: Audit trail for admin modifications

## Row Level Security (RLS) Patterns

### Multi-Tenant Data Isolation
```sql
-- Users can only see their own profile data
CREATE POLICY user_profile_access ON users
  FOR ALL USING (auth.uid() = id);

-- Project data filtered by user's project assignments
CREATE POLICY project_access ON projects
  FOR SELECT USING (
    id IN (
      SELECT project_id FROM user_project_assignments 
      WHERE user_id = auth.uid()
    )
  );
```

### Role-Based Access Control
- **Admin/In-House**: Full access to all project data
- **Supervisor/TLC**: Read access to team and talent data
- **Escort**: Limited to assigned talent and own timecard data
- **Pending Users**: No access to operational data

## Data Validation Constraints

### Time Tracking Integrity
- Check-in must precede break start
- Break end must follow break start
- Checkout must be after check-in
- No overlapping time entries for same user/day

### Project Lifecycle Constraints
- Cannot activate project without completed checklist
- Cannot delete active projects with time entries
- Talent assignments require active project status

## Audit & Compliance Patterns

### Change Tracking
- **created_at/updated_at**: Standard timestamps on all tables
- **audit_log**: Comprehensive change tracking for sensitive operations
- **timecard_modifications**: Specific tracking for payroll-related changes

### Data Retention
- **soft_deletes**: Mark records as deleted rather than physical deletion
- **archival_policies**: Automated archiving of completed projects
- **gdpr_compliance**: User data export and deletion capabilities

## Performance Optimization

### Indexing Strategy
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_time_entries_user_project_date 
  ON time_entries(user_id, project_id, date);

CREATE INDEX idx_talent_roster_project_status 
  ON talent_roster(project_id, status);
```

### Query Patterns
- Use materialized views for complex reporting queries
- Implement pagination for large datasets (talent lists, time entries)
- Cache frequently accessed reference data (locations, roles)

## Prisma Database Management

### Schema Management Workflow
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Check database schema drift
npx prisma db pull

# Apply schema changes to database
npx prisma db push

# Create and apply migrations (production)
npx prisma migrate dev --name descriptive_migration_name
npx prisma migrate deploy
```

### Prisma Client Usage Patterns
```typescript
// Preferred patterns for database operations
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Include related data with proper typing
const talentWithAssignments = await prisma.talent.findMany({
  include: {
    talent_project_assignments: {
      include: {
        projects: true,
        profiles_talent_project_assignments_escort_idToprofiles: true
      }
    },
    talent_status: {
      include: {
        project_locations: true
      }
    }
  }
})

// Use transactions for data consistency
await prisma.$transaction(async (tx) => {
  const shift = await tx.shifts.create({
    data: { user_id, project_id, shift_date, check_in_time }
  })
  
  await tx.notifications.create({
    data: { user_id, title: 'Shift Started', type: 'check_in' }
  })
})
```

### Schema Validation & Constraints
- Use Prisma schema constraints for data integrity
- Implement custom validation in API routes before database operations
- Leverage Prisma's type safety for compile-time error checking
- Use `@@unique` constraints for business logic enforcement

### Migration Best Practices
- Always review generated migrations before applying
- Use descriptive migration names that explain the change
- Test migrations on development database first
- Keep rollback SQL in migration tracking table
- Never edit applied migrations - create new ones for changes

### Database Introspection & Sync
```bash
# Pull current database schema to Prisma schema
npx prisma db pull

# Reset database to match Prisma schema (development only)
npx prisma migrate reset

# Seed database with initial data
npx prisma db seed
```

## Real-time Data Sync

### Supabase Realtime Subscriptions
- **talent_location_updates**: Live location changes for operational awareness
- **time_tracking_status**: Real-time check-in/break status updates
- **notification_delivery**: Instant push notification triggers

### Conflict Resolution
- Last-write-wins for location updates
- Optimistic locking for timecard submissions
- Admin override capabilities for data conflicts