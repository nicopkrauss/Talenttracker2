# Role Badge Color Consistency Implementation

## Overview

This document describes the implementation of consistent role badge colors across all components in the Talent Tracker application.

## Problem Statement

Role badges were inconsistently styled across different components. The role template manager was using `variant="secondary"` while other components like the roles & team tab were using custom color classes, leading to visual inconsistency.

## Solution

### Centralized Role Color Function

Created a centralized `getRoleColor` function in `lib/role-utils.ts` that provides consistent color classes for all role types:

```typescript
export function getRoleColor(role: string | null): string {
  switch (role) {
    case 'admin':
      return 'bg-slate-900 text-slate-50 border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
    case 'in_house':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800'
    case 'supervisor':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800'
    case 'coordinator':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800'
    case 'talent_escort':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-800'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}
```

### Role Color Scheme

The color scheme provides clear visual distinction between roles:

- **Admin**: Dark slate (high authority)
- **In-House**: Blue (management level)
- **Supervisor**: Green (on-site leadership)
- **Coordinator**: Purple (oversight role)
- **Talent Escort**: Orange (operational role)

### Dark Mode Support

All color classes include dark mode variants using Tailwind's `dark:` prefix, ensuring consistent appearance across light and dark themes.

## Implementation Details

### Files Modified

1. **`lib/role-utils.ts`**
   - Added `getRoleColor` function for centralized color management

2. **`components/projects/project-role-template-manager.tsx`**
   - Updated role badge from `variant="secondary"` to `variant="outline"` with `getRoleColor`
   - Added import for `getRoleColor` from role utils

3. **`components/projects/tabs/roles-team-tab.tsx`**
   - Removed local `getRoleColor` function
   - Updated import to use centralized function

### Badge Usage Pattern

All role badges now follow this consistent pattern:

```tsx
<Badge variant="outline" className={getRoleColor(role)}>
  {roleDisplayName}
</Badge>
```

## Benefits

1. **Visual Consistency**: All role badges use the same color scheme across the application
2. **Maintainability**: Single source of truth for role colors
3. **Accessibility**: Consistent contrast ratios and dark mode support
4. **Scalability**: Easy to add new roles or modify colors system-wide

## Testing

Created `scripts/test-role-badge-colors.js` to verify:
- Function consistency across components
- Badge usage patterns
- Color mapping accuracy

## Usage Guidelines

### For Developers

When displaying role badges in new components:

1. Import the function:
   ```typescript
   import { getRoleColor } from '@/lib/role-utils'
   ```

2. Use with Badge component:
   ```tsx
   <Badge variant="outline" className={getRoleColor(role)}>
     {roleDisplayName}
   </Badge>
   ```

### For Designers

The role color scheme is:
- **Admin**: Slate (dark/authoritative)
- **In-House**: Blue (management)
- **Supervisor**: Green (leadership)
- **Coordinator**: Purple (oversight)
- **Talent Escort**: Orange (operational)

## Future Enhancements

1. **Theme Customization**: Allow role colors to be customized per project or organization
2. **Accessibility Options**: Provide high-contrast mode for better accessibility
3. **Icon Integration**: Add role-specific icons alongside colors
4. **Animation**: Subtle hover effects for interactive badges

## Conclusion

The role badge color consistency implementation ensures a cohesive visual experience across the Talent Tracker application while providing a maintainable foundation for future role-related UI components.