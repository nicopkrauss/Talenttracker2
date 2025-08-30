# Design Document

## Overview

This design outlines a systematic approach to replace all hardcoded color values throughout the Talent Tracker application with theme-aware CSS custom properties and semantic Tailwind utility classes. The solution will ensure consistent theming, maintain accessibility standards, and provide a maintainable color system for future development.

## Architecture

### Theme System Foundation

The application already has a solid theme foundation with:
- **next-themes** provider configured in `app/layout.tsx`
- CSS custom properties defined in `app/globals.css` for both light and dark themes
- Tailwind CSS configured to use these custom properties

### Color Token Hierarchy

```
Theme Colors (CSS Custom Properties)
├── Base Colors
│   ├── --background / --foreground
│   ├── --card / --card-foreground  
│   ├── --muted / --muted-foreground
│   └── --border / --input
├── Interactive Colors
│   ├── --primary / --primary-foreground
│   ├── --secondary / --secondary-foreground
│   └── --accent / --accent-foreground
└── Semantic Colors
    ├── --destructive / --destructive-foreground
    ├── Success (green variants)
    ├── Warning (amber variants)
    └── Info (blue variants)
```

### Migration Strategy

1. **Audit Phase**: Systematically identify all hardcoded colors
2. **Categorization**: Group colors by semantic meaning and usage
3. **Replacement**: Map hardcoded colors to appropriate theme tokens
4. **Validation**: Test theme switching and accessibility compliance

## Components and Interfaces

### Color Mapping System

#### Text Colors
```typescript
// Current hardcoded → Theme-aware replacement
'text-gray-900' → 'text-foreground'
'text-gray-800' → 'text-foreground'
'text-gray-700' → 'text-foreground'
'text-gray-600' → 'text-muted-foreground'
'text-gray-500' → 'text-muted-foreground'
'text-gray-400' → 'text-muted-foreground'
'text-white' → 'text-primary-foreground' (on colored backgrounds)
'text-black' → 'text-foreground'
```

#### Background Colors
```typescript
// Current hardcoded → Theme-aware replacement
'bg-white' → 'bg-background' or 'bg-card'
'bg-gray-50' → 'bg-muted'
'bg-gray-100' → 'bg-muted'
'bg-gray-200' → 'bg-border'
'bg-gray-800' → 'bg-card' (in dark theme context)
'bg-gray-900' → 'bg-background' (in dark theme context)
```

#### Semantic Colors (with dark variants)
```typescript
// Success states
'text-green-600' → 'text-green-600 dark:text-green-400'
'text-green-700' → 'text-green-700 dark:text-green-300'
'bg-green-50' → 'bg-green-50 dark:bg-green-950/20'

// Warning states  
'text-amber-600' → 'text-amber-600 dark:text-amber-400'
'text-amber-700' → 'text-amber-700 dark:text-amber-300'
'bg-amber-50' → 'bg-amber-50 dark:bg-amber-950/20'

// Error states
'text-red-600' → 'text-red-600 dark:text-red-400'
'text-red-700' → 'text-red-700 dark:text-red-300'
'bg-red-50' → 'bg-red-50 dark:bg-red-950/20'

// Info states
'text-blue-600' → 'text-blue-600 dark:text-blue-400'
'text-blue-700' → 'text-blue-700 dark:text-blue-300'
'bg-blue-50' → 'bg-blue-50 dark:bg-blue-950/20'
```

### Component Priority Matrix

#### High Priority (Core UI Components)
- Navigation components (`components/navigation/`)
- Authentication forms (`components/auth/`)
- Project management (`components/projects/`)
- Main layout components (`app/(app)/`)

#### Medium Priority (Feature Components)
- Talent management (`components/talent/`)
- Form components (`components/ui/`)
- Dashboard pages

#### Low Priority (Utility Components)
- Test files
- Documentation components
- Admin utilities

### Automated Detection System

