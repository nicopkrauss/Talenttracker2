# Design Document

## Overview

This design implements a new day-specific escort assignment system that replaces the current flawed architecture. The solution introduces dedicated assignment tables that create explicit relationships between talents/groups, escorts, and specific dates, while cleaning up redundant fields in the existing tables.

## Architecture

### Current Problems
- `talent_project_assignments.escort_id` + `scheduled_dates[]` cannot associate specific escorts with specific dates
- `talent_groups` has three redundant escort fields: `assigned_escort_id`, `assigned_escort_ids[]`, and `escort_dropdown_count`
- No way to assign different escorts to the same talent on different days
- "Clear Day" functionality clears entire assignments instead of date-specific assignments

### New Architecture
The solution introduces two new tables that create explicit date-escort-talent relationships:

1. **`talent_daily_assignments`** - Individual talent escort assignments by date
2. **`group_daily_assignments`** - Talent group escort assignments by date (supports multiple escorts per date)

These tables replace the escort assignment functionality currently embedded in `talent_project_assignments` and `talent_groups`.

## Components and Interfaces

### New Database Tables

#### talent_daily_assignments
```sql
CREATE TABLE talent_daily_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID NOT NULL REFERENCES talent(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  escort_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(talent_id, project_id, assignment_date, escort_id),
  INDEX(project_id, assignment_date),
  INDEX(escort_id, assignment_date),
  INDEX(talent_id, project_id)
);
```

#### group_daily_assignments
```sql
CREATE TABLE group_daily_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES talent_groups(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  escort_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(group_id, project_id, assignment_date, escort_id),
  INDEX(project_id, assignment_date),
  INDEX(escort_id, assignment_date),
  INDEX(group_id, project_id)
);
```

### Modified Existing Tables

#### talent_project_assignments (Simplified)
- **Remove**: `escort_id` field
- **Keep**: `scheduled_dates[]` (maintained automatically based on daily assignments)
- **Keep**: All other fields (id, talent_id, project_id, assigned_at, etc.)

#### talent_groups (Cleaned Up)
- **Remove**: `assigned_escort_id` field
- **Remove**: `assigned_escort_ids[]` field  
- **Remove**: `escort_dropdown_count` field
- **Keep**: `scheduled_dates[]` (maintained automatically based on daily assignments)
- **Keep**: All other fields (id, project_id, group_name, members, etc.)

### API Interface Changes

#### New Endpoints
```typescript
// Get assignments for a specific date
GET /api/projects/{id}/assignments/{date}
Response: {
  talents: Array<{
    talentId: string,
    talentName: string,
    escorts: Array<{ escortId: string, escortName: string }>
  }>,
  groups: Array<{
    groupId: string,
    groupName: string,
    escorts: Array<{ escortId: string, escortName: string }>
  }>
}

// Create/update assignments for a specific date
POST /api/projects/{id}/assignments/{date}
Body: {
  talents: Array<{
    talentId: string,
    escortIds: string[]  // Can be empty to clear
  }>,
  groups: Array<{
    groupId: string,
    escortIds: string[]  // Can be empty to clear, supports multiple
  }>
}

// Clear all assignments for a specific date
DELETE /api/projects/{id}/assignments/{date}
```

#### Modified Endpoints
```typescript
// Updated to work with new daily assignment structure
DELETE /api/projects/{id}/assignments/clear-day
Body: { date: string }
// Now properly clears only the specified date's assignments
```

## Data Models

### TypeScript Interfaces

```typescript
interface TalentDailyAssignment {
  id: string
  talentId: string
  projectId: string
  assignmentDate: string  // ISO date string
  escortId: string
  createdAt: string
  updatedAt: string
}

interface GroupDailyAssignment {
  id: string
  groupId: string
  projectId: string
  assignmentDate: string  // ISO date string
  escortId: string
  createdAt: string
  updatedAt: string
}

interface DailyAssignmentSummary {
  date: string
  talents: Array<{
    talentId: string
    talentName: string
    escorts: Array<{
      escortId: string
      escortName: string
    }>
  }>
  groups: Array<{
    groupId: string
    groupName: string
    escorts: Array<{
      escortId: string
      escortName: string
    }>
  }>
}
```

### Database Triggers

