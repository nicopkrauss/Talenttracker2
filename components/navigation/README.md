# Navigation System

This directory contains the responsive navigation system that adapts between mobile and desktop layouts based on user roles and screen size.

## Components

### Navigation (Main Component)
The main responsive navigation wrapper that switches between mobile and desktop layouts.

```tsx
import { Navigation, NavigationProvider } from '@/components/navigation'

function App() {
  const user = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    projectRole: 'admin'
  }

  return (
    <NavigationProvider user={user}>
      <Navigation />
      {/* Your app content */}
    </NavigationProvider>
  )
}
```

### NavigationProvider
Provides navigation context including role-based filtering and active route detection.

### MobileNavigation
Bottom dock navigation for mobile devices (< 768px width).

### DesktopNavigation
Top navigation bar for desktop devices (>= 768px width).

## Features

- **Responsive Design**: Automatically switches between mobile and desktop layouts
- **Role-Based Access**: Shows navigation items based on user project role
- **Smooth Transitions**: Includes transition effects when switching layouts
- **Active State Management**: Highlights current page in navigation
- **SSR Compatible**: Handles server-side rendering without hydration issues

## Breakpoint

The navigation switches between mobile and desktop layouts at 768px width, using the `useIsMobile` hook.

## User Roles

- **admin**: Access to Projects, Team, Talent, Timecards, Profile
- **in-house**: Access to Projects, Team, Talent, Timecards, Profile  
- **supervisor**: Access to Team, Talent, Timecards, Profile
- **coordinator**: Access to Team, Talent, Timecards, Profile
- **talent-escort**: Access to Talent, Timecards, Profile