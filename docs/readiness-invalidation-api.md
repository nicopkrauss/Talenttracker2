# Readiness Invalidation API

## Overview

The readiness invalidation API endpoint provides a way to trigger readiness recalculation and handle optimistic updates for project readiness data. This endpoint is part of the readiness performance optimization system.

## Endpoint

```
POST /api/projects/[id]/readiness/invalidate
```

## Purpose

This endpoint serves several purposes:

1. **Optimistic Updates**: Allows clients to provide optimistic state that should be applied immediately
2. **Background Sync**: Triggers a background sync with the server to get the latest readiness data
3. **Event Tracking**: Logs invalidation events with reasons for debugging and monitoring
4. **Real-time Coordination**: Helps coordinate readiness updates across multiple users

## Request Format

### Headers
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (optional, uses cookies by default)

### Body

```typescript
interface ReadinessInvalidationRequest {
  reason: 'role_template_change' | 'team_assignment_change' | 'location_change' | 'status_change'
  optimistic_state?: Partial<ProjectReadiness>
}
```

#### Parameters

- **reason** (required): The reason for the invalidation request
  - `role_template_change`: Project role templates were modified
  - `team_assignment_change`: Team assignments were modified
  - `location_change`: Project locations were modified
  - `status_change`: Project status was changed

- **optimistic_state** (optional): Partial readiness state to apply optimistically
  - `status`: Expected readiness status
  - `features`: Expected feature availability flags
  - `blocking_issues`: Expected blocking issues array
  - `available_features`: Expected available features array

### Example Requests

#### Basic Invalidation
```json
{
  "reason": "team_assignment_change"
}
```

#### With Optimistic State
```json
{
  "reason": "role_template_change",
  "optimistic_state": {
    "status": "ready_for_activation",
    "features": {
      "team_management": true,
      "scheduling": true
    },
    "blocking_issues": []
  }
}
```

## Response Format

### Success Response (200)

```typescript
interface ReadinessInvalidationResponse {
  data: {
    readiness: ProjectReadiness
    timestamp: string
    reason: string
    optimistic_state?: Partial<ProjectReadiness>
  }
}
```

#### Example Success Response
```json
{
  "data": {
    "readiness": {
      "status": "ready_for_activation",
      "features": {
        "team_management": true,
        "talent_tracking": false,
        "scheduling": true,
        "time_tracking": false
      },
      "blocking_issues": ["missing_talent_roster"],
      "available_features": ["team_management", "scheduling"],
      "counts": {
        "role_templates": 2,
        "team_assignments": 3,
        "locations": 4,
        "talent": 0
      },
      "calculated_at": "2024-01-01T00:00:00Z"
    },
    "timestamp": "2024-01-01T00:00:00Z",
    "reason": "team_assignment_change",
    "optimistic_state": {
      "status": "ready_for_activation"
    }
  }
}
```

### Error Responses

#### 400 - Validation Error
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "reason": ["Invalid enum value. Expected 'role_template_change' | 'team_assignment_change' | 'location_change' | 'status_change'"]
  }
}
```

#### 401 - Unauthorized
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

#### 404 - Project Not Found
```json
{
  "error": "Project not found",
  "code": "PROJECT_NOT_FOUND"
}
```

#### 404 - Readiness Data Not Found
```json
{
  "error": "Readiness data not found",
  "code": "READINESS_NOT_FOUND"
}
```

#### 500 - Server Error
```json
{
  "error": "Failed to fetch updated readiness",
  "code": "READINESS_FETCH_ERROR"
}
```

## Usage Examples

### JavaScript/TypeScript

```typescript
async function invalidateReadiness(projectId: string, reason: string, optimisticState?: any) {
  try {
    const response = await fetch(`/api/projects/${projectId}/readiness/invalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason,
        optimistic_state: optimisticState
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`${error.error} (${error.code})`)
    }

    const data = await response.json()
    return data.data.readiness
  } catch (error) {
    console.error('Failed to invalidate readiness:', error)
    throw error
  }
}

// Usage
const readiness = await invalidateReadiness('project-123', 'team_assignment_change', {
  status: 'ready_for_activation',
  features: { scheduling: true }
})
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react'

export function useReadinessInvalidation(projectId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalidateReadiness = useCallback(async (
    reason: string, 
    optimisticState?: any
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/readiness/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, optimistic_state: optimisticState })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      const data = await response.json()
      return data.data.readiness
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  return { invalidateReadiness, isLoading, error }
}
```

## Integration with ReadinessProvider

This endpoint is designed to work with the ReadinessProvider context system:

```typescript
// In ReadinessProvider
const invalidateReadiness = useCallback(async (reason: string) => {
  try {
    const response = await fetch(`/api/projects/${projectId}/readiness/invalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    })

    if (response.ok) {
      const data = await response.json()
      setReadiness(data.data.readiness)
    }
  } catch (error) {
    console.error('Failed to invalidate readiness:', error)
  }
}, [projectId])
```

## Performance Considerations

1. **Automatic Triggers**: The materialized view is automatically refreshed by database triggers, so manual invalidation is primarily for optimistic updates
2. **Caching**: The endpoint fetches fresh data from the materialized view for optimal performance
3. **Real-time Updates**: Database triggers notify real-time subscribers about readiness changes
4. **Error Handling**: The endpoint gracefully handles database errors and provides detailed error information

## Security

- Requires authentication (user must be logged in)
- Uses Row Level Security (RLS) to ensure users can only access projects they have permission for
- Validates all input parameters using Zod schemas
- Logs all invalidation requests for audit purposes

## Testing

The endpoint includes comprehensive unit tests covering:
- Successful invalidation with and without optimistic state
- Validation error handling
- Authentication error handling
- Project not found scenarios
- Database error scenarios
- RPC call failures

Run tests with:
```bash
npm test -- app/api/projects/[id]/readiness/invalidate/__tests__/route.test.ts --run
```