# Project Details Page Wireframe

This document defines the complete structure and behavior of the redesigned project details page, which serves as the central hub for project management.

## Page Structure Overview

The project details page has two distinct modes based on project status:
- **Setup Mode** (Prep Status): Tabbed interface for project configuration
- **Operations Mode** (Active Status): Dashboard interface for live project management

## Header (Sticky Top Row)

**Always visible at the top of the page**

```
┌─────────────────────────────────────────────────────────────────┐
│ [Edit Icon] Project Title                    [Status Badge]      │
└─────────────────────────────────────────────────────────────────┘
```

### Components:
- **Edit Icon**: Quick access to edit project (existing functionality)
- **Project Title**: Large, prominent display of project name
- **Status Badge**: Color-coded status indicator
  - `[Prep]` - Secondary/gray styling
  - `[Active]` - Green styling  
  - `[Archived]` - Muted/outline styling

## Project Overview Card (Always Visible)

**Appears directly below header, always visible regardless of mode**

```
┌─────────────────────────────────────────────────────────────────┐
│ Project Overview                                                │
├─────────────────────────────────────────────────────────────────┤
│ Dates: Jan 15, 2024 – Feb 28, 2024  |  Location: Los Angeles   │
│ Production: Warner Bros  |  Contact: Jane Smith                 │
│                                                                 │
│ Talent: 12 Expected, 8 Assigned  |  Staff: 6 Needed, 4 Assigned│
├─────────────────────────────────────────────────────────────────┤
│ Setup Checklist (Prep Only):                                   │
│ ☑ Roles & Pay Rates  ☐ Talent Roster  ☐ Team Assignments  ☐ Locations │
│                                                                 │
│              [Set Project to Active] (when all ☑)              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Requirements:
- **New Field**: `talent_expected` (integer, nullable)
- **Calculated Fields**:
  - Talent assigned count (from talent_roster table)
  - Staff needed count (sum of role requirements)
  - Staff assigned count (from team assignments)

### Behavior:
- Setup checklist only shows when project status is 'prep'
- "Set Project to Active" button only appears when all checklist items are complete
- Statistics update in real-time as data changes

## Setup Mode (Prep Status Only)

### Tabbed Navigation

```
┌─────────────────────────────────────────────────────────────────┐
│ [Info] [Roles & Team] [Talent Roster] [Assignments] [Settings] │
└─────────────────────────────────────────────────────────────────┘
```

### Info Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ Description                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Editable text block for project description]              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Talent Locations Manager                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ • House (default)                                           │ │
│ │ • Holding (default)                                         │ │
│ │ • Stage (default)                                           │ │
│ │ • Custom Location 1                                         │ │
│ │                                                             │ │
│ │ [+ Add Location] (Name, Abbrev, Color picker)              │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Roles & Team Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ Role Definition Table                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Role        │ Base Pay │ Time Type │ # Assigned            │ │
│ │ Supervisor  │ $300/day │ Daily     │ 2                     │ │
│ │ Escort      │ $20/hr   │ Hourly    │ 4                     │ │
│ │ TLC         │ $350/day │ Daily     │ 1                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Team Assignment Interface                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Filters & Search                                            │ │
│ │ ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│ │ │ [Search Name...] │ │ [Role: All▼]│ │ [Location: All▼]│   │ │
│ │ └─────────────────┘ └─────────────┘ └─────────────────┘   │ │
│ │ ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│ │ │ [Status: All▼]  │ │ [Exp: All▼] │ │ [Clear Filters] │   │ │
│ │ └─────────────────┘ └─────────────┘ └─────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Staff List with Bulk Actions                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [☐] Select All (12 staff)    [Assign Selected to: Role▼]   │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [☐] Alice Smith      │ Admin     │ LA, CA    │ Available    │ │
│ │     alice@prod.com   │ 3yr exp   │ Phone: 555-0123        │ │
│ │                                                             │ │
│ │ [☑] Bob Johnson      │ In-House  │ LA, CA    │ Supervisor  │ │
│ │     bob@prod.com     │ 5yr exp   │ Phone: 555-0124        │ │
│ │     Pay: $320/day    │ Notes: Lead supervisor             │ │
│ │                                                             │ │
│ │ [☐] Carol Davis      │ None      │ NYC, NY   │ Available    │ │
│ │     carol@prod.com   │ 1yr exp   │ Phone: 555-0125        │ │
│ │                                                             │ │
│ │ [☑] Mike Wilson      │ None      │ LA, CA    │ Escort      │ │
│ │     mike@prod.com    │ 2yr exp   │ Phone: 555-0126        │ │
│ │     Pay: $22/hr      │ Notes: Experienced with VIPs       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Assignment Summary                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Supervisor: 2 assigned │ Escort: 4 assigned │ TLC: 1 assigned│ │
│ │ Total Staff: 7/12      │ Estimated Cost: $2,840/day        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                    [Finalize Team Assignments]                 │
└─────────────────────────────────────────────────────────────────┘
```


