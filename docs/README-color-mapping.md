# Color Mapping System Documentation

This directory contains comprehensive documentation and utilities for migrating the Talent Tracker application from hardcoded colors to a theme-aware color system.

## 📁 Documentation Structure

### Core Documentation
- **[color-mapping-guide.md](./color-mapping-guide.md)** - Complete developer guide with detailed explanations, patterns, and migration workflow
- **[color-cheat-sheet.md](./color-cheat-sheet.md)** - Quick reference for common color replacements and patterns
- **[color-usage-examples.tsx](./color-usage-examples.tsx)** - Comprehensive React component examples showing proper theme-aware color usage
- **[theme-color-developer-guidelines.md](./theme-color-developer-guidelines.md)** - Comprehensive developer guidelines for theme-aware color development
- **[component-theme-examples.md](./component-theme-examples.md)** - Detailed component examples with theme-aware implementations

### Maintenance Documentation
- **[color-audit-maintenance-guide.md](./color-audit-maintenance-guide.md)** - Complete guide for maintaining the color audit system
- **[../scripts/color-audit-README.md](../scripts/color-audit-README.md)** - Color audit system documentation and usage instructions

### Utilities
- **[../lib/color-mapping-utils.ts](../lib/color-mapping-utils.ts)** - TypeScript utilities for finding color replacements and validating theme awareness
- **[../scripts/color-migration-helper.js](../scripts/color-migration-helper.js)** - Command-line tool for analyzing components and generating migration suggestions
- **[../scripts/color-audit.js](../scripts/color-audit.js)** - Automated color audit system for codebase-wide analysis

## 🎯 Quick Start Guide

### 1. Analyze Your Component
```bash
# Analyze a single file
node scripts/color-migration-helper.js components/auth/login-form.tsx

# Analyze an entire directory
node scripts/color-migration-helper.js components/navigation/
```

### 2. Apply Replacements
Use the suggestions from the analysis tool to replace hardcoded colors:

```tsx
// Before (hardcoded)
<div className="bg-gray-100 text-gray-800">
  <h1 className="text-gray-900">Title</h1>
  <p className="text-gray-600">Description</p>
</div>

// After (theme-aware)
<div className="bg-muted text-foreground">
  <h1 className="text-foreground">Title</h1>
  <p className="text-muted-foreground">Description</p>
</div>
```

### 3. Add Dark Mode Variants for Semantic Colors
```tsx
// Before (no dark mode)
<div className="text-green-600">Success message</div>

// After (with dark mode)
<div className="text-green-600 dark:text-green-400">Success message</div>
```

### 4. Test Both Themes
Verify your component works correctly in both light and dark themes.

## 🎨 Color System Overview

### Theme Tokens
The application uses CSS custom properties that automatically adapt to light/dark themes:

- **`text-foreground`** - Primary text color
- **`text-muted-foreground`** - Secondary/helper text
- **`bg-background`** - Main background
- **`bg-card`** - Card/elevated surface background
- **`bg-muted`** - Subtle background for sections
- **`border-border`** - Standard border color
- **`border-input`** - Form input borders

### Semantic Colors
For success, warning, error, and info states, use color classes with dark mode variants:

```tsx
// Success: Green with proper contrast
className="text-green-600 dark:text-green-400"

// Warning: Amber with proper contrast  
className="text-amber-600 dark:text-amber-400"

// Error: Red with proper contrast
className="text-red-600 dark:text-red-400"

// Info: Blue with proper contrast
className="text-blue-600 dark:text-blue-400"
```

## 🛠️ Available Tools

### Color Mapping Utilities (`lib/color-mapping-utils.ts`)
```typescript
import { 
  findColorReplacement, 
  generateColorSuggestions,
  isThemeAware,
  extractColorClasses 
} from '@/lib/color-mapping-utils';

// Find replacement for hardcoded color
const replacement = findColorReplacement('text-gray-600');
// Returns: { themeAwareReplacement: 'text-muted-foreground', ... }

// Check if a color class is theme-aware
const isValid = isThemeAware('text-muted-foreground'); // true
const isInvalid = isThemeAware('text-gray-600'); // false
```

