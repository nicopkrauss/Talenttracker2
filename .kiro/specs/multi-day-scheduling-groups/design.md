# Design Document

## Overview

The Multi-Day Scheduling and Talent Groups feature extends the existing Talent Tracker system to support complex production workflows involving multiple rehearsal and show days, along with group talent management. This design maintains the existing project management structure while adding scheduling capabilities and group functionality that integrates seamlessly with current escort assignment workflows.

## Architecture

### System Integration Points

The feature integrates with existing components:
- **Project Management**: Extends project creation and detail views
- **Team Management**: Enhances team assignment workflow with availability tracking
- **Talent Management**: Adds scheduling to talent roster management
- **Assignment System**: Replaces planned drag-and-drop with day-based dropdown interface

### Data Flow

1. **Project Setup**: Admin defines project start and end dates, system automatically calculates rehearsal/show days
2. **Team Confirmation**: Staff availability is captured during team confirmation process
3. **Talent Scheduling**: Individual talent and groups are scheduled for specific days
4. **Assignment Process**: Escorts are assigned to talent/groups on a day-by-day basis
5. **Operations**: Real-time schedule changes are handled with assignment preservation

## Components and Interfaces

### Database Schema Changes

#### Projects Table Extensions
```sql
-- No additional columns needed - rehearsal/show days calculated from existing start_date and end_date
-- Rehearsal days: start_date to (end_date - 1 day)
-- Show day: end_date
-- For single-day projects: show day = start_date = end_date
```

#### Team Assignments Availability
```sql
ALTER TABLE team_assignments ADD COLUMN available_dates DATE[];
```

#### Talent Scheduling
```sql
ALTER TABLE talent_project_assignments ADD COLUMN scheduled_dates DATE[];
```

#### Talent Groups Table
```sql
CREATE TABLE talent_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  group_name VARCHAR(255) NOT NULL,
  members JSONB NOT NULL, -- [{name: "John Doe", role: "Lead Guitar"}, ...]
  scheduled_dates DATE[] NOT NULL DEFAULT '{}',
  assigned_escort_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### UI Component Architecture

#### Project Creation Enhancement
- **ProjectScheduleDisplay**: Visual representation of calculated project timeline showing automatic rehearsal/show day designation

#### Team Management Components
- **PendingTeamAssignments**: Renamed section with confirmation workflow
- **ConfirmedTeamMembers**: New section displaying availability
- **AvailabilityPopup**: Modal for capturing staff availability
- **CircularDateSelector**: Reusable component for date selection

#### Talent Roster Enhancements
- **TalentScheduleColumn**: Replaces representative/status columns
- **GroupCreationModal**: Interface for creating talent groups
- **GroupBadge**: Visual indicator for group assignments

#### Assignment Interface
- **DaySegmentedControl**: Navigation between project days
- **AssignmentDropdown**: Sectioned dropdown with intelligent escort suggestions
- **AssignmentList**: Day-specific talent-escort pairing interface

## Data Models

### Project Schedule Model
```typescript
interface ProjectSchedule {
  startDate: Date;
  endDate: Date;
  rehearsalDates: Date[]; // computed: start_date to (end_date - 1)
  showDates: Date[]; // computed: [end_date]
  allDates: Date[]; // computed: start_date to end_date
}

