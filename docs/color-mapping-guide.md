# Color Mapping Guide for Theme-Aware Development

This guide provides comprehensive documentation for migrating from hardcoded color classes to theme-aware alternatives in the Talent Tracker application.

## Table of Contents

1. [Overview](#overview)
2. [Theme System Architecture](#theme-system-architecture)
3. [Color Mapping Patterns](#color-mapping-patterns)
4. [Semantic Color Usage](#semantic-color-usage)
5. [Migration Workflow](#migration-workflow)
6. [Utility Functions](#utility-functions)
7. [Testing Theme Changes](#testing-theme-changes)
8. [Common Patterns & Examples](#common-patterns--examples)
9. [Troubleshooting](#troubleshooting)

## Overview

The Talent Tracker application uses a comprehensive theme system built on CSS custom properties and Tailwind CSS. This system ensures consistent theming across light and dark modes while maintaining accessibility standards.

### Why Theme-Aware Colors?

- **Consistency**: Unified color system across all components
- **Accessibility**: Proper contrast ratios in both light and dark themes
- **Maintainability**: Single source of truth for color definitions
- **User Experience**: Seamless theme switching without visual artifacts

## Theme System Architecture

### CSS Custom Properties Foundation

The theme system is built on CSS custom properties defined in `app/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 98%;
  --muted-foreground: 215.4 16.3% 46.9%;
  /* ... more properties */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  /* ... more properties */
}
```

### Tailwind Integration

Tailwind CSS is configured to use these custom properties:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        // ... more color definitions
      }
    }
  }
}
```

## Color Mapping Patterns

### Text Colors

| Hardcoded Class | Theme-Aware Replacement | Usage Context |
|----------------|------------------------|---------------|
| `text-gray-900` | `text-foreground` | Primary headings, main content |
| `text-gray-800` | `text-foreground` | Secondary headings, body text |
| `text-gray-700` | `text-foreground` | Labels, form text |
| `text-gray-600` | `text-muted-foreground` | Helper text, descriptions |
| `text-gray-500` | `text-muted-foreground` | Placeholder text, captions |
| `text-gray-400` | `text-muted-foreground` | Disabled text, subtle labels |
| `text-white` | `text-primary-foreground` | Text on colored backgrounds |
| `text-black` | `text-foreground` | Primary text (explicit black) |

#### Examples

```tsx
// ❌ Hardcoded colors
<h1 className="text-gray-900">Welcome to Talent Tracker</h1>
<p className="text-gray-600">Manage your projects efficiently</p>
<span className="text-gray-400">Last updated 2 hours ago</span>

// ✅ Theme-aware colors
<h1 className="text-foreground">Welcome to Talent Tracker</h1>
<p className="text-muted-foreground">Manage your projects efficiently</p>
<span className="text-muted-foreground">Last updated 2 hours ago</span>
```

### Background Colors

| Hardcoded Class | Theme-Aware Replacement | Usage Context |
|----------------|------------------------|---------------|
| `bg-white` | `bg-background` | Main page background |
| `bg-gray-50` | `bg-muted` | Section backgrounds, subtle areas |
| `bg-gray-100` | `bg-muted` | Card backgrounds, input backgrounds |
| `bg-gray-200` | `bg-border` | Dividers, subtle separators |
| `bg-gray-800` | `bg-card` | Dark theme card backgrounds |
| `bg-gray-900` | `bg-background` | Dark theme main backgrounds |

#### Examples

```tsx
// ❌ Hardcoded colors
<div className="bg-white min-h-screen">
  <div className="bg-gray-50 p-6">
    <div className="bg-gray-100 rounded-lg p-4">
      Card content
    </div>
  </div>
</div>

// ✅ Theme-aware colors
<div className="bg-background min-h-screen">
  <div className="bg-muted p-6">
    <div className="bg-card rounded-lg p-4">
      Card content
    </div>
  </div>
</div>
```

### Border Colors

| Hardcoded Class | Theme-Aware Replacement | Usage Context |
|----------------|------------------------|---------------|
| `border-gray-200` | `border-border` | Standard borders, dividers |
| `border-gray-300` | `border-border` | Input borders, card borders |
| `border-gray-400` | `border-input` | Form input borders |

#### Examples

```tsx
// ❌ Hardcoded colors
<div className="border border-gray-200 rounded-lg">
  <input className="border border-gray-300 rounded px-3 py-2" />
</div>

// ✅ Theme-aware colors
<div className="border border-border rounded-lg">
  <input className="border border-input rounded px-3 py-2" />
</div>
```

## Semantic Color Usage

Semantic colors convey meaning and should include both light and dark mode variants for proper accessibility.

### Success Colors

```tsx
// ✅ Success states with dark mode variants
<div className="text-green-600 dark:text-green-400">
  ✓ Project activated successfully
</div>

<div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
  <h3 className="text-green-700 dark:text-green-300 font-medium">Success!</h3>
  <p className="text-green-600 dark:text-green-400">Your changes have been saved.</p>
</div>
```

### Warning Colors

```tsx
// ✅ Warning states with dark mode variants
<div className="text-amber-600 dark:text-amber-400">
  ⚠ Please review your timecard before submitting
</div>

<div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
  <h3 className="text-amber-700 dark:text-amber-300 font-medium">Warning</h3>
  <p className="text-amber-600 dark:text-amber-400">This action cannot be undone.</p>
</div>
```

### Error Colors

```tsx
// ✅ Error states with dark mode variants
<div className="text-red-600 dark:text-red-400">
  ✗ Failed to save changes
</div>

<div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
  <h3 className="text-red-700 dark:text-red-300 font-medium">Error</h3>
  <p className="text-red-600 dark:text-red-400">Please check your input and try again.</p>
</div>
```

### Info Colors

```tsx
// ✅ Info states with dark mode variants
<div className="text-blue-600 dark:text-blue-400">
  ℹ New features available in this update
</div>

<div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
  <h3 className="text-blue-700 dark:text-blue-300 font-medium">Information</h3>
  <p className="text-blue-600 dark:text-blue-400">Learn about the latest features.</p>
</div>
```

## Migration Workflow

### Step 1: Identify Hardcoded Colors

Use the color mapping utilities to scan your components:

```typescript
import { extractColorClasses, generateColorSuggestions } from '@/lib/color-mapping-utils';

const componentCode = `
  <div className="bg-gray-100 text-gray-800">
    <h1 className="text-gray-900">Title</h1>
    <p className="text-gray-600">Description</p>
  </div>
`;

const hardcodedColors = extractColorClasses(componentCode);
const suggestions = generateColorSuggestions(componentCode);
```

### Step 2: Apply Replacements

Replace hardcoded colors with theme-aware alternatives:

```tsx
// Before
<div className="bg-gray-100 text-gray-800">
  <h1 className="text-gray-900">Title</h1>
  <p className="text-gray-600">Description</p>
</div>

// After
<div className="bg-muted text-foreground">
  <h1 className="text-foreground">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Step 3: Test Theme Switching

Verify your changes work in both light and dark themes:

```tsx
import { render } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

// Test component in both themes
const TestWrapper = ({ theme, children }) => (
  <ThemeProvider attribute="class" defaultTheme={theme}>
    <div className={theme}>{children}</div>
  </ThemeProvider>
);

test('component works in light theme', () => {
  render(
    <TestWrapper theme="light">
      <YourComponent />
    </TestWrapper>
  );
});

test('component works in dark theme', () => {
  render(
    <TestWrapper theme="dark">
      <YourComponent />
    </TestWrapper>
  );
});
```

## Utility Functions

### Finding Color Replacements

```typescript
import { findColorReplacement, findSemanticColorReplacement } from '@/lib/color-mapping-utils';

// Find replacement for hardcoded color
const replacement = findColorReplacement('text-gray-600');
console.log(replacement?.themeAwareReplacement); // 'text-muted-foreground'

// Find semantic color replacement
const semanticReplacement = findSemanticColorReplacement('success', 'text-green-600');
console.log(semanticReplacement?.combined); // 'text-green-600 dark:text-green-400'
```

### Validating Theme Awareness

```typescript
import { isThemeAware } from '@/lib/color-mapping-utils';

console.log(isThemeAware('text-gray-600')); // false
console.log(isThemeAware('text-muted-foreground')); // true
console.log(isThemeAware('text-green-600 dark:text-green-400')); // true
```

### Component Priority Assessment

```typescript
import { getComponentPriority } from '@/lib/color-mapping-utils';

console.log(getComponentPriority('components/navigation/nav.tsx')); // 'high'
console.log(getComponentPriority('components/talent/form.tsx')); // 'medium'
console.log(getComponentPriority('components/debug/logger.tsx')); // 'low'
```

## Testing Theme Changes

### Manual Testing Checklist

1. **Theme Switching**: Verify component renders correctly in both themes
2. **Contrast Ratios**: Ensure text remains readable (use browser dev tools)
3. **Interactive States**: Test hover, focus, and active states
4. **Semantic Colors**: Verify success/warning/error states are distinguishable

### Automated Testing

```tsx
import { render, screen } from '@testing-library/react';
import { validateContrastRatio } from '@/lib/__tests__/contrast-validation';

test('maintains proper contrast ratios', async () => {
  render(<YourComponent />);
  
  const textElement = screen.getByText('Important text');
  const contrastRatio = await validateContrastRatio(textElement);
  
  expect(contrastRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA standard
});
```

## Common Patterns & Examples

### Form Components

```tsx
// ✅ Theme-aware form styling
<form className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-foreground mb-1">
      Project Name
    </label>
    <input
      type="text"
      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
      placeholder="Enter project name"
    />
  </div>
  
  <button
    type="submit"
    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
  >
    Create Project
  </button>
</form>
```

### Navigation Components

```tsx
// ✅ Theme-aware navigation
<nav className="bg-card border-b border-border">
  <div className="flex items-center justify-between px-4 py-3">
    <h1 className="text-lg font-semibold text-foreground">Talent Tracker</h1>
    
    <div className="flex space-x-4">
      <a
        href="/projects"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Projects
      </a>
      <a
        href="/talent"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Talent
      </a>
    </div>
  </div>
</nav>
```

### Status Indicators

```tsx
// ✅ Theme-aware status indicators
const StatusBadge = ({ status }: { status: 'active' | 'pending' | 'error' }) => {
  const statusStyles = {
    active: 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    pending: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    error: 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
```

## Troubleshooting

### Common Issues

#### 1. Colors Don't Change on Theme Switch

**Problem**: Colors remain the same when switching themes.

**Solution**: Ensure you're using theme-aware classes, not hardcoded colors:

```tsx
// ❌ Won't change with theme
<div className="text-gray-600">Text</div>

// ✅ Changes with theme
<div className="text-muted-foreground">Text</div>
```

#### 2. Poor Contrast in Dark Mode

**Problem**: Text is hard to read in dark mode.

**Solution**: Use semantic color variants with dark mode alternatives:

```tsx
// ❌ Poor contrast in dark mode
<div className="text-green-600">Success message</div>

// ✅ Good contrast in both themes
<div className="text-green-600 dark:text-green-400">Success message</div>
```

#### 3. Inconsistent Styling Across Components

**Problem**: Similar elements look different across components.

**Solution**: Use consistent theme tokens for similar purposes:

```tsx
// ✅ Consistent card styling
const cardClasses = "bg-card text-card-foreground border border-border rounded-lg p-4";

<div className={cardClasses}>Card 1</div>
<div className={cardClasses}>Card 2</div>
```

#### 4. Theme Flash on Page Load

**Problem**: Brief flash of wrong theme on initial load.

**Solution**: Ensure proper theme initialization in your app:

```tsx
// In your root layout
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Debugging Tips

1. **Use Browser Dev Tools**: Inspect computed styles to see actual color values
2. **Test Both Themes**: Always verify changes in both light and dark modes
3. **Check Contrast**: Use accessibility tools to validate contrast ratios
4. **Validate CSS Variables**: Ensure custom properties are properly defined

### Getting Help

- Check the [color mapping utilities](../lib/color-mapping-utils.ts) for automated suggestions
- Review existing theme-aware components for patterns
- Use the automated color audit tool to identify remaining hardcoded colors
- Test with the theme testing infrastructure in `lib/__tests__/`

## Best Practices Summary

1. **Always use theme-aware color tokens** instead of hardcoded colors
2. **Include dark mode variants** for semantic colors
3. **Test in both themes** before considering migration complete
4. **Maintain consistent patterns** across similar components
5. **Validate accessibility** with proper contrast ratios
6. **Use semantic meaning** - don't rely on color alone to convey information
7. **Leverage utility functions** to automate detection and replacement
8. **Document custom patterns** for team consistency

This guide should serve as your comprehensive reference for implementing theme-aware colors throughout the Talent Tracker application. Remember to always test your changes in both light and dark themes to ensure a consistent user experience.