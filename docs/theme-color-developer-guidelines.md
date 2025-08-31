# Theme Color Developer Guidelines

## Overview

This document provides comprehensive guidelines for developers working with theme-aware colors in the Talent Tracker application. Following these guidelines ensures consistent theming, accessibility compliance, and maintainable code across the entire application.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Color System Architecture](#color-system-architecture)
3. [Development Workflow](#development-workflow)
4. [Component Patterns](#component-patterns)
5. [Testing Requirements](#testing-requirements)
6. [Code Review Checklist](#code-review-checklist)
7. [Common Mistakes](#common-mistakes)
8. [Tools and Utilities](#tools-and-utilities)
9. [Maintenance Guidelines](#maintenance-guidelines)

## Core Principles

### 1. Theme-First Development
Always use theme-aware color tokens instead of hardcoded colors:

```tsx
// ❌ Never do this
<div className="text-gray-600 bg-gray-100">

// ✅ Always do this
<div className="text-muted-foreground bg-muted">
```

### 2. Semantic Color Consistency
Use semantic colors with proper dark mode variants:

```tsx
// ❌ Missing dark variant
<div className="text-green-600">Success message</div>

// ✅ Complete semantic color
<div className="text-green-600 dark:text-green-400">Success message</div>
```

### 3. Accessibility First
Ensure proper contrast ratios in both light and dark themes:

```tsx
// ✅ Good contrast in both themes
<div className="bg-card text-card-foreground">
  <p className="text-foreground">Primary content</p>
  <p className="text-muted-foreground">Secondary content</p>
</div>
```

### 4. Consistent Patterns
Use the same color tokens for similar UI elements across components:

```tsx
// ✅ Consistent card styling
const cardClasses = "bg-card text-card-foreground border border-border rounded-lg p-4";

// Use across all card components
<div className={cardClasses}>Card 1</div>
<div className={cardClasses}>Card 2</div>
```

## Color System Architecture

### CSS Custom Properties Foundation

The theme system is built on CSS custom properties defined in `app/globals.css`:

```css
:root {
  /* Base colors */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 98%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  /* Interactive colors */
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  
  /* System colors */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
}

.dark {
  /* Dark theme variants */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... other dark variants */
}
```

### Tailwind Integration

These custom properties are mapped to Tailwind classes:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // ... more mappings
      }
    }
  }
}
```

## Development Workflow

### 1. Planning Phase

Before writing any component:

1. **Identify color needs**: What colors will this component use?
2. **Choose semantic tokens**: Map colors to appropriate theme tokens
3. **Consider states**: Plan for hover, focus, active, and disabled states
4. **Plan dark mode**: Ensure all colors work in both themes

### 2. Implementation Phase

#### Step 1: Use Theme Tokens
```tsx
// Start with theme-aware colors from the beginning
const ProjectCard = ({ project }) => {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg p-4">
      <h3 className="text-foreground font-semibold">{project.name}</h3>
      <p className="text-muted-foreground">{project.description}</p>
    </div>
  );
};
```

#### Step 2: Add Interactive States
```tsx
const Button = ({ children, variant = "primary" }) => {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
  };

  return (
    <button className={`px-4 py-2 rounded-md transition-colors ${variants[variant]}`}>
      {children}
    </button>
  );
};
```

#### Step 3: Add Semantic Colors with Dark Variants
```tsx
const StatusBadge = ({ status, children }) => {
  const statusStyles = {
    success: "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    warning: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    error: "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    info: "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
      {children}
    </span>
  );
};
```

### 3. Testing Phase

#### Manual Testing
1. **Light theme**: Verify component appearance and readability
2. **Dark theme**: Switch theme and verify all colors adapt properly
3. **Interactive states**: Test hover, focus, and active states
4. **Accessibility**: Check contrast ratios using browser dev tools

#### Automated Testing
```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

const TestWrapper = ({ theme, children }) => (
  <ThemeProvider attribute="class" defaultTheme={theme}>
    <div className={theme}>{children}</div>
  </ThemeProvider>
);

describe('ProjectCard', () => {
  it('renders correctly in light theme', () => {
    render(
      <TestWrapper theme="light">
        <ProjectCard project={{ name: "Test", description: "Test desc" }} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders correctly in dark theme', () => {
    render(
      <TestWrapper theme="dark">
        <ProjectCard project={{ name: "Test", description: "Test desc" }} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## Component Patterns

### Form Components

```tsx
const FormField = ({ label, error, children }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

const Input = ({ error, ...props }) => {
  return (
    <input
      className={`
        w-full px-3 py-2 rounded-md border transition-colors
        bg-background text-foreground placeholder:text-muted-foreground
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${error 
          ? 'border-red-500 dark:border-red-400' 
          : 'border-input hover:border-ring'
        }
      `}
      {...props}
    />
  );
};
```

### Navigation Components

```tsx
const NavigationLink = ({ href, children, isActive }) => {
  return (
    <a
      href={href}
      className={`
        px-3 py-2 rounded-md text-sm font-medium transition-colors
        ${isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        }
      `}
    >
      {children}
    </a>
  );
};
```

### Data Display Components

```tsx
const DataTable = ({ headers, rows }) => {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-background divide-y divide-border">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-6 py-4 text-sm text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Modal and Dialog Components

```tsx
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card text-card-foreground rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
```

## Testing Requirements

### Unit Tests

Every component with theme-aware colors should have tests for both themes:

```tsx
describe('Component Theme Tests', () => {
  it('applies correct classes in light theme', () => {
    const { container } = render(
      <TestWrapper theme="light">
        <YourComponent />
      </TestWrapper>
    );
    
    // Test specific classes or computed styles
    expect(container.firstChild).toHaveClass('text-foreground');
  });

  it('applies correct classes in dark theme', () => {
    const { container } = render(
      <TestWrapper theme="dark">
        <YourComponent />
      </TestWrapper>
    );
    
    // Verify dark theme classes are applied
    expect(container.firstChild).toHaveClass('dark');
  });
});
```

### Integration Tests

Test theme switching functionality:

```tsx
import { fireEvent, screen } from '@testing-library/react';

test('theme switching works correctly', () => {
  render(
    <ThemeProvider>
      <ThemeToggle />
      <YourComponent />
    </ThemeProvider>
  );

  const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
  
  // Test initial state
  expect(document.documentElement).not.toHaveClass('dark');
  
  // Toggle to dark theme
  fireEvent.click(themeToggle);
  expect(document.documentElement).toHaveClass('dark');
  
  // Toggle back to light theme
  fireEvent.click(themeToggle);
  expect(document.documentElement).not.toHaveClass('dark');
});
```

### Accessibility Tests

Validate contrast ratios programmatically:

```tsx
import { validateContrastRatio } from '@/lib/__tests__/contrast-validation';

test('maintains proper contrast ratios', async () => {
  render(<YourComponent />);
  
  const textElement = screen.getByText('Important text');
  const contrastRatio = await validateContrastRatio(textElement);
  
  expect(contrastRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA standard
});
```

## Code Review Checklist

### For Reviewers

When reviewing code with theme-aware colors, check:

- [ ] **No hardcoded colors**: No `text-gray-*`, `bg-gray-*`, `border-gray-*` classes
- [ ] **Semantic colors have dark variants**: `text-green-600 dark:text-green-400`
- [ ] **Consistent token usage**: Similar elements use same color tokens
- [ ] **Interactive states**: Hover, focus, active states are theme-aware
- [ ] **Accessibility**: Proper contrast ratios maintained
- [ ] **Tests included**: Both light and dark theme tests present

### For Authors

Before submitting code:

- [ ] **Run color audit**: `npm run color-audit` shows no new issues
- [ ] **Test both themes**: Manually verify light and dark appearance
- [ ] **Check accessibility**: Use browser tools to validate contrast
- [ ] **Add tests**: Include theme-specific test cases
- [ ] **Update documentation**: Document any new patterns used

## Common Mistakes

### 1. Using Hardcoded Colors

```tsx
// ❌ Wrong - hardcoded colors
<div className="text-gray-600 bg-gray-100">
  Content
</div>

// ✅ Correct - theme-aware colors
<div className="text-muted-foreground bg-muted">
  Content
</div>
```

### 2. Missing Dark Mode Variants

```tsx
// ❌ Wrong - no dark variant
<div className="text-green-600">Success!</div>

// ✅ Correct - includes dark variant
<div className="text-green-600 dark:text-green-400">Success!</div>
```

### 3. Inconsistent Color Usage

```tsx
// ❌ Wrong - inconsistent colors for similar elements
<button className="text-gray-700">Button 1</button>
<button className="text-gray-800">Button 2</button>

// ✅ Correct - consistent semantic colors
<button className="text-foreground">Button 1</button>
<button className="text-foreground">Button 2</button>
```

### 4. Poor Contrast in Dark Mode

```tsx
// ❌ Wrong - poor contrast in dark mode
<div className="bg-gray-800 text-gray-600">
  Hard to read in dark mode
</div>

// ✅ Correct - good contrast in both themes
<div className="bg-card text-card-foreground">
  Readable in both themes
</div>
```

### 5. Not Testing Interactive States

```tsx
// ❌ Wrong - hardcoded hover state
<button className="bg-blue-500 hover:bg-blue-600">
  Button
</button>

// ✅ Correct - theme-aware hover state
<button className="bg-primary hover:bg-primary/90">
  Button
</button>
```

## Tools and Utilities

### Color Audit System

Run regular audits to catch hardcoded colors:

```bash
# Full codebase audit
npm run color-audit

# Audit specific file
node scripts/color-migration-helper.js components/auth/login-form.tsx

# Audit specific directory
node scripts/color-migration-helper.js components/navigation/
```

### Color Mapping Utilities

Use utility functions for programmatic color handling:

```typescript
import { 
  findColorReplacement, 
  isThemeAware,
  generateColorSuggestions 
} from '@/lib/color-mapping-utils';

// Check if a color is theme-aware
const isValid = isThemeAware('text-muted-foreground'); // true

// Find replacement for hardcoded color
const replacement = findColorReplacement('text-gray-600');
// Returns: { themeAwareReplacement: 'text-muted-foreground', ... }

// Generate suggestions for component
const suggestions = generateColorSuggestions(componentCode);
```

### Theme Testing Infrastructure

Use testing utilities for consistent theme testing:

```typescript
import { renderWithTheme, validateThemeAwareness } from '@/lib/__tests__/theme-test-utils';

// Render component with specific theme
const { container } = renderWithTheme(<Component />, 'dark');

// Validate component is theme-aware
const isThemeAware = validateThemeAwareness(container);
```

### Browser Development Tools

Use browser tools for manual validation:

1. **Chrome DevTools**: 
   - Elements panel → Computed styles
   - Lighthouse → Accessibility audit
   - Color contrast analyzer extensions

2. **Firefox DevTools**:
   - Accessibility inspector
   - Color contrast checker

## Maintenance Guidelines

### Regular Audits

Schedule regular color audits:

- **Weekly**: During active development
- **Before releases**: Ensure no regressions
- **After major changes**: Validate theme consistency

### Documentation Updates

Keep documentation current:

- **New patterns**: Document any new color usage patterns
- **Component examples**: Update examples when patterns change
- **Migration guides**: Keep replacement suggestions up to date

### Team Training

Ensure team knowledge:

- **Onboarding**: Include theme guidelines in developer onboarding
- **Code reviews**: Use checklist consistently
- **Best practices**: Share learnings from theme-related issues

### Monitoring and Metrics

Track theme-related metrics:

- **Audit results**: Monitor hardcoded color count over time
- **User feedback**: Track theme-related user issues
- **Performance**: Monitor theme switching performance
- **Accessibility**: Regular accessibility audits

## Conclusion

Following these guidelines ensures:

- **Consistent theming** across the entire application
- **Accessibility compliance** with proper contrast ratios
- **Maintainable code** with semantic color usage
- **Better user experience** with smooth theme transitions
- **Developer productivity** with clear patterns and tools

Remember: Theme-aware development is not just about colors—it's about creating an inclusive, accessible, and maintainable user interface that works beautifully in any lighting condition.

## Quick Reference

### Essential Color Tokens
```css
/* Text */
text-foreground          /* Primary text */
text-muted-foreground    /* Secondary text */
text-primary-foreground  /* Text on colored backgrounds */

/* Backgrounds */
bg-background           /* Main page background */
bg-card                 /* Card/elevated surfaces */
bg-muted                /* Subtle section backgrounds */

/* Interactive */
bg-primary              /* Primary buttons */
bg-secondary            /* Secondary buttons */
hover:bg-primary/90     /* Hover states */

/* Semantic (with dark variants) */
text-green-600 dark:text-green-400    /* Success */
text-amber-600 dark:text-amber-400    /* Warning */
text-red-600 dark:text-red-400        /* Error */
text-blue-600 dark:text-blue-400      /* Info */
```

### Quick Commands
```bash
# Audit colors
npm run color-audit

# Test specific file
node scripts/color-migration-helper.js path/to/file.tsx

# Run theme tests
npm test -- --testNamePattern="theme"
```

This comprehensive guide should serve as the definitive resource for theme-aware color development in the Talent Tracker application.