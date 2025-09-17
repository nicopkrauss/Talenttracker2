# Phase Display and Mode Toggle Components

This directory contains the phase display and mode toggle components that implement task 9 of the project lifecycle management specification. These components replace the old "activate project" system with a comprehensive phase-based approach.

## Components Overview

### PhaseIndicator
Displays the current project phase with appropriate styling and icons.

```tsx
import { PhaseIndicator, PhaseIndicatorCompact, PhaseIndicatorFull } from './phase-components'

// Basic usage
<PhaseIndicator currentPhase={ProjectPhase.PREP} />

// With description
<PhaseIndicator 
  currentPhase={ProjectPhase.STAFFING} 
  showDescription={true}
  size="lg"
/>

// Compact version for headers
<PhaseIndicatorCompact currentPhase={currentPhase} />

// Full version for dashboards
<PhaseIndicatorFull currentPhase={currentPhase} />
```

### PhaseActionItems
Shows phase-specific action items with filtering and completion tracking.

```tsx
import { PhaseActionItems } from './phase-components'

<PhaseActionItems
  projectId="project-123"
  currentPhase={ProjectPhase.PREP}
  showFilters={true}
  showSummary={true}
  autoRefresh={true}
/>
```

### PhaseTransitionButton
Provides manual phase transition controls for administrators.

```tsx
import { PhaseTransitionButton, PhaseTransitionButtonFull } from './phase-components'

<PhaseTransitionButton
  projectId="project-123"
  currentPhase={ProjectPhase.PREP}
  transitionResult={transitionResult}
  onTransitionComplete={() => refreshData()}
/>

// Full version with detailed blockers
<PhaseTransitionButtonFull
  projectId="project-123"
  currentPhase={currentPhase}
  transitionResult={transitionResult}
  onTransitionComplete={handleTransition}
/>
```

### PhaseProgressIndicator
Shows overall project progress and phase completion status.

```tsx
import { PhaseProgressIndicator, PhaseProgressIndicatorCompact } from './phase-components'

<PhaseProgressIndicator
  projectId="project-123"
  currentPhase={ProjectPhase.STAFFING}
  transitionResult={transitionResult}
  actionItemsSummary={summary}
  showDetails={true}
  showNextSteps={true}
/>

// Compact version for widgets
<PhaseProgressIndicatorCompact
  currentPhase={currentPhase}
  transitionResult={transitionResult}
  actionItemsSummary={summary}
/>
```

### PhaseManagementDashboard
Comprehensive dashboard combining all phase components.

```tsx
import { PhaseManagementDashboard, PhaseManagementWidget } from './phase-components'

// Full dashboard
<PhaseManagementDashboard
  projectId="project-123"
  autoRefresh={true}
  refreshInterval={60000}
  defaultTab="overview"
/>

// Compact widget for embedding
<PhaseManagementWidget projectId="project-123" />
```

### PhaseModeToggle
Integrates phase information with the existing mode toggle system.

```tsx
import { PhaseModeToggle, PhaseModeToggleMinimal } from './phase-components'

<PhaseModeToggle
  projectId="project-123"
  currentMode={currentMode}
  onModeChange={setMode}
  showProgress={true}
  showTransitionButton={true}
/>

// Minimal version for tight spaces
<PhaseModeToggleMinimal
  projectId="project-123"
  currentMode={currentMode}
  onModeChange={setMode}
/>
```

## Integration with Existing Components

### Project Detail Layout
Replace the old mode toggle with the new phase-aware version:

```tsx
// Before
<ModeToggle currentMode={mode} onModeChange={setMode} />

// After
<PhaseModeToggle
  projectId={projectId}
  currentMode={mode}
  onModeChange={setMode}
  showProgress={true}
  showTransitionButton={true}
/>
```

### Project Header
Add phase indicator to project headers:

```tsx
<div className="flex items-center gap-4">
  <h1>{project.name}</h1>
  <PhaseIndicatorCompact currentPhase={currentPhase} />
</div>
```

### Dashboard Widgets
Add phase management widget to dashboards:

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <ProjectOverviewCard project={project} />
  <PhaseManagementWidget projectId={project.id} />
  <OtherWidget />
</div>
```

## Phase Configuration

The components support all project phases defined in the phase engine:

- **PREP**: Project setup and configuration
- **STAFFING**: Team hiring and talent assignment  
- **PRE_SHOW**: Final preparations before rehearsals
- **ACTIVE**: Live operations and real-time management
- **POST_SHOW**: Timecard processing and wrap-up
- **COMPLETE**: Project finished, ready for archival
- **ARCHIVED**: Historical data, read-only access

Each phase has its own:
- Visual styling and colors
- Icon representation
- Action items and requirements
- Transition criteria
- Recommended mode (configuration vs operations)

## Responsive Design

All components are built with mobile-first responsive design:

- **Mobile**: Stacked layouts, compact spacing, touch-friendly targets
- **Tablet**: Balanced layouts with appropriate spacing
- **Desktop**: Full layouts with detailed information

## Accessibility Features

- **WCAG 2.1 AA compliant** color contrast ratios
- **Keyboard navigation** support for all interactive elements
- **Screen reader** compatibility with proper ARIA labels
- **Focus indicators** for all focusable elements
- **Semantic HTML** structure with proper headings and landmarks

## API Integration

Components integrate with the phase management API endpoints:

- `GET /api/projects/[id]/phase` - Get current phase and transition status
- `POST /api/projects/[id]/phase/transition` - Execute manual transitions
- `GET /api/projects/[id]/phase/action-items` - Get phase-specific action items
- `GET /api/projects/[id]/phase/history` - Get transition history

## Error Handling

All components include comprehensive error handling:

- **Network errors**: Graceful degradation with retry options
- **Permission errors**: Clear messaging about access requirements
- **Validation errors**: Specific feedback about what needs to be fixed
- **Loading states**: Appropriate spinners and skeleton screens

## Testing

Components include comprehensive test coverage:

- **Unit tests**: Individual component behavior
- **Integration tests**: Component interaction with APIs
- **Accessibility tests**: WCAG compliance verification
- **Responsive tests**: Layout adaptation across screen sizes

Run tests with:
```bash
npm test components/projects/__tests__/phase-*.test.tsx
```

## Performance Considerations

- **Lazy loading**: Components load only when needed
- **Memoization**: Expensive calculations are cached
- **Debounced updates**: API calls are throttled appropriately
- **Optimistic updates**: UI updates immediately for better UX

## Requirements Mapping

This implementation satisfies the following requirements from the specification:

- **2.1-2.8**: Visual indicators and phase-appropriate functionality
- **4.1-4.3**: Progress indicators and transition criteria display
- **6.1-6.8**: Phase-specific action items integration

## Future Enhancements

Potential improvements for future iterations:

- **Real-time updates**: WebSocket integration for live phase changes
- **Bulk operations**: Multi-project phase management
- **Custom phases**: Project-specific phase definitions
- **Analytics**: Phase transition timing and bottleneck analysis
- **Notifications**: Proactive alerts for phase transitions