#### Search Patterns for Hardcoded Colors
```regex
// Text colors
text-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)

// Background colors  
bg-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)

// Border colors
border-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)

// Semantic colors without dark variants
text-(red|green|blue|yellow|amber|orange|purple|pink)-(50|100|200|300|400|500|600|700|800|900)(?!.*dark:)
```

## Data Models

### Color Audit Report Structure
```typescript
interface ColorAuditReport {
  filePath: string
  hardcodedColors: HardcodedColor[]
  priority: 'high' | 'medium' | 'low'
  estimatedEffort: number // in hours
}

interface HardcodedColor {
  lineNumber: number
  currentClass: string
  suggestedReplacement: string
  colorType: 'text' | 'background' | 'border' | 'semantic'
  context: string // surrounding code for context
}
```

### Migration Checklist Structure
```typescript
interface MigrationTask {
  componentPath: string
  status: 'pending' | 'in-progress' | 'completed' | 'verified'
  hardcodedColorCount: number
  assignee?: string
  notes?: string
}
```

## Error Handling

### Theme Switching Edge Cases
- **Hydration Mismatches**: Ensure server-side rendering matches client-side theme
- **Flash of Incorrect Theme**: Use theme loading states to prevent visual artifacts
- **Custom Color Overrides**: Handle cases where components need specific colors

### Accessibility Compliance
- **Contrast Ratio Validation**: Automated testing for WCAG 2.1 AA compliance
- **Color Blindness Support**: Ensure semantic meaning isn't conveyed by color alone
- **High Contrast Mode**: Support for system-level high contrast preferences

### Fallback Strategies
```css
/* Fallback for unsupported CSS custom properties */
.text-foreground {
  color: #000; /* fallback */
  color: var(--foreground, #000);
}

.dark .text-foreground {
  color: #fff; /* dark fallback */
  color: var(--foreground, #fff);
}
```

## Testing Strategy

### Automated Testing Approach

#### Visual Regression Testing
- Screenshot comparison between light and dark themes
- Component-level theme switching tests
- Cross-browser compatibility verification

#### Accessibility Testing
```typescript
// Example test structure
describe('Theme Accessibility', () => {
  it('should maintain contrast ratios in light theme', () => {
    // Test contrast ratios programmatically
  })
  
  it('should maintain contrast ratios in dark theme', () => {
    // Test contrast ratios programmatically  
  })
  
  it('should support theme switching without layout shift', () => {
    // Test for CLS during theme transitions
  })
})
```

#### Integration Testing
- Theme persistence across page navigation
- Theme switching performance impact
- Component state preservation during theme changes

### Manual Testing Checklist
1. **Theme Switching**: Verify all pages work in both themes
2. **Semantic Colors**: Confirm success/warning/error states are clear
3. **Interactive States**: Test hover/focus/active states
4. **Form Elements**: Verify input field theming
5. **Navigation**: Check mobile and desktop navigation theming

### Performance Considerations

#### CSS Bundle Optimization
- Minimize duplicate color declarations
- Use CSS custom properties efficiently
- Avoid unnecessary dark: variant classes where base theme tokens suffice

#### Runtime Performance
- Theme switching should complete within 100ms
- No layout thrashing during theme transitions
- Minimal JavaScript execution for theme changes

## Implementation Phases

### Phase 1: Foundation & Audit (Week 1)
- Complete codebase audit for hardcoded colors
- Create migration priority matrix
- Set up automated testing infrastructure

### Phase 2: Core Components (Week 2)
- Navigation system theme migration
- Authentication components
- Main layout components

### Phase 3: Feature Components (Week 3)
- Project management components
- Talent management components
- Form components

### Phase 4: Polish & Validation (Week 4)
- Remaining utility components
- Comprehensive testing
- Documentation updates
- Performance optimization

This systematic approach ensures no hardcoded colors are missed while maintaining the application's functionality and improving its accessibility and user experience across both light and dark themes.