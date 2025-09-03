# Location Tracking System Design

## Overview
The location tracking system is designed to track talent locations within specific projects, following the principle that **location is always project-specific**.

## Database Schema

### 1. `project_locations` Table
Stores the defined locations for each project (e.g., House, Holding, Stage).

**Columns:**
- `id` - UUID primary key
- `project_id` - References projects table
- `name` - Location name (e.g., "House", "Stage")
- `description` - Optional description
- `is_default` - Whether this is the default location for new talent
- `display_order` - Order for UI display
- `created_at`, `updated_at` - Timestamps

**Default Locations:**
Every project gets these default locations:
- House (default)
- Holding
- Stage
- Makeup
- Wardrobe

### 2. `talent_location_updates` Table
Historical log of talent location changes within projects.

**Columns:**
- `id` - UUID primary key
- `talent_id` - References talent table
- `project_id` - References projects table
- `location_id` - References project_locations table
- `updated_by` - User who made the update
- `timestamp` - When the update occurred
- `notes` - Optional notes about the location change
- `created_at` - Record creation time

### 3. `talent_current_status` Table
Current location and status of talent for each project.

**Columns:**
- `talent_id` + `project_id` - Composite unique key
- `current_location_id` - Current location (nullable)
- `status` - Enum: 'not_arrived', 'on_location', 'on_break', 'departed'
- `last_updated` - When status was last changed
- `updated_by` - Who made the last update

## Key Design Principles

### 1. Project-Scoped Locations
- Each project defines its own set of locations
- Locations are not shared between projects
- Default locations are created automatically for new projects

### 2. Historical Tracking
- Every location change is logged in `talent_location_updates`
- Current status is maintained separately for performance
- Full audit trail of talent movements

### 3. Role-Based Access
- Users can only see/update locations for projects they're assigned to
- Different roles have different permissions within projects
- RLS policies enforce project-based access control

## Usage Patterns

### For Escorts
- Update location of their assigned talent
- View current location of their talent
- Limited to talent they're assigned to

### For Supervisors/Coordinators
- View all talent locations within their projects
- Update any talent location within their projects
- See location history and who made updates

### For Admins
- Manage project locations (add/edit/remove)
- Full access to all location data
- Can see cross-project location patterns

## Implementation Notes

### Location Updates Workflow
1. User selects talent within a project context
2. System shows current location and available project locations
3. User selects new location
4. System creates record in `talent_location_updates`
5. System updates `talent_current_status`
6. Other users see the updated location in real-time

### Performance Considerations
- Indexes on `(talent_id, project_id)` for fast lookups
- Separate current status table to avoid scanning history
- View `talent_location_view` for common queries

### Data Integrity
- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicate current status records
- Check constraints validate status enum values

## Migration Strategy

1. Run migration `006_create_location_tracking_system.sql`
2. Default locations will be created for existing projects
3. Existing talent will have no current status (not_arrived)
4. Update application code to use new tables
5. Remove old location tracking code

## Future Enhancements

- **Geofencing**: Automatic location updates based on GPS
- **Time-based Rules**: Automatic status changes based on schedule
- **Location Analytics**: Reports on talent movement patterns
- **Integration**: Connect with call sheets and scheduling systems