# Project Readiness System - Detailed Specification

## Overview

Replace the rigid prep/active checklist with a flexible **minimum requirements** system that provides specific guidance while allowing immediate operational use.

## Core Principle

**Every feature should be available as soon as its minimum requirements are met, with clear guidance on how to improve the experience.**

## Tracked Metrics & Requirements

### 1. Locations Setup
**What's Tracked:**
```typescript
interface LocationsReadiness {
  hasDefaultLocations: boolean;     // House, Holding, Stage exist
  customLocationCount: number;      // Additional locations added
  isFinalized: boolean;             // Admin has confirmed locations complete
  status: 'default-only' | 'configured' | 'finalized';
}
```

**Requirements:**
- **Default-only**: Only default locations (House, Holding, Stage) exist
- **Configured**: Custom locations added but not finalized
- **Finalized**: Admin has confirmed all needed locations are set up

**Specific Guidance:**
- ❌ **Default-only (Red)**: "Add custom locations like 'Wardrobe', 'Makeup', 'Green Room' then finalize setup"
- ⚠️ **Configured (Yellow)**: "Finalize location setup to confirm all needed locations are ready"
- ✅ **Finalized (Green)**: "Location setup complete - talent can be tracked across all areas"

### 2. Role Templates & Pay Rates
**What's Tracked:**
```typescript
interface RolesReadiness {
  hasDefaultRoles: boolean;         // Supervisor, Coordinator, Escort defined
  customRoleCount: number;          // Additional roles added
  isFinalized: boolean;             // Admin has confirmed roles complete
  status: 'default-only' | 'configured' | 'finalized';
}
```

**Requirements:**
- **Default-only**: Only default roles (Supervisor $300/day, Coordinator $350/day, Escort $20/hr)
- **Configured**: Custom roles added but not finalized
- **Finalized**: Admin has confirmed all needed roles are set up

**Specific Guidance:**
- ❌ **Default-only (Red)**: "Add any custom roles needed for this production then finalize setup"
- ⚠️ **Configured (Yellow)**: "Finalize role setup to confirm all needed roles and pay rates are ready"
- ✅ **Finalized (Green)**: "Role setup complete - team assignments and timecards ready"

### 3. Team Assignments
**What's Tracked:**
```typescript
interface TeamReadiness {
  totalStaffAssigned: number;       // Staff assigned to project
  supervisorCount: number;          // Critical for checkout functionality
  escortCount: number;              // Critical for assignments
  isFinalized: boolean;             // Admin has confirmed team complete
  status: 'none' | 'partial' | 'finalized';
}
```

**Requirements:**
- **None**: No staff assigned
- **Partial**: Staff assigned but not finalized
- **Finalized**: Admin has confirmed team is ready for operations

**Specific Guidance:**
- ❌ **None (Red)**: "Assign team members to enable time tracking and operations"
- ⚠️ **Partial (Yellow)**: "Finalize team assignments to confirm all needed staff are ready"
- ✅ **Finalized (Green)**: "Team ready - all operations available"

### 4. Talent Roster
**What's Tracked:**
```typescript
interface TalentReadiness {
  totalTalent: number;              // Talent added to project
  isFinalized: boolean;             // Admin has confirmed roster complete
  status: 'none' | 'partial' | 'finalized';
}
```

**Requirements:**
- **None**: No talent added
- **Partial**: Talent added but not finalized
- **Finalized**: Admin has confirmed roster is ready

**Specific Guidance:**
- ❌ **None (Red)**: "Add talent to enable escort assignments and location tracking"
- ⚠️ **Partial (Yellow)**: "Finalize talent roster to confirm all expected talent are added"
- ✅ **Finalized (Green)**: "Talent roster complete - ready for assignments"

### 5. Escort Assignments (Daily Progress)
**What's Tracked:**
```typescript
interface AssignmentsReadiness {
  dailyProgress: DailyAssignmentStatus[];  // Per-day assignment status
  overallStatus: 'none' | 'partial' | 'current' | 'complete';
}

interface DailyAssignmentStatus {
  date: string;
  totalTalent: number;
  assignedTalent: number;
  unassignedTalent: number;
  status: 'complete' | 'partial' | 'none';
}
```

