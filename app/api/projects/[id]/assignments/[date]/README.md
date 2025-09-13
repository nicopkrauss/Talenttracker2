# Daily Assignment API Endpoint

This endpoint manages day-specific escort assignments for talents and groups within a project.

## Endpoints

### GET `/api/projects/{projectId}/assignments/{date}`

Retrieves all assignments for a specific date.

**Response:**
```json
{
  "data": {
    "date": "2024-06-15",
    "assignments": [
      {
        "talentId": "talent-uuid",
        "talentName": "John Doe",
        "isGroup": false,
        "escortId": "escort-uuid",
        "escortName": "Jane Smith",
        "displayOrder": 1
      },
      {
        "talentId": "group-uuid", 
        "talentName": "Group A",
        "isGroup": true,
        "escortId": "escort-uuid-1",
        "escortName": "Escort One",
        "escortAssignments": [
          {
            "escortId": "escort-uuid-1",
            "escortName": "Escort One"
          },
          {
            "escortId": "escort-uuid-2", 
            "escortName": "Escort Two"
          }
        ],
        "displayOrder": 2
      }
    ]
  }
}
```

### POST `/api/projects/{projectId}/assignments/{date}`

Creates or updates assignments for a specific date. This endpoint replaces all existing assignments for the given date.

**Request Body:**
```json
{
  "talents": [
    {
      "talentId": "talent-uuid",
      "escortIds": ["escort-uuid-1", "escort-uuid-2"]
    }
  ],
  "groups": [
    {
      "groupId": "group-uuid",
      "escortIds": ["escort-uuid-3", "escort-uuid-4"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-06-15",
    "assignmentsCreated": {
      "talents": 2,
      "groups": 2,
      "total": 4
    }
  }
}
```

## Validation Rules

### Date Validation
- Date must be in YYYY-MM-DD format
- Date must fall within the project's start and end dates
- Past dates are allowed (for historical data management)

### Talent Validation
- All talent IDs must be valid UUIDs
- All talents must be assigned to the project
- Talents can have multiple escorts assigned for the same date

### Group Validation
- All group IDs must be valid UUIDs
- All groups must belong to the project
- Groups can have multiple escorts assigned for the same date

### Escort Validation
- All escort IDs must be valid UUIDs
- All escorts must be assigned to the project as team members
- Escorts can be assigned to multiple talents/groups on the same date

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "talents": ["Invalid talent ID format"]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

### 404 Not Found
```json
{
  "error": "Project not found",
  "code": "PROJECT_NOT_FOUND"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "details": "Specific error message"
}
```

## Database Operations

The POST endpoint performs the following operations:

1. **Validation**: Validates request format, project access, and entity relationships
2. **Clear Existing**: Removes all existing assignments for the specified date
3. **Insert New**: Creates new assignment records in `talent_daily_assignments` and `group_daily_assignments` tables
4. **Trigger Updates**: Database triggers automatically update `scheduled_dates` arrays in parent tables

## Usage Examples

### Assign Single Escort to Talent
```javascript
const response = await fetch('/api/projects/project-123/assignments/2024-06-15', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    talents: [
      {
        talentId: 'talent-456',
        escortIds: ['escort-789']
      }
    ],
    groups: []
  })
})
```

### Assign Multiple Escorts to Group
```javascript
const response = await fetch('/api/projects/project-123/assignments/2024-06-15', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    talents: [],
    groups: [
      {
        groupId: 'group-456',
        escortIds: ['escort-789', 'escort-012']
      }
    ]
  })
})
```

### Clear All Assignments for Date
```javascript
const response = await fetch('/api/projects/project-123/assignments/2024-06-15', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    talents: [],
    groups: []
  })
})
```