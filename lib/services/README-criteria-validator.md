# Criteria Validation Framework

## Overview

The Criteria Validation Framework provides a comprehensive system for validating project phase completion criteria within the project lifecycle management system. It implements the requirements specified in task 4 of the project lifecycle management spec.

## Implementation

### Core Components

1. **CriteriaValidator Class** (`lib/services/criteria-validator.ts`)
   - Main validation service with methods for each phase
   - Integrates with Supabase database for data validation
   - Provides detailed validation results with completion status, pending items, and blockers

2. **ValidationResult Interface**
   - Standardized result structure for all validation methods
   - Contains `isComplete`, `completedItems`, `pendingItems`, and `blockers` arrays

3. **CriteriaValidationError Interface**
   - Custom error type with specific error codes and details
   - Supports `VALIDATION_ERROR`, `DATABASE_ERROR`, and `UNAUTHORIZED` codes

### Validation Methods

#### 1. `validatePrepCompletion(projectId: string)`
**Requirements Addressed:** 1.2 - vital project information must be complete for staffing transition

**Validates:**
- Project basic information (name, description, dates, timezone)
- Project locations configuration
- Project role templates setup

**Returns blockers for:**
- Missing start/end dates (required for scheduling)
- Missing timezone (required for phase transitions)
- No project locations defined
- No role templates configured

#### 2. `validateStaffingCompletion(projectId: string)`
**Requirements Addressed:** 1.3 - staffing and talent assignment must be complete for pre-show transition

**Validates:**
- Team member assignments
- Talent roster assignments
- Essential roles coverage (supervisor, coordinator)

**Returns blockers for:**
- No team members assigned
- No talent assigned to project
- Missing essential roles (supervisor/coordinator)

#### 3. `validatePreShowReadiness(projectId: string)`
**Requirements Addressed:** 1.4 - pre-show preparations must be complete for active transition

**Validates:**
- Project setup checklist completion
- Rehearsal start date configuration
- Talent escort assignments (minimum 50% coverage required)

**Returns blockers for:**
- Incomplete setup checklist items
- Missing rehearsal start date
- Insufficient escort coverage (< 50%)

#### 4. `validateTimecardCompletion(projectId: string)`
**Requirements Addressed:** 1.5 - all timecards must be approved and paid for complete transition

**Validates:**
- Timecard submission status
- Timecard approval and payment status
- Complete team member timecard coverage

**Returns blockers for:**
- No timecards submitted
- Rejected timecards requiring resubmission
- Unpaid timecards
- Missing timecard submissions from team members

## Error Handling

The framework implements comprehensive error handling:

- **Database Errors**: Caught and wrapped with `DATABASE_ERROR` code
- **Validation Errors**: General validation failures with `VALIDATION_ERROR` code
- **Graceful Degradation**: Continues validation even if some checks fail
- **Detailed Error Context**: Includes original error details for debugging

## Usage Examples

### Basic Phase Validation
```typescript
const validator = new CriteriaValidator()
const result = await validator.validatePrepCompletion(projectId)

if (result.isComplete) {
  // Allow transition to staffing phase
} else {
  // Show blockers and pending items to user
  console.log('Blockers:', result.blockers)
  console.log('Pending:', result.pendingItems)
}
```

### API Route Integration
```typescript
export async function POST(request: Request) {
  const { projectId, targetPhase } = await request.json()
  const validator = new CriteriaValidator()
  
  let validationResult
  switch (targetPhase) {
    case 'staffing':
      validationResult = await validator.validatePrepCompletion(projectId)
      break
    case 'pre_show':
      validationResult = await validator.validateStaffingCompletion(projectId)
      break
    // ... other phases
  }
  
  return NextResponse.json({
    canTransition: validationResult.isComplete,
    blockers: validationResult.blockers,
    pendingItems: validationResult.pendingItems
  })
}
```

## Testing

The framework includes comprehensive tests:

- **Unit Tests**: Individual validation method testing
- **Integration Tests**: End-to-end validation flow testing
- **Error Handling Tests**: Database failure and edge case testing
- **Mock Support**: Constructor accepts mock Supabase client for testing

## Database Dependencies

The validator relies on the following database tables:
- `projects` - Project basic information
- `project_locations` - Project location configuration
- `project_role_templates` - Role template definitions
- `team_assignments` - Team member assignments
- `talent_project_assignments` - Talent roster
- `project_setup_checklist` - Setup completion tracking
- `timecards` - Timecard submissions and status

## Requirements Compliance

This implementation fully addresses the requirements specified in task 4:

- ✅ **Create CriteriaValidator class for phase completion checking**
- ✅ **Implement validatePrepCompletion checking vital project info**
- ✅ **Create validateStaffingCompletion checking team assignments**
- ✅ **Implement validatePreShowReadiness checking final preparations**
- ✅ **Add validateTimecardCompletion checking payroll status**
- ✅ **Create ValidationResult interface and error handling**
- ✅ **Requirements: 1.2, 1.3, 1.4, 1.5, 4.1, 4.2**

The framework is ready for integration with the Phase Engine and other lifecycle management components.