**Requirements:**
- **None**: No assignments made
- **Partial**: Some days have assignments
- **Current**: Today/tomorrow assignments complete
- **Complete**: All upcoming days assigned

**Specific Guidance:**
- Uses existing escort assignment tracker from project overview
- Shows day-by-day progress with unassigned talent counts
- Highlights urgent days (today/tomorrow) vs future planning

## Feature Availability Matrix

### Time Tracking
**Minimum Requirement**: `teamReadiness.totalStaffAssigned > 0`

**Guidance When Not Available:**
- "Assign team members to enable time tracking" → [Go to Roles & Team]

**Guidance When Available:**
- ✅ "Time tracking available - team members can check in and out"

### Escort Assignments
**Minimum Requirement**: `talentReadiness.totalTalent > 0 && teamReadiness.escortCount > 0`

**Guidance When Not Available:**
- If no talent: "Add talent to enable assignments" → [Go to Talent Roster]
- If no escorts: "Assign escorts to enable assignments" → [Go to Roles & Team]

**Guidance When Available:**
- ✅ "Assignments available - pair escorts with talent for each day"

### Location Tracking
**Minimum Requirement**: `locationsReadiness.hasDefaultLocations && assignmentsReadiness.totalAssignments > 0`

**Guidance When Not Available:**
- If no locations: "Set up locations to enable talent tracking" → [Go to Info Tab]
- If no assignments: "Make escort assignments to enable location tracking" → [Go to Assignments]

**Guidance When Available:**
- ✅ "Location tracking active - talent locations update in real-time"

### Supervisor Checkout
**Minimum Requirement**: `teamReadiness.supervisorCount > 0 && teamReadiness.escortCount > 0`

**Guidance When Not Available:**
- "Assign a Supervisor to enable team checkout controls" → [Go to Roles & Team]

**Guidance When Available:**
- ✅ "Supervisor controls available - manage team check-ins and checkouts"

## UI Implementation

### Info Tab - Project Dashboard
Replace individual tab status cards with a comprehensive **To-Do List & Info Dashboard** in the Info tab:

```typescript
interface ProjectDashboard {
  overallStatus: 'getting-started' | 'operational' | 'production-ready';
  todoItems: TodoItem[];
  completedItems: CompletedItem[];
  assignmentProgress: AssignmentProgress;
}

interface TodoItem {
  id: string;
  area: 'locations' | 'roles' | 'team' | 'talent' | 'assignments';
  priority: 'critical' | 'important' | 'optional';
  title: string;
  description: string;
  actionText: string;
  actionRoute: string;
}

interface AssignmentProgress {
  upcomingDays: DailyAssignmentStatus[];
  urgentDays: DailyAssignmentStatus[];  // Today + tomorrow
}
```

**Visual Design - Info Tab Dashboard:**
```
┌─ Project Status ────────────────────────────────┐
│ 🟡 Operational - Ready for limited operations   │
└─────────────────────────────────────────────────┘

┌─ To-Do List ────────────────────────────────────┐
│ Critical:                                       │
│ ❌ Finalize team assignments                    │
│    8 staff assigned but not confirmed ready    │
│    → Go to Roles & Team                        │
│                                                 │
│ Important:                                      │
│ ⚠️  Complete tomorrow's escort assignments      │
│    3 of 15 talent still need escorts           │
│    → Go to Assignments                         │
│                                                 │
│ ⚠️  Finalize talent roster                      │
│    12 talent added but not confirmed complete  │
│    → Go to Talent Roster                       │
│                                                 │
│ Optional:                                       │
│ 💡 Add custom locations                         │
│    Consider adding Wardrobe, Makeup areas      │
│    → Go to Info Tab (Locations)                │
└─────────────────────────────────────────────────┘

┌─ Completed Setup ───────────────────────────────┐
│ ✅ Role templates configured                    │
│ ✅ Default locations ready                      │
│ ✅ Time tracking available                      │
└─────────────────────────────────────────────────┘

┌─ Assignment Progress ───────────────────────────┐
│ Urgent:                                         │
│ • Today (Dec 12): ✅ All 12 talent assigned    │
│ • Tomorrow (Dec 13): ⚠️  3 of 15 need escorts  │
│                                                 │
│ Upcoming:                                       │
│ • Dec 14: ✅ Complete (10/10)                  │
│ • Dec 15: ❌ Not started (0/15)                │
│ • Dec 16: ❌ Not started (0/15)                │
│                                                 │
│ → Go to Assignments for full calendar view     │
└─────────────────────────────────────────────────┘
```

