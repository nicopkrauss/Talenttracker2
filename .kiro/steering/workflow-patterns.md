---
inclusion: always
---

# Workflow Patterns & Business Logic

## Project Lifecycle Management

### Project Status Flow
1. **Prep Status**: New projects start in preparation mode
2. **Setup Checklist**: Must complete all items before activation
   - Add Project Roles & Pay Rates
   - Finalize Talent Roster  
   - Finalize Team Assignments
   - Define Talent Locations
3. **Active Status**: Manual transition after checklist completion
4. **Modification Rules**: Changes to finalized items untick checklist but don't revert status

### Project Setup Requirements
- **Role Templates**: Define roles with display names, pay rates, and time types (hourly/daily)
- **Locations**: Default to House, Holding, Stage (customizable with colors and sort order)
- **Team Assignments**: Staff assignment with role-specific pay rate overrides
- **Talent Roster**: Enhanced talent profiles with representative information
- **Setup Checklist**: Automated tracking of completion status for each setup phase

## Time Tracking State Machine

### Universal Time Tracking Flow
All time-tracking roles (Escort, Supervisor, Coordinator) follow the same pattern:

1. **Check In** → Logs timestamp, button becomes "Start My Break"
2. **Start My Break** → Logs break start, shows timer, button becomes "End My Break"
3. **Break Duration** → Button disabled until default duration (30/60 min) passes
4. **End My Break** → Logs break end, different next states by role:
   - **Escorts**: Button disappears (checkout by Supervisor)
   - **Supervisors/Coordinator**: Button becomes "Check Out"
5. **Check Out** → Logs checkout, resets to "Check In" for next day

### Break Management Rules
- **Grace Period**: If ended within 5 minutes of availability, logs exact default duration
- **Manual Edits**: Changes >15 minutes during review get flagged
- **Missing Breaks**: Shifts >6 hours require break resolution before timecard submission

## User Approval & Onboarding

### Registration Workflow
1. **Role Selection**: User selects their hired position (Talent Escort, Coordinator, Supervisor, In-House)
2. **Registration Form**: Full name, email, password, phone, nearest major city, flight willingness
3. **Terms Agreement**: Must check "I agree to Terms of Service and Privacy Policy"
4. **Auto-Profile Creation**: Database trigger creates profile with 'pending' status
5. **Admin Notification**: Email sent to admins about new registration
6. **Pending State**: Full-screen message, no app access until approved
7. **Admin Approval**: Bulk approval interface for administrators
8. **Activation**: Status changed to 'active', notification sent, account becomes operational

### Account States
- **Pending**: Awaiting admin approval, limited access
- **Active**: Full access based on assigned project roles
- **Suspended**: Temporary access restriction (future consideration)

## Notification Triggers

### Time-Tracking Notifications
- Timecard submission opens
- 24h reminder before submission deadline
- Timecard rejection with required action
- Personal break reminders
- 12-hour shift warnings (to management)

### Talent & Operations
- **Escorts**: Talent arrival notifications
- **Supervisors/Coordinator**: Favorited talent arrival (opt-in)
- **Management**: Consolidated shift limit warnings

## Data Validation & Error Handling

### Form Validation Patterns
- Real-time validation with immediate feedback
- Server-side validation as backup
- Clear error messages with correction guidance
- Prevent submission until all errors resolved

### Timecard Validation
- Missing break detection for long shifts
- Overtime calculation and warnings
- Admin edit tracking with required notes
- Two-way confirmation for disputed entries