#### Automatic scheduled_dates Maintenance
```sql
-- Trigger to update talent_project_assignments.scheduled_dates
CREATE OR REPLACE FUNCTION update_talent_scheduled_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update scheduled_dates array based on daily assignments
  UPDATE talent_project_assignments 
  SET scheduled_dates = (
    SELECT ARRAY_AGG(DISTINCT assignment_date::text ORDER BY assignment_date::text)
    FROM talent_daily_assignments 
    WHERE talent_id = COALESCE(NEW.talent_id, OLD.talent_id)
      AND project_id = COALESCE(NEW.project_id, OLD.project_id)
  ),
  updated_at = NOW()
  WHERE talent_id = COALESCE(NEW.talent_id, OLD.talent_id)
    AND project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update talent_groups.scheduled_dates  
CREATE OR REPLACE FUNCTION update_group_scheduled_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update scheduled_dates array based on daily assignments
  UPDATE talent_groups 
  SET scheduled_dates = (
    SELECT ARRAY_AGG(DISTINCT assignment_date::text ORDER BY assignment_date::text)
    FROM group_daily_assignments 
    WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Error Handling

### Validation Rules
1. **Date Validation**: Assignment dates must fall within project start/end dates
2. **Escort Availability**: Prevent double-booking escorts on the same date
3. **Talent Scheduling**: Ensure talent is actually scheduled for the assignment date
4. **Project Access**: Verify user has permission to modify project assignments

### Error Responses
```typescript
interface AssignmentError {
  code: 'INVALID_DATE' | 'ESCORT_UNAVAILABLE' | 'TALENT_NOT_SCHEDULED' | 'UNAUTHORIZED'
  message: string
  details?: {
    date?: string
    escortId?: string
    talentId?: string
    conflictingAssignment?: string
  }
}
```

### Rollback Strategy
- Database transactions ensure atomic operations
- Failed assignments revert all changes within the transaction
- UI optimistic updates are rolled back on API errors

## Testing Strategy

### Unit Tests
- Database trigger functions for scheduled_dates maintenance
- API endpoint validation logic
- Date range and conflict detection
- Migration data integrity

### Integration Tests
- Complete assignment workflow (create, update, delete)
- Clear day functionality across multiple talents/groups
- Concurrent assignment modifications
- Migration from old to new structure

### End-to-End Tests
- Assignment tab UI with date selection
- Multi-escort group assignments
- Clear day button functionality
- Assignment persistence across page reloads

## Migration Strategy

### Phase 1: Create New Tables
1. Create `talent_daily_assignments` and `group_daily_assignments` tables
2. Create database triggers for scheduled_dates maintenance
3. Deploy new API endpoints alongside existing ones

### Phase 2: Data Migration
1. Migrate existing `talent_project_assignments.escort_id` data to `talent_daily_assignments`
2. Migrate existing `talent_groups` escort data to `group_daily_assignments`
3. Validate migrated data integrity
4. Update scheduled_dates arrays using new triggers

### Phase 3: Code Migration
1. Update UI components to use new API endpoints
2. Update assignment logic to work with daily assignment tables
3. Maintain backward compatibility during transition

### Phase 4: Cleanup
1. Remove old escort fields from existing tables
2. Remove deprecated API endpoints
3. Remove old assignment logic
4. Update database schema documentation

### Migration SQL Example
```sql
-- Migrate individual talent assignments
INSERT INTO talent_daily_assignments (talent_id, project_id, assignment_date, escort_id)
SELECT 
  tpa.talent_id,
  tpa.project_id,
  date_val::date,
  tpa.escort_id
FROM talent_project_assignments tpa
CROSS JOIN LATERAL unnest(tpa.scheduled_dates) AS date_val
WHERE tpa.escort_id IS NOT NULL;

-- Migrate group assignments (from assigned_escort_id)
INSERT INTO group_daily_assignments (group_id, project_id, assignment_date, escort_id)
SELECT 
  tg.id,
  tg.project_id,
  date_val::date,
  tg.assigned_escort_id
FROM talent_groups tg
CROSS JOIN LATERAL unnest(tg.scheduled_dates) AS date_val
WHERE tg.assigned_escort_id IS NOT NULL;

-- Migrate group assignments (from assigned_escort_ids array)
INSERT INTO group_daily_assignments (group_id, project_id, assignment_date, escort_id)
SELECT 
  tg.id,
  tg.project_id,
  date_val::date,
  escort_id
FROM talent_groups tg
CROSS JOIN LATERAL unnest(tg.scheduled_dates) AS date_val
CROSS JOIN LATERAL unnest(tg.assigned_escort_ids) AS escort_id
WHERE array_length(tg.assigned_escort_ids, 1) > 0;
```

## Performance Considerations

### Indexing Strategy
- Composite indexes on (project_id, assignment_date) for fast date-based queries
- Indexes on escort_id for availability checking
- Indexes on talent_id/group_id for individual assignment lookups

### Query Optimization
- Use JOIN queries to fetch assignment data with escort names in single requests
- Implement pagination for large assignment lists
- Cache frequently accessed assignment data

### Scalability
- Daily assignment tables will scale linearly with project duration and talent count
- Partitioning by project_id or date ranges for very large datasets
- Archive old assignment data after project completion