### Project Overview Card
Simplified status in the project overview (always visible):

```
┌─ Project Overview ──────────────────────────────┐
│ Production Name • Dec 12-18, 2024              │
│ 🟡 Operational • 15 talent • 8 staff           │
│                                                 │
│ Quick Status:                                   │
│ ✅ Time tracking ready                          │
│ ⚠️  3 urgent assignment issues                  │
│ ✅ Locations configured                         │
│                                                 │
│ → View full dashboard in Info tab              │
└─────────────────────────────────────────────────┘
```

### Contextual Guidance
Show guidance exactly where users need it:

**Empty States:**
- Talent Roster (empty): "Import talent via CSV or add manually to enable assignments" → [Import CSV] [Add Manually]
- Team Assignments (empty): "Assign team members to enable time tracking and operations" → [Browse Available Staff]
- Assignments (empty): "Add talent and assign team members first" → [Go to Talent Roster] [Go to Roles & Team]

**Finalization Buttons:**
- Replace "Activate Project" with finalization actions:
  - "Finalize Location Setup" (after adding custom locations)
  - "Finalize Team Assignments" (after assigning staff)
  - "Finalize Talent Roster" (after adding talent)
  - "Finalize Role Configuration" (after setting up roles)

**Progress Indicators:**
- Show setup status: "Team: Not Finalized (8 assigned)" 
- Use status badges instead of percentages
- Highlight finalization as the key action

## Database Schema

```sql
CREATE TABLE project_readiness (
  project_id UUID PRIMARY KEY REFERENCES projects(id),
  
  -- Locations
  has_default_locations BOOLEAN DEFAULT TRUE,  -- Auto-created
  custom_location_count INTEGER DEFAULT 0,
  locations_finalized BOOLEAN DEFAULT FALSE,
  locations_status VARCHAR(20) DEFAULT 'default-only',
  
  -- Roles & Pay
  has_default_roles BOOLEAN DEFAULT TRUE,      -- Auto-created
  custom_role_count INTEGER DEFAULT 0,
  roles_finalized BOOLEAN DEFAULT FALSE,
  roles_status VARCHAR(20) DEFAULT 'default-only',
  
  -- Team
  total_staff_assigned INTEGER DEFAULT 0,
  supervisor_count INTEGER DEFAULT 0,
  escort_count INTEGER DEFAULT 0,
  coordinator_count INTEGER DEFAULT 0,
  team_finalized BOOLEAN DEFAULT FALSE,
  team_status VARCHAR(20) DEFAULT 'none',
  
  -- Talent
  total_talent INTEGER DEFAULT 0,
  talent_finalized BOOLEAN DEFAULT FALSE,
  talent_status VARCHAR(20) DEFAULT 'none',
  
  -- Assignments (calculated from existing assignment tracker)
  assignments_status VARCHAR(20) DEFAULT 'none',
  urgent_assignment_issues INTEGER DEFAULT 0,  -- Today/tomorrow unassigned
  
  -- Overall
  overall_status VARCHAR(20) DEFAULT 'getting-started',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers to update readiness when data changes
CREATE OR REPLACE FUNCTION update_project_readiness()
RETURNS TRIGGER AS $$
BEGIN
  -- Update readiness calculations
  -- (Implementation would calculate all the metrics above)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Benefits of This System

1. **Immediate Value**: Users can start using features right away
2. **Clear Direction**: Specific guidance on what to do next
3. **Flexible**: Accommodates different project types and workflows
4. **Progressive**: Guides users from basic to advanced functionality
5. **Realistic**: Matches how productions actually work

This system transforms the rigid checklist into intelligent guidance that helps users build toward full operational capability while never blocking them from using available features.