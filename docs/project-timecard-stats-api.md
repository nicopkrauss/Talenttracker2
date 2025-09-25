# Project Timecard Statistics API

## Overview

The Project Timecard Statistics API (`/api/timecards/projects/stats`) provides aggregated timecard statistics grouped by project. This API is designed to support the project-based timecard navigation feature, allowing users to see timecard summaries for each project they have access to.

## Endpoint

```
GET /api/timecards/projects/stats
```

## Authentication

This endpoint requires authentication. Users must be logged in with an active account status.

## Authorization

- **Admin/In-House Users**: Can see statistics for all projects that have any timecards
- **Regular Users**: Can only see statistics for projects where they have submitted timecards

## Response Format

### Success Response (200 OK)

```json
{
  "data": [
    {
      "projectId": "uuid",
      "projectName": "Project Name",
      "projectDescription": "Optional project description",
      "productionCompany": "Optional production company",
      "totalTimecards": 5,
      "statusBreakdown": {
        "draft": 2,
        "submitted": 1,
        "approved": 2,
        "rejected": 0
      },
      "totalHours": 120.5,
      "totalApprovedPay": 2400.00,
      "lastActivity": "2024-01-15T10:30:00Z",
      "pendingApprovals": 1,
      "overdueSubmissions": 0
    }
  ],
  "count": 1,
  "userRole": "admin"
}
```

### Field Descriptions

- `projectId`: Unique identifier for the project
- `projectName`: Display name of the project
- `projectDescription`: Optional project description
- `productionCompany`: Optional production company name
- `totalTimecards`: Total number of timecards for this project
- `statusBreakdown`: Count of timecards by status
  - `draft`: Timecards in draft status
  - `submitted`: Timecards submitted for approval
  - `approved`: Approved timecards
  - `rejected`: Rejected timecards
- `totalHours`: Sum of all hours across all timecards
- `totalApprovedPay`: Sum of pay from approved timecards only
- `lastActivity`: ISO timestamp of the most recent timecard activity
- `pendingApprovals`: Number of submitted timecards awaiting approval (admin only)
- `overdueSubmissions`: Number of submissions older than 7 days (admin only)

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden
```json
{
  "error": "User profile not found",
  "code": "PROFILE_NOT_FOUND"
}
```

```json
{
  "error": "Account not active",
  "code": "ACCOUNT_NOT_ACTIVE"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch project statistics",
  "code": "FETCH_ERROR",
  "details": "Database error message"
}
```

## Usage Examples

### Admin User Request
```javascript
const response = await fetch('/api/timecards/projects/stats', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
// Returns statistics for all projects with timecards
```

### Regular User Request
```javascript
const response = await fetch('/api/timecards/projects/stats', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
// Returns statistics only for projects where the user has timecards
```

## Data Sorting

Projects are sorted by:
1. Last activity (most recent first)
2. Project name (alphabetical) for projects with no activity

## Business Logic

### Overdue Submissions
Submissions are considered overdue if they have been in "submitted" status for more than 7 days.

### Total Approved Pay
Only includes pay from timecards with "approved" status. Draft, submitted, and rejected timecards are excluded from pay calculations.

### Project Filtering
- Admin users see all projects that have at least one timecard from any user
- Regular users only see projects where they personally have submitted timecards
- Projects with no timecards are excluded from results

## Integration with Project-Based Navigation

This API is designed to work with the TimecardProjectHub component to display project cards with timecard-specific information. The statistics provide the data needed for:

- Project selection interface
- Status indicators
- Pay summaries
- Activity tracking
- Admin approval workflows

## Performance Considerations

- The API aggregates data in real-time from the database
- Results are sorted by activity to prioritize recently active projects
- Large projects with many timecards may take longer to process
- Consider implementing caching for frequently accessed data in production

## Security

- All database queries respect Row Level Security (RLS) policies
- User access is validated on every request
- Project data is filtered based on user permissions
- No sensitive data is exposed to unauthorized users