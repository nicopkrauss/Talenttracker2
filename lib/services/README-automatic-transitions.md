# Automatic Transition System

This document describes the automatic transition evaluation system for project lifecycle management.

## Overview

The automatic transition system provides real-time phase evaluation and automatic transitions for projects based on dates, completion criteria, and timezone-aware calculations. It includes monitoring, alerting, and background job capabilities.

## Requirements Coverage

- **1.3**: Automatic transition to active mode at rehearsal start (midnight local)
- **1.4**: Automatic transition to post-show mode after show end (6AM local next day)
- **1.5**: Automatic transition to complete mode when timecards are approved
- **1.6**: Automatic transition to archived mode on archive date
- **5.3**: Timezone-aware transition calculations
- **5.4**: Accurate timezone handling across year boundaries

## Core Components

### AutomaticTransitionEvaluator

Main service that handles project evaluation and transition execution.

```typescript
import { AutomaticTransitionEvaluator } from '@/lib/services/automatic-transition-evaluator'

const evaluator = new AutomaticTransitionEvaluator({
  enabledPhases: [ProjectPhase.PRE_SHOW, ProjectPhase.ACTIVE],
  dryRun: false,
  alertOnFailure: true
})

// Evaluate all projects
const result = await evaluator.evaluateAllProjects()

// Evaluate specific project
const evaluation = await evaluator.evaluateProject('project-id')

// Get scheduled transitions
const scheduled = await evaluator.getScheduledTransitions(24) // next 24 hours
```

### TransitionScheduler

Background job service for periodic evaluation.

```typescript
import { TransitionScheduler, getTransitionScheduler } from '@/lib/services/transition-scheduler'

// Start periodic evaluation
const scheduler = getTransitionScheduler({
  intervalMinutes: 15,
  enabledEnvironments: ['production']
})
scheduler.start()

// Run one-time evaluation
import { runScheduledEvaluation } from '@/lib/services/transition-scheduler'
const result = await runScheduledEvaluation()
```

### TransitionMonitoring

Monitoring and alerting service.

```typescript
import { TransitionMonitoring, getTransitionMonitoring } from '@/lib/services/transition-monitoring'

const monitoring = getTransitionMonitoring()

// Get metrics
const metrics = await monitoring.getTransitionMetrics(startDate, endDate)

// Perform health check
const health = await monitoring.performHealthCheck()

// Create alert
await monitoring.createAlert({
  type: 'failure',
  severity: 'high',
  title: 'Transition Failed',
  message: 'Project transition failed due to validation error'
})
```

## Transition Types

### Time-Based Transitions

These transitions occur automatically at specific times:

1. **Pre-Show → Active**: Midnight on rehearsal start date (project timezone)
2. **Active → Post-Show**: 6AM (configurable) day after show end (project timezone)
3. **Complete → Archived**: Archive date (default April 1st) for previous year projects

### Criteria-Based Transitions

These transitions occur when completion criteria are met:

1. **Prep → Staffing**: Vital project information complete
2. **Staffing → Pre-Show**: Team assignments and talent roster complete
3. **Post-Show → Complete**: All timecards approved and paid

## API Endpoints

### Evaluate All Projects

```http
POST /api/projects/transitions/evaluate
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "dryRun": false,
  "enabledPhases": ["pre_show", "active"]
}
```

### Evaluate Single Project

```http
GET /api/projects/{id}/transitions/evaluate
Authorization: Bearer <user-token>

POST /api/projects/{id}/transitions/evaluate
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "executeTransition": true,
  "dryRun": false
}
```

### Cron Job Endpoint

```http
POST /api/cron/transitions
Authorization: Bearer <cron-secret>
```

