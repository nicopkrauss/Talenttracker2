# Global Settings Implementation

## Overview

This document describes the implementation of the global settings page for the Talent Tracker application. The global settings page allows administrators to configure system-wide settings that affect the entire application.

## Features Implemented

### 1. Global Settings Page (`/settings`)
- **Location**: `app/(app)/settings/page.tsx`
- **Access**: Admin users only
- **Navigation**: Added to navigation config with Settings icon

### 2. Settings Categories

#### Timecard & Break Settings
- **Default Escort Break Duration**: 15, 30, 45, or 60 minutes
- **Default Staff Break Duration**: 30, 45, 60, or 90 minutes
- **Timecard Reminder Frequency**: Daily, every 2 days, every 3 days, or weekly
- **Submission Opens on Show Day**: Toggle for when timecard submission becomes available
- **Maximum Hours Before Auto-Stop**: Configurable limit (12-24 hours)
- **Overtime Warning Hours**: When to show overtime warnings (8-16 hours)

#### System Settings
- **Archive Date**: Month and day when projects are automatically archived
- **Post-Show Transition Time**: Time when projects transition from show mode to post-show mode

#### Role Permissions (Placeholder)
- Placeholder section for future implementation of role-based permission configuration
- Will allow administrators to define what actions each role can perform

### 3. API Endpoints

#### GET `/api/settings/global`
- Retrieves current global settings and role permissions
- Returns default values if no settings are configured
- Admin access required

#### PUT `/api/settings/global`
- Updates global settings and role permissions
- Validates request structure and data types
- Admin access required

### 4. Data Storage

Settings are stored in a dedicated `global_settings` table with individual columns for each setting:

#### Table Structure
- **Break Settings**: `default_escort_break_minutes`, `default_staff_break_minutes`
- **Notification Settings**: `timecard_reminder_frequency_days`, `submission_opens_on_show_day`
- **Shift Limits**: `max_hours_before_stop`, `overtime_warning_hours`
- **System Settings**: `archive_date_month`, `archive_date_day`, `post_show_transition_time`
- **Role Permissions**: Individual boolean columns for each role's permissions
- **Audit Fields**: `created_at`, `updated_at`, `updated_by`

#### Benefits of Column-Based Storage
- **Type Safety**: Database enforces data types and constraints
- **Better Querying**: Can query/filter on individual settings
- **Indexing**: Can create indexes on specific columns for performance
- **Validation**: Database constraints ensure valid values
- **Schema Clarity**: Self-documenting structure

### 5. Navigation Integration

- Added "Settings" navigation item for admin users only
- Updated navigation configuration and tests
- Settings icon from Lucide React

## Default Values

### Break Durations
- Escort: 30 minutes
- Staff: 60 minutes

### Timecard Notifications
- Reminder frequency: Daily (1 day)
- Submission opens on show day: Yes

### Shift Limits
- Maximum hours before auto-stop: 20 hours
- Overtime warning: 12 hours

### System Settings
- Archive date: December 31st
- Post-show transition time: 06:00

### Role Permissions
- In-House: Can approve timecards, initiate checkout, manage projects
- Supervisor: Cannot approve timecards, can initiate checkout
- Coordinator: Cannot approve timecards, cannot initiate checkout

## Testing

### Unit Tests
- **API Tests**: `app/api/settings/global/__tests__/route.test.ts`
  - Authentication and authorization
  - Default settings retrieval
  - Settings update validation
  
- **Page Tests**: `app/(app)/settings/__tests__/page.test.tsx`
  - Page rendering and loading states
  - Settings display and form interaction
  - Error handling
  
- **Navigation Tests**: Updated `lib/__tests__/navigation-config.test.ts`
  - Settings navigation item for admin users
  - Icon type validation

## Security

- **Admin Only Access**: All endpoints and UI restricted to admin users
- **Authentication Required**: Server-side user validation
- **Input Validation**: Request body validation for settings updates
- **Database Security**: Uses existing RLS policies and authentication

## Future Enhancements

1. **Role Permissions UI**: Complete implementation of the role permissions section
2. **Notification Settings**: Expand notification configuration options
3. **Audit Trail**: Track changes to global settings
4. **Import/Export**: Allow backup and restore of settings
5. **Validation Rules**: More sophisticated validation for setting combinations

## Files Created/Modified

### New Files
- `app/(app)/settings/page.tsx` - Main settings page component
- `app/api/settings/global/route.ts` - API endpoints for settings
- `app/api/settings/global/__tests__/route.test.ts` - API tests
- `app/(app)/settings/__tests__/page.test.tsx` - Page tests
- `migrations/031_create_global_settings_table.sql` - Database migration
- `scripts/run-global-settings-migration.js` - Migration runner script
- `scripts/test-global-settings-api.js` - API testing script
- `docs/global-settings-implementation.md` - This documentation

### Modified Files
- `lib/navigation-config.ts` - Added settings navigation item
- `lib/__tests__/navigation-config.test.ts` - Updated tests for new navigation item
- `prisma/schema.prisma` - Added global_settings table model

## Usage

1. **Access**: Admin users can access global settings via the navigation menu
2. **Configuration**: Modify settings using the form controls
3. **Save**: Click "Save All Settings" to persist changes
4. **Validation**: Form validates input before submission
5. **Feedback**: Toast notifications confirm successful saves or show errors

The global settings page provides a centralized location for administrators to configure system-wide behavior, ensuring consistent application behavior across all projects and users.