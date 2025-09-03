# Navigation System Design Document

## Overview

The navigation system provides a responsive, role-based navigation interface that adapts between mobile and desktop layouts. It leverages the existing shadcn/ui design system and integrates with the current Next.js app structure to provide seamless navigation across different user roles and device types.

## Architecture

### Component Structure
```
NavigationProvider (Context)
├── MobileNavigation (Bottom dock)
│   ├── NavItem (Icon + Label)
│   └── ActiveIndicator
└── DesktopNavigation (Top bar)
    ├── NavLinks (Left side)
    │   └── NavItem (Text links)
    └── UserMenu (Right side)
        ├── Avatar/Name
        └── DropdownMenu
            ├── Profile
            └── Settings
```

### Responsive Behavior
- Uses the existing `useIsMobile()` hook with 768px breakpoint
- Automatically switches between mobile and desktop layouts
- Maintains navigation state across layout changes

### Role-Based Navigation
- Navigation items filtered based on user's project role
- Role determination through authentication context
- Dynamic menu generation based on permissions

## Components and Interfaces

### Core Navigation Component
```typescript
interface NavigationProps {
  userRole: ProjectRole
  currentPath: string
  user: {
    name: string
    avatar?: string
  }
}

interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  roles: ProjectRole[]
}
```

### Navigation Items Configuration
```typescript
const navigationItems: NavItem[] = [
  {
    id: 'projects',
    label: 'Projects',
    href: '/projects',
    icon: FolderIcon,
    roles: ['admin', 'in-house']
  },
  {
    id: 'team',
    label: 'Team',
    href: '/team',
    icon: Users3Icon,
    roles: ['admin', 'in-house', 'supervisor', 'coordinator']
  },
  {
    id: 'talent',
    label: 'Talent',
    href: '/talent',
    icon: StarIcon,
    roles: ['admin', 'in-house', 'supervisor', 'coordinator', 'talent-escort']
  },
  {
    id: 'timecards',
    label: 'Timecards',
    href: '/timecards',
    icon: ClipboardListIcon,
    roles: ['admin', 'in-house', 'supervisor', 'coordinator', 'talent-escort']
  }
]
```

### Mobile Navigation Design
- **Position**: Fixed bottom dock using `fixed bottom-0 left-0 right-0`
- **Layout**: Horizontal flex with equal spacing
- **Icons**: Lucide React icons (closest equivalent to SF Symbols)
- **Active State**: Background highlight and icon color change
- **Safe Area**: Padding bottom for devices with home indicators

### Desktop Navigation Design
- **Position**: Fixed top bar using `fixed top-0 left-0 right-0`
- **Layout**: Horizontal flex with left-aligned nav items and right-aligned user menu
- **Typography**: Text labels with hover states
- **User Menu**: Avatar/name with dropdown for Profile and Settings
- **Active State**: Underline or background highlight

## Data Models

### User Role Types
```typescript
type ProjectRole = 'admin' | 'in-house' | 'supervisor' | 'coordinator' | 'talent-escort'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  projectRole: ProjectRole
}
```

### Navigation State
```typescript
interface NavigationState {
  currentPath: string
  userRole: ProjectRole
  availableItems: NavItem[]
}
```

## Error Handling

### Role Resolution Errors
- **Fallback Role**: Default to most restrictive role (talent-escort) if role cannot be determined
- **Error Boundary**: Wrap navigation in error boundary to prevent app crashes
- **Graceful Degradation**: Show basic navigation if role-based filtering fails

### Route Protection
- **Invalid Routes**: Redirect to appropriate default route based on user role
- **Permission Denied**: Show appropriate error message and redirect
- **Authentication Required**: Redirect to login if user not authenticated

### Mobile/Desktop Detection Errors
- **SSR Compatibility**: Handle server-side rendering without window object
- **Fallback Layout**: Default to desktop layout if detection fails
- **Hydration Mismatch**: Prevent hydration errors with proper initial state

## Testing Strategy

### Unit Tests
- **Component Rendering**: Test navigation renders correctly for each role
- **Role Filtering**: Verify correct navigation items shown for each role
- **Responsive Behavior**: Test layout switching at breakpoint
- **Active State**: Verify active navigation item highlighting

### Integration Tests
- **Navigation Flow**: Test navigation between different sections
- **Role Changes**: Test navigation updates when user role changes
- **Authentication**: Test navigation behavior with auth state changes
- **Route Protection**: Test access control for different routes

### Visual Tests
- **Mobile Layout**: Screenshot tests for mobile navigation dock
- **Desktop Layout**: Screenshot tests for desktop navigation bar
- **Active States**: Visual tests for active navigation indicators
- **User Menu**: Tests for dropdown menu appearance and behavior

### Accessibility Tests
- **Keyboard Navigation**: Test tab order and keyboard shortcuts
- **Screen Reader**: Test ARIA labels and navigation announcements
- **Touch Targets**: Verify mobile touch targets meet minimum size requirements
- **Color Contrast**: Test navigation meets WCAG contrast requirements

## Implementation Notes

### Existing Dependencies
- Leverages existing shadcn/ui components (Button, DropdownMenu, Avatar)
- Uses existing useIsMobile hook for responsive behavior
- Integrates with current Next.js routing and authentication

### Performance Considerations
- **Memoization**: Memoize navigation items calculation based on user role
- **Code Splitting**: Lazy load navigation components if needed
- **Icon Optimization**: Use tree-shaking for icon imports

### Accessibility Features
- **ARIA Labels**: Proper labeling for navigation landmarks
- **Keyboard Support**: Full keyboard navigation support
- **Focus Management**: Proper focus handling for mobile/desktop transitions
- **Screen Reader**: Announcements for navigation changes