### Migration Helper Script (`scripts/color-migration-helper.js`)
```bash
# Get detailed analysis and suggestions
node scripts/color-migration-helper.js components/auth/login-form.tsx

# Analyze entire component directory
node scripts/color-migration-helper.js components/
```

## 📋 Migration Checklist

For each component you migrate:

- [ ] **Scan for hardcoded colors** using the migration helper script
- [ ] **Replace basic colors** (gray scales) with theme tokens
- [ ] **Add dark variants** to semantic colors (green, red, amber, blue)
- [ ] **Test in light theme** - verify appearance and contrast
- [ ] **Test in dark theme** - verify appearance and contrast  
- [ ] **Test interactive states** - hover, focus, active states
- [ ] **Validate accessibility** - ensure proper contrast ratios
- [ ] **Update tests** if component has theme-specific test cases

## 🎯 Priority Guidelines

### High Priority Components
- Navigation components (`components/navigation/`)
- Authentication forms (`components/auth/`)
- Project management (`components/projects/`)
- Main application pages (`app/(app)/`)

### Medium Priority Components  
- Talent management (`components/talent/`)
- UI components (`components/ui/`)
- Form components and hooks

### Low Priority Components
- Test utilities and debug components
- Documentation components
- Admin-only utilities

## 🧪 Testing Your Changes

### Manual Testing
1. **Theme Switching**: Toggle between light and dark themes
2. **Visual Inspection**: Check all text remains readable
3. **Interactive Elements**: Test hover, focus, and active states
4. **Semantic Colors**: Verify success/warning/error states are clear

### Automated Testing
```tsx
import { render } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

// Test component in both themes
test('component works in both themes', () => {
  const TestWrapper = ({ theme, children }) => (
    <ThemeProvider attribute="class" defaultTheme={theme}>
      <div className={theme}>{children}</div>
    </ThemeProvider>
  );

  // Test light theme
  render(
    <TestWrapper theme="light">
      <YourComponent />
    </TestWrapper>
  );

  // Test dark theme  
  render(
    <TestWrapper theme="dark">
      <YourComponent />
    </TestWrapper>
  );
});
```

## 🚨 Common Pitfalls

### ❌ Don't Do This
```tsx
// Hardcoded colors that won't adapt to themes
<div className="text-gray-600 bg-gray-100">

// Semantic colors without dark variants
<div className="text-green-600">Success!</div>

// Inconsistent color usage across similar elements
<button className="text-gray-700">Button 1</button>
<button className="text-gray-800">Button 2</button>
```

### ✅ Do This Instead
```tsx
// Theme-aware colors that adapt automatically
<div className="text-muted-foreground bg-muted">

// Semantic colors with proper dark variants
<div className="text-green-600 dark:text-green-400">Success!</div>

// Consistent color usage with semantic meaning
<button className="text-foreground">Button 1</button>
<button className="text-foreground">Button 2</button>
```

## 📚 Additional Resources

- **[Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)** - Official documentation
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Theme switching library
- **[WCAG Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)** - Accessibility guidelines
- **[shadcn/ui Theming](https://ui.shadcn.com/docs/theming)** - Design system theming approach

## 🤝 Contributing

When adding new components or modifying existing ones:

1. **Always use theme-aware colors** from the start
2. **Include dark mode variants** for semantic colors
3. **Test in both themes** before submitting
4. **Update documentation** if introducing new patterns
5. **Run the color audit** to ensure no hardcoded colors remain

## 📞 Getting Help

- Check the [color mapping guide](./color-mapping-guide.md) for detailed explanations
- Use the [migration helper script](../scripts/color-migration-helper.js) for automated analysis
- Review [usage examples](./color-usage-examples.tsx) for implementation patterns
- Refer to the [cheat sheet](./color-cheat-sheet.md) for quick replacements

---

This color mapping system ensures consistent, accessible, and maintainable theming across the entire Talent Tracker application. By following these guidelines and using the provided tools, you can efficiently migrate components to be fully theme-aware.