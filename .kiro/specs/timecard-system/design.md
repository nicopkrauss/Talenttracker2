# Timecard System Design

## Overview

The timecard system provides comprehensive time tracking and approval workflows for talent escorts, supervisors, and coordinators. The system uses a single-table architecture with the existing `timecards` table, enhanced with real-time state management and role-based approval workflows.

## Architecture

### Data Flow Architecture

```
User Interface Layer
├── Time Tracking Action Bar (Persistent Component)
├── Timecard List & Management
└── Administrative Approval Interface

Business Logic Layer
├── Time Tracking State Machine
├── Break Duration Management
├── Timecard Calculation Engine
└── Approval Workflow Engine

Data Persistence Layer
└── Single Timecards Table (Enhanced)
```

### State Management Flow

```
Check In → Draft Timecard Created
    ↓
Start Break → Break Start Time Recorded
    ↓
End Break → Break End Time Recorded + Duration Calculated
    ↓
Check Out → Total Hours Calculated + Status: Draft
    ↓
Submit → Status: Submitted + Validation
    ↓
Approve/Reject → Status: Approved/Rejected + Audit Trail
```

## Components and Interfaces

### 1. Time Tracking Action Bar Component

**Component:** `TimeTrackingActionBar`

**Purpose:** Standalone UI component that manages the check-in/break/checkout workflow with contextual information display

**Props:**
```typescript
interface TimeTrackingActionBarProps {
  projectId: string
  userId: string
  userRole: 'talent_escort' | 'supervisor' | 'coordinator'
  scheduledStartTime?: string // For "Shift starts at" display
  onStateChange?: (state: TimeTrackingState) => void
}
```

**State Machine:**
```typescript
type TimeTrackingState = 
  | { 
      status: 'checked_out'; 
      nextAction: 'check_in';
      contextInfo: `Shift starts at ${string}`;
    }
  | { 
      status: 'checked_in'; 
      nextAction: 'start_break';
      contextInfo: `Break expected to start at ${string}`;
    }
  | { 
      status: 'on_break'; 
      nextAction: 'end_break'; 
      breakStartTime: Date; 
      canEndBreak: boolean;
      contextInfo: `Break ends at ${string} (${number} min remaining)`;
    }
  | { 
      status: 'break_ended'; 
      nextAction: 'check_out' | 'complete'; // 'complete' for escorts
      contextInfo: `Expected check out at ${string}`;
    }
```

**Key Features:**
- Real-time timer display during breaks
- Dynamic contextual information display below button based on current state
- Automatic timecard record updates to database (no separate status storage)
- Role-based button behavior (escorts vs supervisors/coordinators)
- Grace period logic for break duration
- Disabled state management during minimum break duration
- 20-hour shift limit with automatic stop and notification
- State derivation from existing timecard records rather than stored status flags

### 2. Time Tracking Hook

**Hook:** `useTimeTracking`

**Purpose:** Manages time tracking state and database synchronization

```typescript
interface UseTimeTrackingReturn {
  currentState: TimeTrackingState
  contextInfo: string // Dynamic context based on state
  checkIn: () => Promise<void>
  startBreak: () => Promise<void>
  endBreak: () => Promise<void>
  checkOut: () => Promise<void>
  loading: boolean
  error: string | null
  shiftDuration: number // Current shift duration in hours
  isOvertime: boolean // True if approaching/over limits
}
```

**Responsibilities:**
- Persist timecard record changes to database immediately
- Derive current state from existing timecard records on component mount (no status flags)
- Generate contextual information based on current state and scheduled times
- Manage break duration enforcement with grace period logic
- Calculate time differences and totals in real-time
- Handle role-specific workflows (escort vs supervisor/coordinator)
- Monitor for 20-hour shift limits and trigger automatic stop with notifications
- Provide overtime warnings and shift duration tracking

### 3. Timecard Management Interface

**Components:**
- `TimecardList` (existing, enhanced)
- `TimecardSubmissionModal`
- `MissingBreakResolutionModal`

**Enhanced TimecardList Features:**
- Real-time status updates
- Draft timecard editing capabilities
- Submission workflow integration
- Missing break detection and resolution

### 4. Administrative Approval Interface

**Components:**
- `SupervisorApprovalQueue` (existing, enhanced)
- `TimecardDetailView`
- `BulkApprovalInterface`

**Enhanced Features:**
- Manual edit flagging and highlighting
- Two-way confirmation workflow
- Bulk approval with validation
- Audit trail display

## Data Models

### Enhanced Timecard Table Structure

The existing `timecards` table will be used with the following column utilization:

