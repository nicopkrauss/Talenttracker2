# Requirements Document

## Introduction

The navigation system provides role-based navigation that adapts between mobile and desktop interfaces. The system must display different navigation options based on user project roles (Admin, In-House, Supervisor, Talent Logistics Coordinator, Talent Escort) and provide an optimal user experience across device types.

## Requirements

### Requirement 1

**User Story:** As a user with different project roles, I want to see navigation options appropriate to my permissions, so that I can access only the features I'm authorized to use.

#### Acceptance Criteria

1. WHEN a user has Admin or In-House role THEN the system SHALL display Projects, Team, Talent, Timecards, and Profile navigation options
2. WHEN a user has Supervisor or Talent Logistics Coordinator role THEN the system SHALL display Team, Talent, Timecards, and Profile navigation options
3. WHEN a user has Talent Escort role THEN the system SHALL display Talent, Timecards, and Profile navigation options
4. WHEN a user's project role changes THEN the system SHALL update the navigation options immediately

### Requirement 2

**User Story:** As a mobile user, I want navigation displayed as a bottom dock, so that I can easily access main features with my thumb while holding the device.

#### Acceptance Criteria

1. WHEN the user accesses the app on mobile THEN the system SHALL display navigation as a bottom dock
2. WHEN displaying mobile navigation THEN the system SHALL use SF Symbols icons: folder.fill for Projects, person.3.fill for Team, star.fill for Talent, list.bullet.clipboard.fill for Timecards, person.crop.circle.fill for Profile
3. WHEN the user taps a navigation item THEN the system SHALL highlight the active tab and navigate to the corresponding page
4. WHEN the bottom dock is displayed THEN the system SHALL ensure it remains fixed at the bottom of the viewport

### Requirement 3

**User Story:** As a desktop user, I want navigation displayed as a top navigation bar, so that I can efficiently navigate between sections using familiar desktop patterns.

#### Acceptance Criteria

1. WHEN the user accesses the app on desktop THEN the system SHALL display navigation as a top horizontal bar
2. WHEN displaying desktop navigation THEN the system SHALL show text labels for Projects, Team, Talent, and Timecards based on user role
3. WHEN displaying desktop navigation THEN the system SHALL show a user menu on the far right with the user's name/profile picture
4. WHEN the user clicks the user menu THEN the system SHALL display a dropdown with Profile and Settings options

### Requirement 4

**User Story:** As a user switching between devices, I want the navigation to automatically adapt to the device type, so that I get the optimal experience regardless of how I access the app.

#### Acceptance Criteria

1. WHEN the viewport width is less than 768px THEN the system SHALL display mobile navigation
2. WHEN the viewport width is 768px or greater THEN the system SHALL display desktop navigation
3. WHEN the user resizes their browser window THEN the system SHALL switch navigation layouts at the breakpoint
4. WHEN switching between navigation layouts THEN the system SHALL maintain the current active page

### Requirement 5

**User Story:** As a user, I want visual feedback when navigating, so that I can clearly see which section I'm currently viewing.

#### Acceptance Criteria

1. WHEN a navigation item is active THEN the system SHALL provide clear visual indication of the active state
2. WHEN hovering over navigation items on desktop THEN the system SHALL provide hover state feedback
3. WHEN tapping navigation items on mobile THEN the system SHALL provide touch feedback
4. WHEN navigation state changes THEN the system SHALL update the active indicator smoothly