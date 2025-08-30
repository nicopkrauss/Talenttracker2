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
- **Locations**: Default to House, Holding, Stage (customizable)
- **Roles & Pay**: Base pay rates with individual overrides
- **Team Assignment**: Drag-and-drop interface with "Randomize Remaining" option
- **Talent Import**: CSV import or manual entry with roster finalization

## Time Tracking State Machine

### Universal Time Tracking Flow
All time-tracking roles (Escort, Supervisor, TLC) follow the same pattern:

1. **Check In** → Logs timestamp, button becomes "Start My Break"
2. **Start My Break** → Logs break start, shows timer, button becomes "End My Break"
3. **Break Duration** → Button disabled until default duration (30/60 min) passes
4. **End My Break** → Logs break end, different next states by role:
   - **Escorts**: Button disappears (checkout by Supervisor)
   - **Supervisors/TLC**: Button becomes "Check Out"
5. **Check Out** → Logs checkout, resets to "Check In" for next day

### Break Management Rules
- **Grace Period**: If ended within 5 minutes of availability, logs exact default duration
- **Manual Edits**: Changes >15 minutes during review get flagged
- **Missing Breaks**: Shifts >6 hours require break resolution before timecard submission

## User Approval & Onboarding

### Registration Workflow
1. **Public Sign-up**: Full name, email, password, phone, location
2. **Terms Agreement**: Must check "I agree to Terms of Service and Privacy Policy"
3. **Pending State**: Full-screen message, no app access
4. **Admin Queue**: Bulk approval interface for administrators
5. **Activation**: Notification sent, account becomes active

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
- **Supervisors/TLC**: Favorited talent arrival (opt-in)
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