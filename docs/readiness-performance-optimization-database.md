# Readiness Performance Optimization - Database Layer

This document describes the database-level performance optimizations implemented for the project readiness system.

## Overview

The readiness performance optimization replaces expensive real-time calculations with a materialized view system that provides pre-calculated readiness data with automatic updates via database triggers.

## Architecture

### Materialized View: `project_readiness_summary`

The core of the optimization is a materialized view that pre-calculates all readiness information:

```sql
CREATE MATERIALIZED VIEW project_readiness_summary AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.status as project_status,
  
  -- Overall readiness status
  CASE 
    WHEN p.status = 'active' THEN 'active'
    WHEN (role_templates > 0 AND team_assignments > 0 AND locations > 0) THEN 'ready_for_activation'
    ELSE 'setup_required'
  END as readiness_status,
  
  -- Feature availability flags
  role_template_count > 0 as has_role_templates,
  team_assignment_count > 0 as has_team_assignments,
  location_count > 0 as has_locations,
  talent_count > 0 as has_talent_roster,
  
  -- Available features array
  ARRAY[...] as available_features,
  
  -- Blocking issues array
  ARRAY[...] as blocking_issues,
  
  -- Metadata
  NOW() as calculated_at
FROM projects p
LEFT JOIN (aggregated counts from related tables)
```

### Automatic Updates via Triggers

Database triggers automatically refresh the materialized view when dependencies change:

```sql
CREATE TRIGGER project_role_templates_readiness_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON project_role_templates
  FOR EACH ROW EXECUTE FUNCTION refresh_project_readiness_summary();
```

Triggers are installed on:
- `project_role_templates`
- `team_assignments`
- `project_locations`
- `talent_project_assignments`
- `projects` (status changes only)

### Real-time Notifications

The trigger function also sends PostgreSQL notifications for real-time updates:

```sql
PERFORM pg_notify(
  'project_readiness_changed',
  json_build_object(
    'project_id', project_id,
    'action', TG_OP,
    'table', TG_TABLE_NAME,
    'timestamp', extract(epoch from now())
  )::text
);
```

## Optimized Query Functions

### Single Project Readiness

```sql
SELECT * FROM get_project_readiness('project-uuid');
```

Returns complete readiness information for a single project.

### Multiple Projects Readiness

```sql
SELECT * FROM get_projects_readiness(ARRAY['uuid1', 'uuid2']);
```

Returns readiness information for multiple projects efficiently.

### Direct View Access

```sql
SELECT * FROM project_readiness_summary WHERE project_id = 'uuid';
```

Direct access to the materialized view for maximum performance.

## Performance Indexes

### Primary Indexes

- `idx_project_readiness_summary_project_id` - Unique index for concurrent refresh
- `idx_project_readiness_summary_status` - Query by readiness status
- `idx_project_readiness_summary_features` - Feature availability queries

### Dependency Table Indexes

- `idx_project_role_templates_project_deleted` - Role templates by project
- `idx_team_assignments_project_deleted` - Team assignments by project
- `idx_project_locations_project_deleted` - Locations by project
- `idx_talent_project_assignments_project_deleted` - Talent assignments by project

### Composite Indexes

- `idx_projects_status_created` - Project listing with status filter
- `idx_projects_id_status` - Project status lookups

## Data Structure

### Readiness Status Values

- `setup_required` - Missing essential dependencies
- `ready_for_activation` - All dependencies met, can activate
- `active` - Project is active and operational

### Feature Availability Flags

- `has_role_templates` - Project has role templates defined
- `has_team_assignments` - Project has team members assigned
- `has_locations` - Project has locations configured
- `has_talent_roster` - Project has talent assigned

### Feature Availability (Business Logic)

- `team_management_available` - Can manage team (has role templates)
- `talent_tracking_available` - Can track talent (has locations AND active)
- `scheduling_available` - Can schedule (has team AND role templates)
- `time_tracking_available` - Can track time (project is active)

### Blocking Issues

Array of strings indicating what's preventing readiness:
- `missing_role_templates`
- `missing_team_assignments`
- `missing_locations`

### Available Features

Array of strings indicating what features are available:
- `team_management`
- `talent_tracking`
- `scheduling`
- `time_tracking`

## Migration Process

### 1. Apply Migration

```bash
node scripts/apply-readiness-performance-optimization.js
```

This script:
- Creates the materialized view
- Installs triggers
- Creates optimized functions
- Adds performance indexes
- Populates initial data

### 2. Test Performance

```bash
node scripts/test-readiness-performance-optimization.js
```

This script:
- Tests query performance
- Verifies trigger functionality
- Tests real-time notifications
- Validates data accuracy

### 3. Rollback (if needed)

```bash
node scripts/rollback-readiness-performance-optimization.js
```

This script:
- Removes materialized view
- Drops triggers and functions
- Preserves original readiness system

## Performance Benefits

### Before Optimization

- Each readiness check required complex joins across multiple tables
- Real-time calculations for every API request
- Multiple database queries per component that needs readiness info
- No caching of calculated results

### After Optimization

- Single query returns all readiness information
- Pre-calculated results eliminate complex joins
- Automatic updates maintain data consistency
- Real-time notifications for multi-user scenarios

### Expected Performance Improvements

- **90% reduction** in API calls for readiness data
- **Sub-10ms** query times for readiness information
- **Automatic consistency** via database triggers
- **Real-time updates** for collaborative workflows

## Monitoring and Maintenance

### View Refresh Performance

Monitor materialized view refresh times:

```sql
SELECT schemaname, matviewname, last_refresh 
FROM pg_stat_user_tables 
WHERE relname = 'project_readiness_summary';
```

### Trigger Performance

Monitor trigger execution frequency and performance through database logs.

### Index Usage

Monitor index usage to ensure optimal performance:

```sql
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND indexrelname LIKE '%readiness%';
```

## Troubleshooting

### Materialized View Not Updating

1. Check trigger installation:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name LIKE '%readiness%';
   ```

2. Verify trigger function exists:
   ```sql
   SELECT * FROM information_schema.routines 
   WHERE routine_name = 'refresh_project_readiness_summary';
   ```

3. Check for trigger errors in database logs

### Performance Issues

1. Verify indexes are being used:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM project_readiness_summary WHERE project_id = 'uuid';
   ```

2. Check materialized view size and refresh time
3. Consider partitioning for very large datasets

### Data Inconsistency

1. Manual refresh of materialized view:
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY project_readiness_summary;
   ```

2. Verify trigger functions are executing correctly
3. Check for foreign key constraint issues

## Security Considerations

### Row Level Security

The materialized view inherits RLS policies from the underlying `projects` table, ensuring users only see readiness data for projects they have access to.

### Function Security

All functions are created with `SECURITY DEFINER` to ensure consistent execution context and proper permission handling.

### Notification Security

Real-time notifications only include project IDs and metadata, not sensitive project information.

## Future Enhancements

### Potential Optimizations

1. **Partitioning** - For very large datasets, consider partitioning by project status or date
2. **Incremental Refresh** - Implement incremental refresh for large materialized views
3. **Caching Layer** - Add Redis caching for frequently accessed readiness data
4. **Analytics** - Add readiness analytics and trending data

### Monitoring Improvements

1. **Performance Metrics** - Track query performance over time
2. **Usage Analytics** - Monitor which readiness features are most used
3. **Error Tracking** - Comprehensive error logging for trigger failures
4. **Alerting** - Alerts for performance degradation or data inconsistencies