// Utility functions for schedule calculation
function calculateRehearsalDates(startDate: Date, endDate: Date): Date[] {
  if (startDate.getTime() === endDate.getTime()) return []; // Single day = show only
  const dates = [];
  const current = new Date(startDate);
  while (current < endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function calculateShowDates(endDate: Date): Date[] {
  return [new Date(endDate)];
}
```

### Staff Availability Model
```typescript
interface StaffAvailability {
  userId: string;
  projectId: string;
  availableDates: Date[];
  confirmedAt: Date;
}
```

### Talent Scheduling Model
```typescript
interface TalentScheduling {
  talentId: string;
  projectId: string;
  scheduledDates: Date[];
  isGroup: boolean;
}
```

### Talent Group Model
```typescript
interface TalentGroup {
  id: string;
  projectId: string;
  groupName: string;
  members: GroupMember[];
  scheduledDates: Date[];
  assignedEscortId?: string;
}

interface GroupMember {
  name: string;
  role: string;
}
```

### Assignment Model
```typescript
interface DayAssignment {
  date: Date;
  assignments: TalentEscortPair[];
}

interface TalentEscortPair {
  talentId: string;
  talentName: string;
  isGroup: boolean;
  escortId?: string;
  escortName?: string;
}
```

## Error Handling

### Schedule Conflict Resolution
- **Talent Rescheduling**: Automatic escort unlinking with preservation of other day assignments
- **Escort Unavailability**: Clear feedback when escorts become unavailable
- **Assignment Conflicts**: Prevention of double-booking with intelligent suggestions

### Data Validation
- **Date Consistency**: Ensure scheduled dates fall within project date range
- **Availability Matching**: Validate escort assignments against availability
- **Group Integrity**: Ensure group members are properly structured

### User Experience
- **Optimistic Updates**: Immediate UI feedback with rollback on failure
- **Clear Error Messages**: Specific guidance for resolving conflicts
- **Graceful Degradation**: Fallback behavior when real-time updates fail

## Testing Strategy

### Unit Testing
- **Date Utilities**: Comprehensive testing of date array operations
- **Assignment Logic**: Validation of escort availability calculations
- **Group Management**: Testing of group creation and member management
- **Schedule Validation**: Edge cases for date scheduling logic

### Integration Testing
- **Database Operations**: Multi-table transaction testing
- **API Endpoints**: Full CRUD operations for all new entities
- **Component Integration**: Testing of UI component interactions
- **Real-time Updates**: WebSocket and state synchronization testing

### End-to-End Testing
- **Complete Workflows**: Project creation through assignment completion
- **Schedule Changes**: Testing of dynamic rescheduling scenarios
- **Group Operations**: Full group lifecycle testing
- **Multi-User Scenarios**: Concurrent assignment operations

## Performance Considerations

### Database Optimization
- **Indexing Strategy**: Indexes on date arrays and project relationships
- **Query Optimization**: Efficient filtering of availability and assignments
- **Batch Operations**: Bulk updates for assignment changes

### Frontend Performance
- **Component Memoization**: Prevent unnecessary re-renders during assignment updates
- **Lazy Loading**: Load assignment data only when tabs are accessed
- **Debounced Updates**: Batch rapid assignment changes

### Scalability
- **Date Array Handling**: Efficient operations on date collections
- **Real-time Subscriptions**: Optimized WebSocket connections for live updates
- **Caching Strategy**: Client-side caching of availability and assignment data

## Security Considerations

### Access Control
- **Role-Based Permissions**: Maintain existing project role restrictions
- **Data Isolation**: Ensure users only access their assigned projects
- **Assignment Validation**: Server-side validation of all assignment operations

### Data Protection
- **Input Sanitization**: Validation of all date and text inputs
- **SQL Injection Prevention**: Parameterized queries for date array operations
- **CSRF Protection**: Secure form submissions for all new interfaces

## Migration Strategy

### Database Migration
- **Incremental Updates**: Add new columns and tables without disrupting existing data
- **Default Values**: Appropriate defaults for new date array columns
- **Data Integrity**: Maintain referential integrity during schema changes

### Feature Rollout
- **Backward Compatibility**: Existing projects continue to function without scheduling
- **Progressive Enhancement**: New features available as projects are updated
- **User Training**: Clear documentation and UI guidance for new workflows

## Future Considerations

### Potential Enhancements
- **Advanced Scheduling**: Integration with external calendar systems
- **Automated Suggestions**: AI-powered escort assignment recommendations
- **Reporting**: Enhanced analytics for multi-day production efficiency
- **Mobile Optimization**: Touch-friendly interfaces for on-site schedule management

### Technical Debt
- **Code Consolidation**: Opportunities to refactor shared scheduling logic
- **Performance Monitoring**: Tracking of query performance with date arrays
- **User Feedback Integration**: Iterative improvements based on production usage