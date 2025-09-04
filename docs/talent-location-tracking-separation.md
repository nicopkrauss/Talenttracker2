# Talent Location Tracking - Separation of Concerns

## Overview

This document clarifies the separation between global talent management and project-specific location tracking in the Talent Tracker application.

## Key Principles

### Global Talent Database
The global talent database (`talent` table) contains:
- **Personal Information**: first_name, last_name
- **Representative Information**: rep_name, rep_email, rep_phone
- **General Notes**: notes field for general talent information
- **Project Assignments**: Many-to-many relationships via `talent_project_assignments`

### Project-Specific Location Tracking
Location tracking is handled separately through project-specific tables:
- **`talent_status`**: Current location and status per talent per project
- **`project_locations`**: Available locations defined per project
- **`talent_location_updates`**: Historical log of location changes per project

## What Goes Where

### ✅ Global Talent Profiles Should Include:
- Basic talent information (name, representative contact)
- List of project assignments
- General notes about the talent
- Representative contact information with clickable links

### ❌ Global Talent Profiles Should NOT Include:
- Current location information
- Location tracking UI
- Project-specific status indicators
- Location history

### ✅ Project-Specific Views Should Include:
- Current talent location within the project
- Location tracking and update functionality
- Project-specific status (on_location, not_arrived, etc.)
- Quick location change actions
- Location history within the project context

## Implementation Guidelines

### Components
- **TalentLocationTracker**: Only for use in project-specific contexts
- **TalentProfileForm**: Global talent information only
- **TalentProjectManager**: Project assignment management only

### API Endpoints
- **`/api/talent/*`**: Global talent CRUD operations
- **`/api/projects/[id]/talent-location-update`**: Project-specific location updates
- **`/api/projects/[id]/talent-status`**: Project-specific status queries

### Database Design
- **Global tables**: `talent`, `talent_project_assignments`
- **Project-specific tables**: `talent_status`, `project_locations`, `talent_location_updates`

## Benefits of This Separation

1. **Scalability**: Location data doesn't bloat the global talent database
2. **Project Isolation**: Each project can define its own locations and tracking rules
3. **Performance**: Global talent queries are faster without location data
4. **Flexibility**: Different projects can have different location tracking needs
5. **Data Integrity**: Location data is always tied to a specific project context

## Migration Notes

The `contact_info` field has been removed from the global talent table as it was redundant with the representative information. Location tracking functionality has been clarified to be project-specific only.

## Future Considerations

When implementing project-specific talent views, use the existing location tracking infrastructure:
- Operations dashboards already implement this correctly
- Project talent roster views should follow the same pattern
- Individual project talent detail pages can include location tracking