### Talent Roster Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ [Import CSV] [Add Manually]                                     │
│                                                                 │
│ Talent Table                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Search/Filter...]                                          │ │
│ │                                                             │ │
│ │ Name          │ Contact       │ Role    │ Escort   │ Status │ │
│ │ Celebrity A   │ agent@...     │ Lead    │ John D   │ ✓      │ │
│ │ Celebrity B   │ manager@...   │ Support │ Jane S   │ ✓      │ │
│ │ Celebrity C   │ direct@...    │ Guest   │ -        │ ⚠      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Bulk Actions: [Export] [Remove Selected] [Reassign Escort]     │
│                                                                 │
│                     [Finalize Talent Roster]                   │
└─────────────────────────────────────────────────────────────────┘
```

### Assignments Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ Drag & Drop Pairing Interface                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Unassigned Talent      │ Center Zone │ Unassigned Escorts   │ │
│ │ ┌─────────────────┐   │             │ ┌─────────────────┐   │ │
│ │ │ Celebrity A     │   │    Drag     │ │ John Doe        │   │ │
│ │ │ Celebrity C     │   │      →      │ │ Mike Wilson     │   │ │
│ │ │ Celebrity D     │   │    Match    │ │                 │   │ │
│ │ └─────────────────┘   │      ←      │ └─────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Actions: [Randomize Remaining] [Clear All Assignments]         │
│                                                                 │
│ Current Assignments                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Celebrity A ↔ John Doe                                      │ │
│ │ Celebrity B ↔ Jane Smith                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Settings Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ Project Configuration                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Default Break Duration: [30 min ▼]                         │ │
│ │ Payroll Export Format: [CSV ▼]                             │ │
│ │ Notification Rules: [Configure...]                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Audit Log                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Jan 15, 10:30 AM - John Doe added 3 talent members         │ │
│ │ Jan 15, 11:15 AM - Jane Smith updated pay rates            │ │
│ │ Jan 16, 09:00 AM - Admin activated project                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Attachments & Notes                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Upload File] [Add Note]                                    │ │
│ │                                                             │ │
│ │ • project_contract.pdf                                      │ │
│ │ • "Remember to check catering requirements"                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Operations Mode (Active Status)

**Replaces tabbed interface with vertical dashboard layout**

### Live KPIs Section

```
┌─────────────────────────────────────────────────────────────────┐
│ Live Project Status                                             │
├─────────────────────────────────────────────────────────────────┤
│ Staff: 4/6 Checked In  │  Talent: 8/12 Present  │  Active: 4   │
│ ⚠ 2 Staff over 8hrs    │  🔴 1 Staff over 12hrs               │
└─────────────────────────────────────────────────────────────────┘
```

### Talent Locations Board

```
┌─────────────────────────────────────────────────────────────────┐
│ Talent Location Tracking                    [Search/Filter...] │
├─────────────────────────────────────────────────────────────────┤
│ Name          │ Status      │ Location │ Quick Actions         │
│ Celebrity A   │ ✓ Present   │ House    │ [→ Holding] [→ Stage] │
│ Celebrity B   │ ✓ Present   │ Stage    │ [→ House] [→ Holding] │
│ Celebrity C   │ ⚠ Not Arr.  │ -        │ [Check In]            │
│ Celebrity D   │ ✓ Present   │ Holding  │ [→ House] [→ Stage]   │
└─────────────────────────────────────────────────────────────────┘
```

### Team Status Board

```
┌─────────────────────────────────────────────────────────────────┐
│ Team Status & Time Tracking                                     │
├─────────────────────────────────────────────────────────────────┤
│ Name        │ Role       │ Status    │ Time    │ Actions        │
│ John Doe    │ Supervisor │ ✓ Active  │ 6.5hrs  │ [Checkout]     │
│ Jane Smith  │ Supervisor │ 🟡 Break  │ 8.2hrs  │ [End Break]    │
│ Mike Wilson │ Escort     │ ✓ Active  │ 12.1hrs │ 🔴 [Checkout]  │
│ Sarah Brown │ Escort     │ ⚪ Out    │ 7.8hrs  │ -              │
├─────────────────────────────────────────────────────────────────┤
│ Supervisor Controls: [☐] Select All  [Checkout Selected]       │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Requirements

### Database Schema Updates
- Add `talent_expected` field to projects table
- Add `description` field to projects table (if not exists)
- Ensure project_locations table supports color field
- Add audit_log table for tracking changes
- Add project_attachments table for file uploads

### API Endpoints Needed
- GET/POST/PUT/DELETE `/api/projects/[id]/locations`
- GET/POST `/api/projects/[id]/team-assignments`
- GET/POST `/api/projects/[id]/talent-assignments`
- GET `/api/projects/[id]/statistics`
- GET `/api/projects/[id]/audit-log`
- POST `/api/projects/[id]/attachments`

### Component Architecture
- `ProjectDetailLayout` - Main layout component handling mode switching
- `ProjectHeader` - Sticky header component
- `ProjectOverviewCard` - Statistics and checklist display
- `ProjectTabs` - Tab navigation for setup mode
- `OperationsDashboard` - Active project dashboard
- Individual tab components for each setup section
- Real-time data hooks for live updates

### State Management
- Project data context for sharing across components
- Real-time subscriptions for active project updates
- Form state management for each tab
- Optimistic updates for quick interactions

This wireframe serves as the definitive guide for implementing the new project details page structure.