# Phase-Aware Action Items System

## Overview

The Phase-Aware Action Items System integrates with the existing project readiness system to provide contextual, phase-specific action items that guide users through the project lifecycle. This system bridges the gap between the new project lifecycle management and the existing readiness-based todo system.

## Architecture

### Core Components

1. **PhaseEngine** - Manages project phases and generates phase-specific action items
2. **PhaseActionItemsService** - Integrates phase items with existing readiness items
3. **API Endpoint** - `/api/projects/[id]/phase/action-items` - Serves combined action items

### Integration Points

- **Existing Readiness System**: Leverages existing `project_readiness` table and readiness calculations
- **Project Lifecycle**: Uses project phase information to filter and contextualize items
- **Todo Items**: Converts existing readiness todo items to phase-aware action items

## Phase-Specific Action Items

### Prep Phase
- **Focus**: Project setup and configuration
- **Categories**: setup
- **Key Items**:
  - Add Project Roles & Pay Rates
  - Define Talent Locations
  - Set Project Dates
  - Complete Basic Information

### Staffing Phase
- **Focus**: Team and talent assignment
- **Categories**: staffing
- **Key Items**:
  - Assign Team Members
  - Add Talent to Roster
  - Assign Talent Escorts
  - Assign Supervisors

### Pre-Show Phase
- **Focus**: Final preparations before going live
- **Categories**: preparation, assignments
- **Key Items**:
  - Complete Urgent Assignments
  - Final Preparations
  - Team Communication
  - Location Setup Verification

### Active Phase
- **Focus**: Live operations management
- **Categories**: operations
- **Key Items**:
  - Monitor Talent Locations
  - Oversee Time Tracking
  - Resolve Assignment Issues
  - Daily Operations Management

### Post-Show Phase
- **Focus**: Wrap-up and payroll processing
- **Categories**: payroll, completion
- **Key Items**:
  - Review and Approve Timecards
  - Process Payroll
  - Project Summary
  - Final Communications

### Complete Phase
- **Focus**: Project closure and archival preparation
- **Categories**: completion, archival
- **Key Items**:
  - Finalize Project Summary
  - Prepare for Archival
  - Verify Data Integrity
  - Review Archive Settings

## API Usage

### Get Action Items

```typescript
GET /api/projects/[id]/phase/action-items

// Query Parameters:
// - phase: ProjectPhase (optional) - specific phase to get items for
// - category: string (optional) - filter by category
// - priority: 'high' | 'medium' | 'low' (optional) - filter by priority
// - required: boolean (optional) - only required items
// - includeReadiness: boolean (optional, default: true) - include readiness items

// Response:
{
  data: {
    projectId: string,
    projectName: string,
    currentPhase: ProjectPhase,
    requestedPhase: ProjectPhase,
    actionItems: ActionItem[], // Combined filtered items
    phaseItems: ActionItem[], // Phase-specific items only
    readinessItems: ActionItem[], // Readiness-based items only
    summary: {
      total: number,
      completed: number,
      pending: number,
      required: number,
      byPhase: Record<string, number>,
      byPriority: Record<string, number>,
      byCategory: Record<string, number>
    },
    metadata: {
      phaseItemCount: number,
      readinessItemCount: number,
      totalItemCount: number,
      integrationEnabled: boolean
    }
  }
}
```

### Mark Item Complete

```typescript
POST /api/projects/[id]/phase/action-items

// Body:
{
  itemId: string,
  action: 'complete'
}

// Response:
{
  data: {
    projectId: string,
    itemId: string,
    action: string,
    success: boolean
  }
}
```

## Action Item Structure

```typescript
interface ActionItem {
  id: string                    // Unique identifier
  title: string                 // Display title
  description: string           // Detailed description
  category: string              // Phase-appropriate category
  priority: 'high' | 'medium' | 'low'  // Priority level
  completed: boolean            // Completion status
  requiredForTransition: boolean // Required for phase transition
}
```

## Integration with Existing Systems

### Readiness System Integration

The system automatically converts existing readiness todo items into phase-aware action items:

1. **Category Mapping**: Maps readiness areas (team, talent, assignments, etc.) to phase-appropriate categories
2. **Priority Mapping**: Converts readiness priorities (critical, important, optional) to action item priorities
3. **Deduplication**: Prevents duplicate items when phase and readiness items overlap
4. **Context Awareness**: Filters readiness items based on current phase relevance

### Phase Transition Integration

Action items are designed to support the phase transition system:

1. **Required Items**: Items marked as `requiredForTransition` block phase transitions
2. **Completion Tracking**: Item completion can trigger readiness recalculation
3. **Dynamic Updates**: Items update automatically as project state changes
4. **Validation**: Phase transitions validate that required action items are complete

## Error Handling

The system includes comprehensive error handling:

1. **Database Failures**: Falls back to default readiness data
2. **Missing Data**: Provides sensible defaults for missing project information
3. **API Errors**: Gracefully handles readiness API failures
4. **Validation**: Validates all inputs and provides clear error messages

## Performance Considerations

1. **Caching**: Leverages existing readiness system caching
2. **Lazy Loading**: Only fetches data when needed
3. **Efficient Queries**: Minimizes database queries through smart data fetching
4. **Background Processing**: Non-critical operations happen asynchronously

## Testing

The system includes comprehensive testing:

1. **Unit Tests**: Test individual components and methods
2. **Integration Tests**: Test system integration points
3. **API Tests**: Test endpoint functionality and error handling
4. **Mock Support**: Comprehensive mocking for isolated testing

## Future Enhancements

1. **Custom Action Items**: Allow users to add custom action items
2. **Templates**: Phase-specific action item templates
3. **Notifications**: Integrate with notification system for reminders
4. **Analytics**: Track action item completion patterns
5. **Automation**: Automatically complete items based on system events

## Requirements Fulfilled

This implementation fulfills the following requirements from the project lifecycle management spec:

- **6.1**: Action items reflect current project phase
- **6.2**: Phase-specific filtering of action items
- **6.3**: Dynamic generation based on completion status
- **6.4**: Integration with existing readiness system
- **6.5**: No schema changes required
- **6.6**: Hardcoded logic for each phase
- **6.7**: Phase-appropriate categorization
- **6.8**: Seamless integration with existing workflows