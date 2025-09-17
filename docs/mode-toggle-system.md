# Mode Toggle System

The Mode Toggle System allows users to switch between Configuration and Operations modes in project detail views, providing different interfaces optimized for different workflows.

## Overview

The system consists of:
- **Configuration Mode**: Shows project setup tabs (Info, Roles & Team, Talent Roster, Assignments, Settings)
- **Operations Mode**: Shows live operations dashboard with real-time talent tracking and team status

## Components

### ModeToggle Component

A toggle button component that allows switching between modes.

```tsx
import { ModeToggle, ProjectMode } from '@/components/projects/mode-toggle'

<ModeToggle 
  currentMode="configuration"
  onModeChange={(mode) => setMode(mode)}
/>
```

**Props:**
- `currentMode`: Current active mode ('configuration' | 'operations')
- `onModeChange`: Callback function when mode changes
- `className`: Optional additional CSS classes

**Features:**
- Keyboard accessible (Tab navigation, Enter/Space activation)
- Responsive text labels (full text on desktop, abbreviated on mobile)
- ARIA attributes for screen readers
- Visual feedback for active state

### useProjectMode Hook

A custom hook that manages mode state with persistence.

```tsx
import { useProjectMode } from '@/hooks/use-project-mode'

const { currentMode, setMode, isConfiguration, isOperations } = useProjectMode({
  projectId: 'project-123',
  defaultMode: 'configuration'
})
```

**Features:**
- **URL State Management**: Mode is reflected in URL query parameters
- **localStorage Persistence**: User's mode preference is saved per project
- **Keyboard Shortcuts**: Alt+C (Configuration), Alt+O (Operations)
- **Browser History**: Mode changes don't add to browser history (uses replace)

**Returns:**
- `currentMode`: Current active mode
- `setMode`: Function to change mode
- `isConfiguration`: Boolean helper for configuration mode
- `isOperations`: Boolean helper for operations mode

## Integration

### ProjectDetailLayout

The main layout component integrates the mode toggle system:

```tsx
import { ProjectDetailLayout } from '@/components/projects/project-detail-layout'

<ProjectDetailLayout projectId="project-123" />
```

**Features:**
- Mode toggle appears in the project header between title and status badge
- Content switches based on current mode
- Proper ARIA attributes for accessibility
- Responsive design for mobile and desktop

### ProjectHeader

Updated to include the mode toggle:

```tsx
<ProjectHeader 
  project={project}
  onBack={handleBack}
  currentMode={currentMode}
  onModeChange={setMode}
/>
```

## Accessibility

The mode toggle system is fully accessible:

- **Keyboard Navigation**: Tab to focus, Enter/Space to activate
- **Screen Readers**: Proper ARIA labels and role attributes
- **Focus Management**: Clear focus indicators
- **Semantic HTML**: Uses proper button and tablist roles

## Responsive Design

- **Desktop**: Full text labels ("Configuration", "Operations")
- **Mobile**: Abbreviated labels ("Config", "Ops")
- **Touch Targets**: Minimum 44px touch targets for mobile
- **Flexible Layout**: Header adapts to different screen sizes

## Persistence

Mode preferences are persisted in multiple ways:

1. **URL Parameters**: `?mode=operations` in the URL
2. **localStorage**: Per-project preference storage
3. **Session Memory**: Maintains state during navigation

**Priority Order:**
1. URL parameters (highest priority)
2. localStorage (fallback)
3. Default mode (final fallback)

## Keyboard Shortcuts

Global keyboard shortcuts are available:
- **Alt + C**: Switch to Configuration mode
- **Alt + O**: Switch to Operations mode

## Usage Examples

### Basic Implementation

```tsx
function ProjectPage({ projectId }: { projectId: string }) {
  const { currentMode, setMode } = useProjectMode({ projectId })
  
  return (
    <div>
      <ModeToggle currentMode={currentMode} onModeChange={setMode} />
      
      {currentMode === 'configuration' ? (
        <ConfigurationContent />
      ) : (
        <OperationsContent />
      )}
    </div>
  )
}
```

### With Default Mode

```tsx
const { currentMode, setMode } = useProjectMode({
  projectId: 'project-123',
  defaultMode: 'operations' // Start in operations mode
})
```

### Conditional Rendering

```tsx
const { isConfiguration, isOperations } = useProjectMode({ projectId })

return (
  <div>
    {isConfiguration && <ProjectTabs />}
    {isOperations && <OperationsDashboard />}
  </div>
)
```

## Testing

The system includes comprehensive tests:

- **Unit Tests**: ModeToggle component and useProjectMode hook
- **Integration Tests**: Full ProjectDetailLayout with mode switching
- **Accessibility Tests**: Keyboard navigation and ARIA attributes
- **Persistence Tests**: localStorage and URL state management

Run tests with:
```bash
npm test -- components/projects/__tests__/mode-toggle.test.tsx
npm test -- hooks/__tests__/use-project-mode.test.ts
npm test -- components/projects/__tests__/project-detail-layout-mode-toggle.test.tsx
```

## Browser Support

The mode toggle system works in all modern browsers:
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with touch support

## Performance

- **Instant Mode Switching**: No loading states between modes
- **Efficient Re-renders**: Uses React.memo and optimized state management
- **Minimal Bundle Impact**: Lazy loading for mode-specific components
- **Fast Persistence**: localStorage operations are synchronous and fast