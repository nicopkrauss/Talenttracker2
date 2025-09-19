# Default Role Templates Implementation

## Overview

This document describes the implementation of automatic default role template creation when new projects are created in the Talent Tracker application.

## Problem Statement

Previously, when a project was created, no role templates were automatically generated. This meant that project managers had to manually create role templates for each project, which was time-consuming and could lead to inconsistencies.

## Solution

### Automatic Role Template Creation

When a new project is created through the API (`POST /api/projects`), the system now automatically creates three default role templates:

1. **Supervisor**
   - Pay Rate: $300.00 daily
   - Description: "On-site management with day rate tracking"
   - Sort Order: 1
   - Default: Yes

2. **Coordinator**
   - Pay Rate: $350.00 daily
   - Description: "Informational oversight role with day rate tracking"
   - Sort Order: 2
   - Default: Yes

3. **Talent Escort**
   - Pay Rate: $25.00 hourly
   - Description: "On-the-ground operations with hourly tracking"
   - Sort Order: 3
   - Default: Yes

### Implementation Details

#### API Changes

The project creation API (`app/api/projects/route.ts`) was modified to include role template creation logic:

```typescript
// After successful project creation
const defaultRoleTemplates = [
  {
    project_id: newProject.id,
    role: 'supervisor',
    display_name: 'Supervisor',
    base_pay_rate: 300.00,
    time_type: 'daily',
    sort_order: 1,
    is_default: true,
    description: 'On-site management with day rate tracking'
  },
  // ... other templates
]

const { error: templatesError } = await supabase
  .from('project_role_templates')
  .insert(defaultRoleTemplates)
```

#### Database Schema

The `project_role_templates` table includes:
- `is_default` column to mark default templates
- Unique constraint ensuring only one default per role per project
- Proper indexing for performance

#### Error Handling

- Role template creation errors don't fail the project creation
- Errors are logged for debugging
- The system gracefully handles missing templates

## Files Modified

### Core Implementation
- `app/api/projects/route.ts` - Added default role template creation logic

### Database Migration
- `migrations/033_update_default_role_templates_trigger.sql` - Database trigger and schema updates

### Testing & Verification Scripts
- `scripts/setup-role-templates-trigger.js` - Creates missing templates for existing projects
- `scripts/test-project-api-with-templates.js` - Tests the API functionality
- `scripts/verify-project-role-templates.js` - Verifies all projects have complete templates

## Benefits

1. **Consistency**: All new projects start with the same standard role templates
2. **Efficiency**: Project managers don't need to manually create basic role templates
3. **Standardization**: Consistent pay rates and descriptions across projects
4. **Flexibility**: Templates can still be customized after creation

## Usage

### For New Projects
When creating a project through the API or UI, default role templates are automatically created. No additional action is required.

### For Existing Projects
Run the setup script to add missing role templates to existing projects:

```bash
node scripts/setup-role-templates-trigger.js
```

### Verification
Check that all projects have complete role templates:

```bash
node scripts/verify-project-role-templates.js
```

## Customization

### Modifying Default Templates
To change the default role templates, update the `defaultRoleTemplates` array in `app/api/projects/route.ts`:

```typescript
const defaultRoleTemplates = [
  {
    project_id: newProject.id,
    role: 'supervisor',
    display_name: 'Custom Supervisor Title',
    base_pay_rate: 350.00, // Updated rate
    time_type: 'daily',
    sort_order: 1,
    is_default: true,
    description: 'Custom description'
  },
  // ... other templates
]
```

### Adding New Default Roles
To add additional default roles:

1. Ensure the role exists in the `project_role` enum
2. Add the new template to the `defaultRoleTemplates` array
3. Update the verification scripts to include the new role

## Testing

### Automated Tests
- `scripts/test-project-api-with-templates.js` - Comprehensive API testing
- Unit tests verify role template creation logic

### Manual Testing
1. Create a new project through the UI
2. Navigate to the project's Roles & Team tab
3. Verify that three default role templates are present
4. Confirm pay rates and descriptions match expectations

## Troubleshooting

### Missing Role Templates
If role templates are not being created:

1. Check the API logs for errors during project creation
2. Verify the `project_role_templates` table exists and is accessible
3. Run the setup script to create missing templates manually

### Incorrect Pay Rates
If default pay rates are incorrect:

1. Update the rates in the API code
2. For existing projects, manually update templates through the UI or database

### Database Issues
If there are database-related problems:

1. Check that the `is_default` column exists
2. Verify the unique constraint on default templates
3. Run the migration script to fix schema issues

## Future Enhancements

1. **Configurable Defaults**: Allow admins to configure default pay rates through the UI
2. **Template Inheritance**: Copy role templates from similar projects
3. **Bulk Updates**: Update multiple projects' role templates simultaneously
4. **Audit Trail**: Track changes to role templates over time

## Conclusion

The automatic default role template creation feature significantly improves the project setup experience by providing consistent, ready-to-use role templates for all new projects while maintaining the flexibility to customize them as needed.