# Phase Configuration Management System

This document describes the phase configuration management system that allows administrators to configure automatic phase transitions and lifecycle settings for projects.

## Overview

The phase configuration system provides:
- **Default Configuration Values**: System-wide defaults for new projects
- **Project-Level Overrides**: Project-specific configuration settings
- **Validation**: Comprehensive validation of configuration values
- **Audit Logging**: Complete audit trail of configuration changes
- **Fallback Logic**: Graceful handling of missing configuration

## Components

### 1. PhaseConfigurationService

The core service class that manages phase configuration operations.

```typescript
import { PhaseConfigurationService } from '@/lib/services/phase-configuration-service'

const service = new PhaseConfigurationService()

// Get configuration for a project
const config = await service.getConfiguration('project-id')

// Update configuration
await service.updateConfiguration('project-id', {
  autoTransitionsEnabled: false,
  archiveMonth: 6,
  archiveDay: 15
}, 'user-id')
```

#### Key Methods

- `getConfiguration(projectId)`: Retrieves complete configuration with fallbacks
- `updateConfiguration(projectId, updates, userId)`: Updates configuration with validation
- `isAutoTransitionsEnabled(projectId)`: Checks if auto transitions are enabled
- `getNextTransitionTime(projectId)`: Calculates next scheduled transition
- `applyDefaultsToProject(projectId, userId)`: Applies defaults to new projects

### 2. API Endpoints

#### GET `/api/projects/[id]/phase/configuration`
Retrieves phase configuration for a project.

**Response:**
```json
{
  "data": {
    "currentPhase": "prep",
    "phaseUpdatedAt": "2024-03-01T10:00:00Z",
    "autoTransitionsEnabled": true,
    "timezone": "America/New_York",
    "rehearsalStartDate": "2024-03-15",
    "showEndDate": "2024-03-20",
    "archiveMonth": 4,
    "archiveDay": 1,
    "postShowTransitionHour": 6
  }
}
```

#### PUT `/api/projects/[id]/phase/configuration`
Updates phase configuration (admin only).

**Request Body:**
```json
{
  "autoTransitionsEnabled": false,
  "timezone": "America/Los_Angeles",
  "rehearsalStartDate": "2024-04-01",
  "showEndDate": "2024-04-10",
  "archiveMonth": 6,
  "archiveDay": 15,
  "postShowTransitionHour": 8
}
```

### 3. PhaseConfigurationPanel Component

React component for the admin interface.

```tsx
import { PhaseConfigurationPanel } from '@/components/projects/phase-configuration-panel'

<PhaseConfigurationPanel 
  projectId="project-id"
  initialConfiguration={config}
  onConfigurationChange={(newConfig) => {
    // Handle configuration change
  }}
/>
```

## Configuration Schema

### Project-Level Settings
Stored in the `projects` table:
- `auto_transitions_enabled`: Boolean flag for automatic transitions
- `timezone`: IANA timezone identifier (e.g., "America/New_York")
- `rehearsal_start_date`: Date when rehearsals begin
- `show_end_date`: Date when the show ends

### Settings-Level Configuration
Stored in the `project_settings` table:
- `auto_transitions_enabled`: Default for new projects
- `archive_month`: Month (1-12) for automatic archiving
- `archive_day`: Day of month (1-31) for automatic archiving
- `post_show_transition_hour`: Hour (0-23) for post-show transition

## Default Values

The system provides sensible defaults:

```typescript
{
  autoTransitionsEnabled: true,
  archiveMonth: 4,        // April
  archiveDay: 1,          // 1st
  postShowTransitionHour: 6  // 6:00 AM
}
```

## Validation Rules

### Archive Date Validation
- Month must be 1-12
- Day must be 1-31
- Date combination must be valid (e.g., no February 31st)

### Timezone Validation
- Must be a valid IANA timezone identifier
- Validated using `Intl.DateTimeFormat`

### Date String Validation
- Rehearsal and show dates must be valid ISO date strings
- Validated using JavaScript `Date` constructor

### Numeric Range Validation
- Archive month: 1-12
- Archive day: 1-31
- Post-show transition hour: 0-23

## Fallback Logic

The system uses a hierarchical fallback approach:

1. **Project-specific settings** (highest priority)
2. **Project settings table** (medium priority)
3. **System defaults** (lowest priority)

Example for `autoTransitionsEnabled`:
```typescript
const enabled = project.auto_transitions_enabled ?? 
                settings?.auto_transitions_enabled ?? 
                defaults.autoTransitionsEnabled
```

## Audit Logging

All configuration changes are logged to `project_audit_log`:

```json
{
  "project_id": "project-id",
  "user_id": "user-id",
  "action": "phase_configuration_updated",
  "details": {
    "projectUpdates": { "timezone": "America/Los_Angeles" },
    "settingsUpdates": { "archive_month": 6 },
    "updatedBy": "user-id",
    "timestamp": "2024-03-01T10:00:00Z"
  }
}
```

## Integration with Settings Tab

The phase configuration panel is integrated into the project settings tab:

```tsx
// In components/projects/tabs/settings-tab.tsx
<div id="phase-config">
  <PhaseConfigurationPanel 
    projectId={project.id}
    onConfigurationChange={() => {
      // Reload audit log to show configuration changes
      loadAuditLog()
    }}
  />
</div>
```

## Error Handling

### API Errors
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User lacks admin permissions
- **404 Not Found**: Project doesn't exist
- **400 Bad Request**: Validation errors with detailed messages

### Service Errors
- Configuration validation errors with specific messages
- Database operation failures with rollback
- Timezone conversion errors with UTC fallback

### UI Error Handling
- Toast notifications for user feedback
- Form validation with inline error messages
- Graceful degradation for network failures

## Usage Examples

### Basic Configuration Update
```typescript
const service = new PhaseConfigurationService()

await service.updateConfiguration('project-1', {
  autoTransitionsEnabled: false,
  timezone: 'America/Los_Angeles'
}, 'admin-user-id')
```

### Checking Auto Transitions
```typescript
const isEnabled = await service.isAutoTransitionsEnabled('project-1')
if (isEnabled) {
  const nextTransition = await service.getNextTransitionTime('project-1')
  console.log('Next transition at:', nextTransition)
}
```

### Applying Defaults to New Project
```typescript
// Called when creating a new project
await service.applyDefaultsToProject('new-project-id', 'creator-user-id')
```

## Testing

The system includes comprehensive tests:

- **API Route Tests**: `/app/api/projects/[id]/phase/configuration/__tests__/route.test.ts`
- **Service Tests**: `/lib/services/__tests__/phase-configuration-service.test.ts`
- **Component Tests**: `/components/projects/__tests__/phase-configuration-panel.test.tsx`

Run tests with:
```bash
npm test -- --run lib/services/__tests__/phase-configuration-service.test.ts
npm test -- --run app/api/projects/[id]/phase/configuration/__tests__/route.test.ts
npm test -- --run components/projects/__tests__/phase-configuration-panel.test.tsx
```

## Security Considerations

- **Admin-Only Updates**: Only admin and in_house users can modify configuration
- **Input Validation**: All inputs are validated before database operations
- **Audit Trail**: Complete logging of all configuration changes
- **Error Handling**: Sensitive information is not exposed in error messages

## Performance Considerations

- **Caching**: Configuration is cached at the component level
- **Lazy Loading**: Configuration is only fetched when needed
- **Batch Operations**: Multiple configuration updates are batched
- **Indexes**: Database indexes on frequently queried columns