## Configuration

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional - for cron jobs
CRON_SECRET=your-cron-secret
VERCEL_CRON_SECRET=vercel-cron-secret
```

### Project Settings

Projects can override default transition settings:

```sql
-- project_settings table
post_show_transition_hour: 6  -- Hour for post-show transition (default 6 AM)
archive_month: 4              -- Archive month (default April)
archive_day: 1                -- Archive day (default 1st)
```

### Evaluator Configuration

```typescript
interface AutomaticTransitionConfig {
  enabledPhases: ProjectPhase[]        // Which phases to evaluate
  evaluationIntervalMinutes: number    // How often to evaluate
  maxRetryAttempts: number             // Retry failed transitions
  alertOnFailure: boolean              // Send alerts on failure
  dryRun: boolean                      // Test mode (no actual transitions)
}
```

## Timezone Handling

The system uses project-specific timezones with fallback logic:

1. Project timezone (if set and valid)
2. Organization default timezone
3. UTC (final fallback)

Timezone calculations handle:
- DST transitions
- Year boundaries
- Invalid timezone fallbacks
- Cross-timezone operations

## Error Handling

### Automatic Recovery

- Failed transitions are logged and can be retried
- Invalid timezones fall back to UTC with warnings
- Database errors are caught and logged
- Evaluation continues even if individual projects fail

### Monitoring and Alerts

- High failure rates trigger alerts
- System health checks monitor database connectivity
- Performance metrics track evaluation times
- Recent failures are tracked and reported

## Logging and Audit Trail

All transition attempts are logged to the `project_audit_log` table:

```sql
-- Automatic transition attempt
{
  "action_type": "automatic_transition_attempt",
  "action_details": {
    "from_phase": "pre_show",
    "to_phase": "active",
    "success": true,
    "evaluation_result": {...},
    "scheduled_at": "2024-03-15T00:00:00-05:00"
  }
}

-- Transition alert
{
  "action_type": "transition_alert",
  "action_details": {
    "alert_type": "failure",
    "severity": "high",
    "title": "High Transition Failure Rate",
    "message": "50% of transitions failed"
  }
}
```

## Deployment

### Cron Job Setup

For Vercel:
```bash
# vercel.json
{
  "crons": [
    {
      "path": "/api/cron/transitions",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

For other platforms:
```bash
# Every 15 minutes
*/15 * * * * curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.com/api/cron/transitions
```

### Environment-Specific Configuration

```typescript
// Production: Full evaluation with real transitions
const evaluator = new AutomaticTransitionEvaluator({
  dryRun: false,
  alertOnFailure: true,
  enabledPhases: [ProjectPhase.PRE_SHOW, ProjectPhase.ACTIVE, ProjectPhase.POST_SHOW, ProjectPhase.COMPLETE]
})

// Staging: Dry run mode for testing
const evaluator = new AutomaticTransitionEvaluator({
  dryRun: true,
  alertOnFailure: false
})
```

## Testing

### Unit Tests

```bash
npm test -- lib/services/__tests__/automatic-transition-evaluator.test.ts
```

### Integration Tests

```bash
node scripts/test-automatic-transitions.js
```

### Verification

```bash
node scripts/verify-automatic-transitions.js
```

## Performance Considerations

- Evaluations are batched to avoid overwhelming the database
- Timezone calculations are cached where possible
- Failed projects don't block evaluation of other projects
- Background jobs run at configurable intervals (default 15 minutes)
- Database queries are optimized with proper indexing

## Security

- API endpoints require proper authentication
- Cron jobs use secret tokens for authorization
- Transition execution requires admin privileges
- All actions are logged for audit purposes
- Row-level security policies apply to all database operations

## Troubleshooting

### Common Issues

1. **No transitions occurring**: Check `auto_transitions_enabled` flag on projects
2. **Timezone errors**: Verify project timezone settings are valid
3. **Permission errors**: Ensure proper user roles and RLS policies
4. **Cron job failures**: Check CRON_SECRET configuration and endpoint accessibility

### Health Check

```http
GET /api/cron/transitions
Authorization: Bearer <cron-secret>
```

Returns system health status and configuration validation.

### Monitoring Dashboard

Use the monitoring service to track:
- Transition success/failure rates
- Performance metrics
- Recent alerts
- Scheduled transitions

## Future Enhancements

- Web UI for transition management
- Advanced scheduling rules
- Custom notification channels (Slack, email)
- Transition rollback capabilities
- Performance optimization with caching
- Advanced timezone handling with external libraries