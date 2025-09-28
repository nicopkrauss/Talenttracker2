# Talent Tracker Database Schema Summary

## Overview
This document provides a comprehensive overview of the Talent Tracker database schema as of the latest Prisma introspection. The database uses PostgreSQL with two schemas: `auth` (Supabase authentication) and `public` (application data).

## Core Application Models

### User Management
- **`profiles`** - Core user profile data with system roles and registration fields
- **`auth_logs`** - Authentication event tracking and audit trail
- **`email_notifications`** - Notification delivery tracking and status

### Project Management
- **`projects`** - Core project data with lifecycle status (prep/active/completed/archived)
- **`project_setup_checklist`** - Setup completion tracking for project activation
- **`project_role_templates`** - Configurable role definitions with pay rates and time types
- **`project_roles`** - Legacy role configuration (being phased out)
- **`project_locations`** - Customizable location statuses per project with colors and sort order

### Team & Role Management
- **`team_assignments`** - Project-specific role assignments with pay overrides
- **`global_settings`** - System-wide configuration settings
- **`system_settings`** - Key-value configuration storage

### Talent Management
- **`talent`** - Enhanced talent profiles with representative information (GLOBAL CONTEXT ONLY)
- **`talent_project_assignments`** - Many-to-many talent-project relationships
- **`talent_status`** - Current location and status tracking per project (PROJECT-SPECIFIC ONLY)
- **`talent_groups`** - Group management with multiple escort assignments
- **`talent_daily_assignments`** - Individual talent daily escort assignments
- **`group_daily_assignments`** - Group daily escort assignments
- **`user_favorites`** - Staff favorites for talent notifications

### Time Tracking & Payroll
- **`shifts`** - Universal shift tracking for all roles with check-in/out times
- **`breaks`** - Separate table for break periods with duration validation
- **`timecard_headers`** - Normalized timecard structure with overall information
- **`timecard_daily_entries`** - Daily entries for individual day details
- **`timecard_audit_log`** - Comprehensive audit trail for timecard changes
- **`notifications`** - Real-time notification system for operational alerts

## Key Enums

### User & Role Enums
- **`user_status`**: pending, active, inactive
- **`system_role`**: admin, in_house, supervisor, coordinator, talent_escort
- **`project_role`**: supervisor, coordinator, talent_escort

### Project & Time Tracking Enums
- **`project_status`**: prep, active, completed, archived
- **`shift_status`**: checked_out, checked_in, on_break
- **`timecard_status`**: draft, submitted, approved, rejected

## Data Separation Patterns

### Talent Data Architecture
**CRITICAL**: Talent location tracking is PROJECT-SPECIFIC and separated from global talent profiles.

**Global Talent Context** (accessed via `/talent/[id]`):
- Personal information (first_name, last_name)
- Representative contact (rep_name, rep_email, rep_phone)
- General notes
- Project assignments list
- NO location tracking, NO current status

**Project-Specific Context** (accessed via `/projects/[id]/talent`):
- All global talent info PLUS
- Current location within the project (`talent_status` table)
- Location tracking and updates
- Project-specific status
- Location history within project

### Time Tracking Architecture
The system uses a normalized timecard structure:
1. **`timecard_headers`** - Overall timecard information, status, and totals
2. **`timecard_daily_entries`** - Individual day details with times and calculations
3. **`timecard_audit_log`** - Complete audit trail of all changes

## Row Level Security (RLS) Implementation

### Multi-Tenant Data Isolation
- Users can only access their own profile data
- Project data filtered by user's role and assignments
- Talent assignments filtered by project access
- Time tracking data restricted to user's own entries

### Role-Based Access Control
- **System Roles** (`profiles.role`): admin, in_house, null (regular users)
- **Project Roles** (`team_assignments.role`): supervisor, coordinator, talent_escort
- **User Status** (`profiles.status`): pending, active, inactive

## Key Relationships & Constraints

### Project Lifecycle
- Projects start in 'prep' status
- Must complete setup checklist before activation
- Cannot delete active projects with time entries
- Talent assignments require active project status

### Time Tracking Integrity
- Check-in must precede break start
- Break end must follow break start
- Checkout must be after check-in
- No overlapping time entries for same user/day
- Unique constraint on `[user_id, project_id, shift_date]`

### Audit & Compliance
- All tables have `created_at`/`updated_at` timestamps
- Comprehensive audit logging for timecard changes
- Change tracking with required notes for admin edits
- Soft deletes where appropriate

## Performance Optimizations

### Key Indexes
- Composite indexes for common query patterns
- User/project/date combinations for time tracking
- Status-based filtering for projects and timecards
- Location and role-based filtering for talent management

### Query Patterns
- Materialized views for complex reporting (future consideration)
- Pagination for large datasets
- Cached reference data (locations, roles)

## Recent Schema Changes

### Latest Additions
- **`timecard_audit_log`** - Added comprehensive audit trail for timecard changes
- **`rejected_fields`** column in `timecard_headers` - Array of field names flagged during rejection
- Enhanced talent group management with multiple escort assignments
- Project role templates with configurable time types and display names

### Migration Notes
- The schema supports both legacy `project_roles` and new `project_role_templates`
- Talent location tracking has been properly separated from global talent profiles
- Timecard structure has been normalized for better data integrity

## Authentication Schema (Supabase)

The `auth` schema contains standard Supabase authentication tables:
- **`users`** - Core authentication data
- **`sessions`** - Session management
- **`identities`** - OAuth provider identities
- **`mfa_factors`** - Multi-factor authentication
- **`refresh_tokens`** - Token management
- Plus various supporting tables for SAML, SSO, and audit logging

## Development Notes

### Prisma Configuration
- Uses PostgreSQL with dual schema support (`auth`, `public`)
- Row Level Security requires additional migration setup
- Check constraints noted but not fully supported by Prisma Client
- Expression indexes require additional setup for migrations

### Database Comments
- Many models and fields have database comments for documentation
- Comments provide context for business logic and constraints
- Useful for understanding field purposes and validation rules

This schema represents a mature, production-ready system with comprehensive audit trails, proper data separation, and robust security patterns.