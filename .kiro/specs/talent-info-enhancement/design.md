# Design Document

## Overview

This design enhances the existing talent management system to support expanded talent information fields, flexible project assignments, and improved data management. The enhancement builds upon the current Supabase-based architecture while maintaining compatibility with existing components and workflows.

## Architecture

### Separation of Concerns: Global vs Project-Specific Data

**Critical Design Decision**: Talent location tracking is PROJECT-SPECIFIC and must be separated from global talent management.

#### Global Talent Context
- **Scope**: Cross-project talent information
- **Tables**: `talent`, `talent_project_assignments`
- **UI Context**: `/talent/[id]` pages, global talent lists
- **Data**: Personal info, representative contact, project assignments, general notes
- **NO**: Location tracking, current status, project-specific data

#### Project-Specific Context  
- **Scope**: Talent management within a specific project
- **Tables**: `talent_status`, `project_locations`, `talent_location_updates`
- **UI Context**: `/projects/[id]/talent` pages, operations dashboards
- **Data**: Current location, status, location history, project-specific actions
- **Includes**: All global talent data PLUS project-specific location data

### Database Schema Changes

The current `TalentProfile` interface will be extended to support the new requirements:

```typescript
export interface TalentProfile {
  id: string
  // Enhanced personal information
  first_name: string
  last_name: string
  
  // New representative information
  rep_name: string
  rep_email: string
  rep_phone: string
  
  // Enhanced notes field
  notes?: string
  
  // Simplified contact info (emergency contact removed)
  contact_info: {
    phone?: string
    email?: string
  }
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Project relationships (many-to-many)
  talent_assignments?: Array<TalentProjectAssignment>
}

export interface TalentProjectAssignment {
  id: string
  talent_id: string
  project_id: string
  assigned_at: string
  assigned_by: string
  status: 'active' | 'inactive' | 'completed'
  escort_id?: string
  created_at: string
  updated_at: string
}
```

### Database Tables

1. **talent** (modified)
   - Remove `project_id` foreign key constraint
   - Add `rep_name`, `rep_email`, `rep_phone` columns
   - Enhance `notes` field

2. **talent_project_assignments** (new)
   - Manages many-to-many relationship between talent and projects
   - Tracks assignment history and status
   - Supports multiple active assignments per talent

## Components and Interfaces

### Enhanced Talent Profile Form

The existing `TalentProfileForm` component will be updated to include:

- Representative information fields with validation
- Enhanced notes section
- Project assignment management interface
- Multi-project selection capability

### New Components

1. **TalentProjectManager**
   - Handles assignment/unassignment of talent to projects
   - Displays current project assignments
   - Provides interface for moving talent between projects

2. **TalentDatabase**
   - Global talent view independent of project context
   - Search and filter capabilities for all talent
   - Bulk operations for project assignments

3. **ProjectTalentRoster**
   - Project-specific talent view
   - Integration with existing assignment workflows
   - Enhanced with representative contact information

### Updated Components

1. **TalentProfileForm**
   - Add representative information fields
   - Enhanced validation for email and phone formats
   - Improved notes section with better UX

2. **TalentLocationTracker**
   - **IMPORTANT**: This component is for PROJECT-SPECIFIC use only
   - Should NOT be used in global talent profile pages
   - Only for use in project-specific talent management contexts
   - Uses project-specific tables (talent_status, project_locations)

## Data Models

### Validation Rules

```typescript
const talentValidationSchema = {
  first_name: {
    required: true,
    minLength: 1,
    maxLength: 50
  },
  last_name: {
    required: true,
    minLength: 1,
    maxLength: 50
  },
  rep_name: {
    required: true,
    minLength: 1,
    maxLength: 100
  },
  rep_email: {
    required: true,
    format: 'email'
  },
  rep_phone: {
    required: true,
    format: 'phone' // E.164 or US phone number format
  },
  notes: {
    required: false,
    maxLength: 1000
  }
}
```

### Data Migration Strategy

1. **Phase 1**: Add new columns to existing `talent` table ✅ **COMPLETED**
2. **Phase 2**: Create `talent_project_assignments` table ✅ **COMPLETED**
3. **Phase 3**: Migrate existing project assignments to new table ✅ **COMPLETED**
4. **Phase 4**: Remove `project_id` constraint from `talent` table ✅ **COMPLETED**

## Error Handling

### Validation Errors
- Client-side validation using Zod schemas
- Real-time field validation with user-friendly messages
- Server-side validation as backup

### Database Constraints
- Unique constraints on talent email within system
- Foreign key constraints for project assignments
- Cascade delete handling for project removal

### User Experience
- Progressive enhancement for form validation
- Optimistic updates with rollback on failure
- Clear error messaging for all failure scenarios

## Testing Strategy

### Unit Tests
- Validation schema testing
- Component rendering with various data states
- Form submission and error handling

### Integration Tests
- Database operations for talent CRUD
- Project assignment workflows
- Data migration scripts

### End-to-End Tests
- Complete talent creation workflow
- Multi-project assignment scenarios
- Talent movement between projects
- Representative contact information display

### Performance Tests
- Large talent database queries
- Bulk assignment operations
- Search and filter performance

## Security Considerations

### Data Privacy
- Representative contact information access controls
- Audit logging for talent data changes
- GDPR compliance for talent data deletion

### Access Control
- Role-based access to representative information
- Project-specific talent visibility controls
- Admin-only access to bulk operations

### Data Validation
- Server-side validation for all inputs
- SQL injection prevention
- XSS protection for notes fields

## Migration Plan

### Database Migration ✅ **COMPLETED**

The database migration has been successfully completed with the following changes:

```sql
-- ✅ Added new columns to talent table
ALTER TABLE talent 
ADD COLUMN rep_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN rep_email VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN rep_phone VARCHAR(20) NOT NULL DEFAULT '';

-- ✅ Created talent_project_assignments table
CREATE TABLE talent_project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id UUID REFERENCES talent(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'active',
  escort_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(talent_id, project_id, status)
);

-- ✅ Migrated existing project assignments to new table
-- ✅ Updated RLS policies to work with new many-to-many structure
-- ✅ Removed project_id column from talent table
-- ✅ Dropped old talent_assignments table
-- ✅ Added validation constraints for email and phone formats
```

### Component Updates
1. Update existing forms to include new fields
2. Create new project assignment components
3. Update existing talent views to show multi-project data
4. Implement search and filter enhancements

### Data Backfill
- Migrate existing project assignments to new table
- Set default values for new required fields
- Update existing components to use new data structure