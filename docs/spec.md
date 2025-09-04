Master Product Specification: "Talent Tracker"
Version: 1.5 (Unified Application)
Date: November 1, 2023
Preamble: This document specifies the complete "Talent Tracker" application, a comprehensive operational management tool for live productions. It is designed as a standalone "source of truth" for designers, developers, and stakeholders. The application will be built as a responsive Progressive Web App (PWA) to ensure cross-platform compatibility (mobile and desktop) from a single codebase. Any feature, workflow, or detail not present in this document is considered out of scope for this version.
Part I: System Foundation & Core Concepts
1. Application Overview & Vision
1.1. Vision Statement: To provide a single, integrated platform for live event producers to manage projects, staff teams, track talent logistics in real-time, and handle team timekeeping and payroll data efficiently, reducing administrative overhead and improving on-site operational clarity.
1.2. Technical Architecture:
Platform: Progressive Web App (PWA) using modern web technologies (e.g., React).
Design Paradigm: Fully responsive. The UI must adapt seamlessly between mobile and desktop contexts.
Backend: Supabase will be used for the Database (PostgreSQL), Authentication, and serverless functions.
API Layer: The PWA frontend will communicate securely with the Supabase backend via the provided Supabase client libraries, which handle API requests.
Push Notifications: The app must support push notifications via standard Web Push APIs.
Data Security: All personally identifiable information (PII) must be stored securely, using Supabase's built-in security features, and encrypted both in transit (HTTPS) and at rest.
2. User Ranks, Roles, & Profiles
A person in the system is a "Team Member." For each project they are assigned to, they are given a "Project Role" (e.g., Talent Escort, Supervisor), which dictates their permissions and UI only within the context of that specific project.
2.1. Project Roles & Core Functionality
Project Role	Core Function	Tracks Own Time?	Manages Talent?	Initiates Daily Checkout (for Escorts)?	Approves Timecards?	Manages Projects?
Admin	System Owner	❌	✅ (Full)	✅	✅	✅
In-House	System Manager	❌	✅ (Full)	✅ (Configurable)	✅ (Configurable)	✅ (Configurable)
Supervisor	On-site Manager	✅ (Day Rate)	✅ (Full)	✅ (Configurable)	❌	❌
Coordinator	Informational Oversight	✅ (Day Rate)	✅ (Full)	❌	❌	❌
Talent Escort	On-the-ground Operator	✅ (Hourly)	✅ (Restricted)	❌	❌	❌
2.2. User Profile Page & Settings
Access: Every user has a "Profile" tab in their navigation.
Page Layout & Components:
User's Name (prominently displayed, non-editable by user).
Editable Fields: Profile Picture (Uploader), Contact Phone Number, Contact Email, Location (City, State).
Settings Access: A gearshape cog icon in the top-right of the Profile page opens the Settings screen.
Settings Screen:
Dark Mode Toggle.
Notification Preferences.
Data & Privacy Section: Contains a link to the application's Privacy Policy, a button to "Request My Data," and a button to "Request Account Deletion."
3. User Sign-Up, Onboarding & Legal Compliance
Workflow:
Public Sign-Up: A new user navigates to a public sign-up URL.
Sign-Up Form: They provide their information in the following logical order: Full Name, Email, Password, Contact Phone Number, Location (City, State).
Agreement: Before submitting, they must check a box: "I agree to the Terms of Service and Privacy Policy." (The words "Privacy Policy" must be a hyperlink).
Pending State: Upon submission, their account is in a "Pending Approval" state. The UI for the user at this stage is a single, full-screen message: "Your account has been created and is awaiting approval from an administrator. You will be notified when your account is active." They cannot access any other part of the application.
Admin Approval Queue: A "Pending Approval" queue is visible to Admins in the "Team" module.
Admin Action: The Admin can select one or multiple users from the queue and bulk-approve them.
Activation: Upon approval, the user's account status changes to "Active," and they receive a notification: "Welcome to Talent Tracker! Your account has been approved and is now active."
Part II: Global Navigation & UI Structure
4. Application Navigation
4.1. Mobile Navigation (Dock at bottom of screen):
Admin/In-House: [Projects (folder.fill) | Team (person.3.fill) | Talent (star.fill) | Timecards (list.bullet.clipboard.fill) | Profile (person.crop.circle.fill)]
Supervisor/Coordinator: [Talent (star.fill) | Team (person.3.fill) | Timecards (list.bullet.clipboard.fill) | Profile (person.crop.circle.fill)]
Talent Escort: [Talent (star.fill) | Timecards (list.bullet.clipboard.fill) | Profile (person.crop.circle.fill)]
4.2. Desktop Navigation (Top navigation bar):
Links: "Projects," "Team," "Talent," "Timecards" (visibility based on rank).
User Menu (Far Right): User's name/profile picture. Tapping opens a dropdown with "Profile" and "Settings."
Part III: Project Management Module
5. Projects Hub & Project Lifecycle
5.1. Workflow: Creating a Project
Admin clicks the "+" button on the Projects Hub.
A form appears requesting: Project Name (req), Production Company, Hiring Contact, Project Location, Start/End Dates (req), Description.
Admin clicks "Save Project."
The system creates the project with "Prep" status and navigates to the Project Details screen.
5.2. Project Lifecycle: Prep to Active State
The Project Setup Checklist: For "Prep" status projects, the Project Details screen features a guide: [ ] Add Project Roles & Pay Rates, [ ] Finalize Talent Roster, [ ] Finalize Team Assignments, [ ] Define Talent Locations.
Workflow: Transitioning from "Prep" to "Active"
Admin completes the setup tasks.
Once all checklist items are [✓], a "Set Project to Active" button appears.
This is a manual action. Tapping it (with confirmation) changes the project status to "Active."
Workflow: Modifying a Finalized Team/Talent Roster: Clicking "Modify Team" or "Modify Roster" unticks the corresponding checklist item but does not change the project status if "Active."
5.3. Project Details Screen - Core Sections
Section: Project Information: Includes the "Define Talent Locations" functionality, where an Admin can manage the list of location-statuses for the project (defaults: House, Holding, Stage).
Section: Roles & Team: Admin defines Project Roles, sets Base Pay, and uses the "Finalize Team Assignments" button. They assign Team Members with overridden rates and specific schedules.
Section: Talent Roster: Admin can "Import Talent CSV" or "Add Talent Manually." A "Finalize Talent Roster" button is present.
Section: Assignments: A drag-and-drop interface for Admin, In-House, and Supervisors to pair unassigned Escorts with unassigned Talent. A "Randomize Remaining" button automates pairing.
Part IV: Daily Operations & Time Logging
6. Team & Talent Management Views
6.1. Time Logging Workflow for All Ranks (Escort, Supervisor, Coordinator)
User Story: "As an on-site team member, I need a simple, one-button way to manage my shift status (checked-in, on break, checked-out) without navigating to different screens."
Persistent Action Bar: A static bar appears at the top or bottom of the primary operational tabs ("Talent," "Team") for all time-tracking ranks. It displays "[Project Name]" and a single, stateful action button.
Button State Machine:
Initial State: Button reads "Check In."
User taps "Check In." The timestamp is logged, and the button changes to "Start My Break."
User taps "Start My Break." The breakStartTime is logged, and the button changes to "End My Break." A timer is displayed on/near the button, counting up. The button is disabled until the "Default Break Duration" (30/60 mins) has passed.
Once the break duration is met, the "End My Break" button becomes clickable.
User taps "End My Break." The breakEndTime is logged.
For Talent Escorts: The button disappears. Their checkout is initiated by a Supervisor.
For Supervisors & Coordinators: The button changes to "Check Out."
A Supervisor/Coordinator taps "Check Out." Their checkoutTime is logged, and the button state resets to "Check In" for the next day.
Grace Period Logic: If "End My Break" is tapped within 5 minutes of it becoming available, the break is logged as the exact default duration (30/60 mins). Otherwise, it logs the actual time. Manually editing a break time by more than 15 minutes during final timecard review will flag it.
Modal for Corrections: The modal-based time entry UI is used only when correcting a missed break during the final Project Timecard submission.
6.2. Supervisor & Coordinator Dashboards
Default View: Both roles default to the "Talent" tab.
"Team" Tab: Both can switch to the "Team" tab. The list is sorted with checked-in Escorts at the top. Hour tracking indicators (Yellow/Red) apply to all ranks.
6.3. Talent Escort's "Talent" Tab & Workflow
Pre-Check-In View: The "Talent" tab screen is locked and shows: "Your call is at [Time]" with a disabled "Check In" button and a countdown.
Floater Escort Workflow: A "Floater" sees a "View All Talent" button, which opens a read-only list of all project talent, where they can tap any talent to update their location.
6.4. Talent Status & Location Workflow
The Talent Detail View: Shows all relevant Talent information. For authorized roles (Admin, IH, Sup, Coordinator), it includes a section for the "Assigned Escort" with their name and a "Call Escort" button. This section is hidden from the Escort's own view.
Workflow: Updating a Location: User taps the current location text, revealing an accordion of buttons for the project-defined locations.
Favoriting Talent: Users with full talent list access can tap a star icon on a Talent card. Favorites are sorted to the top of the list for that user on that project.
Part V: Timecard & Approval Module
7. Timecard Workflow (For All Time-Tracking Ranks)
Access: "Timecards" tab in the dock.
Workflow: Resolving Missing Break Information during Submission:
User clicks "Submit Project Timecard."
If a shift is more than 6 hours and is missing break information, submission is blocked.
A modal appears listing the dates with missing break data. For each date, the user is presented with two buttons: "[Add Break]" and "[I Did Not Take a Break]".
Once all dates are resolved, the user can successfully submit.
8. Supervisor & Admin Workflows
8.1. Supervisor - Daily Checkout Workflow (for Escorts):
Workflow:
Supervisor navigates to the "Team" tab. In the top right, they tap a multi-select icon.
This enters "selection mode": empty circles appear next to each checked-in Escort.
As the Supervisor selects Escorts, a persistent footer appears showing "Check Out [X] Selected".
Tapping the footer brings up the confirmation modal.
Confirmation Modal:
Message: "You are about to check out [Number of valid Escorts] team members."
Warning Section: "⚠️ Action Required: The following team members have open breaks and will not be included in this checkout:" followed by a list of names.
Button: "Confirm Checkout for [Number Valid]/[Number Attempted]" and "Cancel."
Valid checkouts are processed. Escorts with issues remain on the active list, highlighted.
8.2. Admin - Timecard Approval Workflow:
In the "Timecards" tab, Admins review submitted timecards. All user-edited fields are highlighted.
Two-Way Confirmation: If an Admin edits a timecard, they must add a note. The timecard is returned to the user, who must "Approve and Resubmit."
9. Notifications
To Time-Tracking Ranks (Escorts, Supervisors, Coordinators):
"Timecard submission for '[Project Name]' is now open."
"Don't forget to submit your timecard for [Project Name]!" (Triggers 24h before the Target Submission Date set in Project Settings).
"Action Required: Your timecard for [Project Name]' was not approved. Tap to see why."
Personal Break Reminders.
Specific to Escorts: Talent arrival notifications.
Specific to Supervisors/Coordinators: Notification when a favorited talent arrives. A one-time prompt will ask if they want to enable this the first time they favorite a talent.
To Management (Consolidated):
"A few team members are approaching the end of their 12-hour shift."
10. Admin Settings Module
Access: Via the "Settings" tab in the Admin dock. Each setting includes a (?) tooltip.
Key Settings: User Management, Project Defaults, Time & Payroll (Default Break Duration), System (Email Offer Toggle, Archiving Timezone), Data & Privacy (Global and per-project toggle for Supervisor/Coordinator access to Rep Contact Info), Email Templates.
11. Work In Progress / Future Considerations
Automated Talent Scheduling via Run-of-Show CSV Import: For V1, a Talent's specific daily schedule is considered an offline detail.