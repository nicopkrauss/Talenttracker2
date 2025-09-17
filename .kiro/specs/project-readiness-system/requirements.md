# Project Readiness System - Requirements

## Overview

Replace the rigid prep/active checklist system with a flexible finalization-based readiness system that provides intelligent guidance while allowing immediate operational use of all features. Add a mode toggle system to switch between configuration and operations views.

## Core Requirements

### Requirement 1: Finalization-Based Setup System

**User Story:** As an admin, I want to set up project components and finalize them when ready, so that I can manage project setup flexibly without artificial barriers.

#### Acceptance Criteria

1. WHEN I create a project THEN the system SHALL create default locations (House, Holding, Stage) and default roles (Supervisor, Coordinator, Escort) automatically
2. WHEN I add custom locations or roles THEN the system SHALL track them as "configured" but not finalized
3. WHEN I finalize an area THEN the system SHALL mark it as complete and track who finalized it and when
4. WHEN I add more items after finalization THEN the system SHALL allow additions without reverting finalized status
5. WHEN I view project status THEN the system SHALL show clear indicators for default-only, configured, and finalized states

### Requirement 2: Intelligent To-Do Dashboard

**User Story:** As a project manager, I want to see a prioritized list of setup tasks, so that I know what needs attention to make the project operational.

#### Acceptance Criteria

1. WHEN I view the Info tab THEN the system SHALL display a collapsible dashboard with prioritized to-do items
2. WHEN there are critical issues THEN the system SHALL show them in red with specific guidance
3. WHEN there are important improvements THEN the system SHALL show them in yellow with helpful suggestions
4. WHEN there are optional enhancements THEN the system SHALL show them in blue as suggestions
5. WHEN I complete tasks THEN the system SHALL move them to a "Completed Setup" section

### Requirement 3: Feature Availability Based on Minimum Requirements

**User Story:** As a user, I want to access features as soon as their minimum requirements are met, so that I can start using the system immediately.

#### Acceptance Criteria

1. WHEN I assign at least one staff member THEN the system SHALL enable time tracking features
2. WHEN I have both talent and escorts assigned THEN the system SHALL enable assignment features
3. WHEN I have locations and assignments THEN the system SHALL enable location tracking features
4. WHEN requirements are not met THEN the system SHALL show clear guidance with navigation buttons to relevant tabs
5. WHEN I click guidance buttons THEN the system SHALL navigate to the appropriate tab to resolve the issue

### Requirement 4: Mode Toggle System

**User Story:** As a user, I want to switch between configuration and operations modes, so that I can access the right interface for my current task.

#### Acceptance Criteria

1. WHEN I view a project THEN the system SHALL display a mode toggle button in the header between the project title and status badge
2. WHEN I click the mode toggle THEN the system SHALL switch between Configuration and Operations modes
3. WHEN in Configuration mode THEN the system SHALL show the tabbed interface with Info, Roles & Team, Talent Roster, Assignments, and Settings tabs
4. WHEN in Operations mode THEN the system SHALL show the live operations dashboard
5. WHEN I switch modes THEN the system SHALL remember my preference for that project

### Requirement 5: Collapsible Info Tab Layout

**User Story:** As a user, I want to organize the Info tab content efficiently, so that I can focus on relevant sections.

#### Acceptance Criteria

1. WHEN I view the Info tab THEN the system SHALL display the project dashboard at the top in a collapsible section
2. WHEN I view existing sections THEN the system SHALL make Project Description and Talent Locations collapsible
3. WHEN I collapse sections THEN the system SHALL remember the state during my session
4. WHEN sections are not finalized THEN the system SHALL show finalization buttons in section headers
5. WHEN I click finalize buttons THEN the system SHALL mark the area as complete and update the dashboard

### Requirement 6: Real-Time Status Updates

**User Story:** As a user, I want project readiness to update automatically when I make changes, so that I always see current status.

#### Acceptance Criteria

1. WHEN I add locations, roles, staff, or talent THEN the system SHALL update readiness metrics automatically
2. WHEN I remove items THEN the system SHALL recalculate status without affecting finalization
3. WHEN readiness changes THEN the system SHALL update the dashboard and overview card immediately
4. WHEN multiple users work on the same project THEN the system SHALL sync changes across sessions
5. WHEN I view any project tab THEN the system SHALL show current readiness status consistently

### Requirement 7: Assignment Progress Integration

**User Story:** As a user, I want to see assignment progress in the dashboard, so that I can quickly identify urgent issues.

#### Acceptance Criteria

1. WHEN I view the dashboard THEN the system SHALL show a summary of assignment progress
2. WHEN there are urgent assignment issues THEN the system SHALL highlight them with specific counts
3. WHEN assignments are complete THEN the system SHALL show positive confirmation
4. WHEN I click assignment progress THEN the system SHALL navigate to the Assignments tab
5. WHEN assignment data changes THEN the system SHALL update the dashboard summary immediately

### Requirement 8: Clean Migration from Old System

**User Story:** As a system administrator, I want to migrate from the old checklist system seamlessly, so that existing projects continue to work.

#### Acceptance Criteria

1. WHEN the migration runs THEN the system SHALL remove the old project_setup_checklist table completely
2. WHEN existing projects are migrated THEN the system SHALL create readiness records based on current data
3. WHEN the migration completes THEN the system SHALL remove all old activation routes and components
4. WHEN users access projects after migration THEN the system SHALL show the new readiness system
5. WHEN the new system is active THEN the system SHALL maintain all existing functionality while providing better flexibility

## Non-Functional Requirements

### Performance
- Dashboard calculations must complete within 200ms
- Mode switching must be instantaneous (no loading states)
- Real-time updates must propagate within 1 second

### Usability
- All guidance messages must be actionable with clear next steps
- Navigation buttons must lead directly to relevant sections
- Finalization must be reversible by admins if needed

### Accessibility
- Mode toggle must be keyboard accessible
- All status indicators must have proper ARIA labels
- Color coding must be supplemented with icons and text

### Data Integrity
- Finalization timestamps must be immutable once set
- Readiness calculations must be consistent across all views
- Database triggers must maintain data consistency automatically