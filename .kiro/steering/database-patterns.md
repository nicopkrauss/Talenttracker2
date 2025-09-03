---
inclusion: always
---

# Database Patterns & Data Architecture

## Core Data Models

### User & Role Management
- **profiles**: Core user profile data with system roles and registration fields
- **team_assignments**: Project-specific role assignments with pay overrides
- **auth_logs**: Authentication event tracking and audit trail
- **email_notifications**: Notification delivery tracking and status

### Project Structure
- **projects**: Core project data with lifecycle status (prep/active/archived)
- **project_locations**: Customizable location statuses per project
- **project_setup_checklist**: Setup completion tracking for project activation
- **project_role_templates**: Configurable role definitions with pay rates
- **project_roles**: Legacy role configuration (being phased out)

### Talent Management
- **talent**: Enhanced talent profiles with representative information
- **talent_project_assignments**: Many-to-many talent-project relationships
- **talent_status**: Current location and status tracking per project
- **user_favorites**: Staff favorites for talent notifications

### Time Tracking Schema
- **shifts**: Universal shift tracking for all roles with check-in/out times
- **breaks**: Separate table for break periods with duration validation
- **timecards**: Aggregated submissions with approval workflow
- **notifications**: Real-time notification system for operational alerts

## Row Level Security (RLS) Patterns

### Multi-Tenant Data Isolation
```sql
-- Users can only see their own profile data
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Project data filtered by user's role and assignments
CREATE POLICY "Project access based on role" ON projects
  FOR SELECT USING (
    -- Admin and in_house can see all projects
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'in_house')
    )
    OR
    -- Other users can see projects they're assigned to
    id IN (
      SELECT project_id FROM team_assignments 
      WHERE user_id = auth.uid()
    )
  );

-- Talent assignments filtered by project access
CREATE POLICY "Talent access based on project role" ON talent_project_assignments
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects -- Uses project access policy
    )
  );
```

### Role-Based Access Control
- **System Roles (profiles.role)**:
  - **admin**: Full system access and management
  - **in_house**: System management with configurable permissions
  - **null**: Regular users with project-based roles only
- **Project Roles (team_assignments.role)**:
  - **supervisor**: On-site management with day rate tracking
  - **coordinator**: Informational oversight role
  - **talent_escort**: On-the-ground operations with hourly tracking
- **User Status (profiles.status)**:
  - **pending**: Awaiting admin approval, no operational access
  - **active**: Full access based on assigned roles
  - **rejected**: Account denied access

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

### Supabase Client Usage Patterns
```typescript
// Preferred patterns for database operations with Supabase
import { createServerClient } from '@supabase/ssr'

// Server-side data fetching with RLS
const { data: projects, error } = await supabase
  .from('projects')
  .select(`
    id,
    name,
    status,
    created_by_profile:profiles!projects_created_by_fkey(full_name),
    project_setup_checklist(*),
    project_role_templates(*)
  `)
  .order('created_at', { ascending: false })

// Talent with assignments and status
const { data: talent, error } = await supabase
  .from('talent')
  .select(`
    *,
    talent_project_assignments(
      *,
      projects(name, status),
      assigned_escort:profiles(full_name)
    ),
    talent_status(
      *,
      current_location:project_locations(name)
    )
  `)
  .eq('talent_project_assignments.project_id', projectId)

// Real-time subscriptions for live updates
const subscription = supabase
  .channel('talent-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'talent_status',
    filter: `project_id=eq.${projectId}`
  }, handleTalentUpdate)
  .subscribe()
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

### Database Management with Supabase
```bash
# Apply SQL migrations to Supabase
supabase db push

# Generate TypeScript types from database
supabase gen types typescript --project-id your-project > lib/database.types.ts

# Reset local development database
supabase db reset

# Run custom migration scripts
node scripts/run-migration.js migration-name.sql
```

### Authentication Trigger Management
```sql
-- Automatic profile creation on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email, status, created_at, updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'pending',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
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