```sql
-- Core identification
id: UUID (primary key)
user_id: UUID (foreign key to profiles)
project_id: UUID (foreign key to projects)
date: DATE (shift date)

-- Time tracking (real-time updates)
check_in_time: TIMESTAMPTZ (when user checks in)
check_out_time: TIMESTAMPTZ (when user checks out)
break_start_time: TIMESTAMPTZ (when break starts)
break_end_time: TIMESTAMPTZ (when break ends)

-- Calculated values (computed on state changes)
total_hours: DECIMAL(5,2) (total shift hours)
break_duration: DECIMAL(4,2) (break duration in minutes)
pay_rate: DECIMAL(8,2) (derived from team_assignments table)
total_pay: DECIMAL(10,2) (calculated pay)

-- Workflow management
status: ENUM ('draft', 'submitted', 'approved', 'rejected')
manually_edited: BOOLEAN (flagged when admin edits)
supervisor_comments: TEXT (approval/rejection notes)

-- Audit trail
submitted_at: TIMESTAMPTZ
approved_at: TIMESTAMPTZ
approved_by: UUID (foreign key to profiles)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

### Break Duration Configuration

**Global Settings Table Enhancement:**
```sql
-- Add to system_settings table
{
  "break_durations": {
    "default_escort_minutes": 30,
    "default_staff_minutes": 60
  },
  "timecard_notifications": {
    "reminder_frequency_days": 1,
    "submission_opens_on_show_day": true
  },
  "shift_limits": {
    "max_hours_before_stop": 20,
    "overtime_warning_hours": 12
  }
}
```

**Project-Specific Settings:**
```sql
-- Add to project settings
{
  "break_durations": {
    "escort_minutes": 30,
    "staff_minutes": 60
  }
}
```

### Time Tracking State Storage

**Real-time State Management:**
- Draft timecards serve as the source of truth for current state
- Timecard records are updated on every time tracking action
- Current state is derived from timecard records on component mount
- No separate status flags stored - state calculated from timestamps
- Conflict resolution uses database timestamp precedence

## Error Handling

### Time Tracking Errors

1. **Network Connectivity Issues**
   - Queue timecard updates locally
   - Retry on reconnection
   - Show offline indicator

2. **Concurrent State Conflicts**
   - Use optimistic updates with rollback
   - Show conflict resolution dialog
   - Allow user to choose correct state based on timestamps

3. **Invalid Time Sequences**
   - Validate time logic before persistence
   - Show clear error messages
   - Prevent invalid state transitions

4. **20-Hour Shift Limit Exceeded**
   - Automatically stop time tracking
   - Send immediate notification to user
   - Require manual time correction before submission

5. **State Derivation Errors**
   - Handle corrupted or incomplete timecard records
   - Provide manual state correction interface
   - Log state derivation issues for debugging

### Submission Validation Errors

1. **Missing Break Information**
   - Block submission with clear messaging
   - Provide resolution modal
   - Guide user through correction process

2. **Invalid Time Calculations**
   - Recalculate on submission
   - Flag discrepancies for review
   - Allow manual correction with audit trail

## Testing Strategy

### Unit Testing

1. **Time Tracking State Machine**
   - Test all state transitions
   - Verify break duration enforcement
   - Test role-specific behaviors

2. **Calculation Engine**
   - Test hour calculations
   - Test break duration calculations
   - Test pay calculations

3. **Validation Logic**
   - Test missing break detection
   - Test time sequence validation
   - Test submission requirements

### Integration Testing

1. **Database Persistence**
   - Test state synchronization
   - Test concurrent access scenarios
   - Test data integrity constraints

2. **API Endpoints**
   - Test time tracking operations
   - Test submission workflows
   - Test approval processes

3. **Real-time Updates**
   - Test state persistence across sessions
   - Test multi-device synchronization
   - Test conflict resolution

### End-to-End Testing

1. **Complete Time Tracking Workflow**
   - Check in → Break → Check out → Submit
   - Test role-specific variations
   - Test error scenarios

2. **Approval Workflow**
   - Submit → Review → Approve/Reject
   - Test bulk operations
   - Test two-way confirmation

3. **Notification Integration**
   - Test reminder notifications
   - Test status change notifications
   - Test escalation workflows

## Security Considerations

### Data Access Control

1. **Row Level Security (RLS)**
   - Users can only access their own timecards
   - Approvers can access submitted timecards
   - Administrators have full access

2. **Role-Based Permissions**
   - Time tracking limited to assigned projects
   - Approval rights based on role configuration
   - Audit trail access restricted to administrators

### Data Integrity

1. **Time Validation**
   - Prevent backdating beyond reasonable limits
   - Validate time sequence logic
   - Prevent duplicate entries for same date

2. **Audit Trail Protection**
   - Immutable audit records
   - Cryptographic signatures for critical changes
   - Complete change history preservation

## Performance Considerations

### Real-time Updates

1. **Database Optimization**
   - Efficient indexing on user_id, project_id, date
   - Optimized queries for state restoration
   - Connection pooling for frequent updates

2. **Client-side Optimization**
   - Debounced state updates
   - Local state caching
   - Efficient re-rendering strategies

### Scalability

1. **Concurrent Users**
   - Handle multiple users tracking time simultaneously
   - Efficient database connection management
   - Optimistic locking for conflict resolution

2. **Data Volume**
   - Efficient pagination for timecard lists
   - Archival strategies for old timecards
   - Optimized reporting queries

## Migration Strategy

### Database Schema Updates

1. **Existing Table Enhancement**
   - Add missing columns with default values
   - Update constraints for new validation rules
   - Create necessary indexes

2. **Data Migration**
   - Migrate existing timecard data to new structure
   - Preserve historical data integrity
   - Validate migrated data

### Component Integration

1. **Gradual Rollout**
   - Deploy time tracking component without integration
   - Test component in isolation
   - Integrate with existing timecard workflows

2. **Feature Flags**
   - Enable time tracking per project
   - Allow fallback to manual entry
   - Monitor system performance during rollout