# Theme Testing Infrastructure

This directory contains comprehensive testing utilities for validating theme functionality, accessibility, and visual consistency across light and dark themes.

## Overview

The theme testing infrastructure provides three main categories of utilities:

1. **Theme Rendering Utilities** (`theme-test-utils.ts`) - Render components in specific themes
2. **Contrast Validation** (`contrast-validation.ts`) - Validate WCAG accessibility compliance
3. **Visual Regression Testing** (`visual-regression-utils.ts`) - Detect visual changes and layout shifts

## Quick Start

```typescript
import {
  renderWithLightTheme,
  renderWithDarkTheme,
  testComponentInBothThemes
} from './theme-test-utils'
import { validateElementContrast } from './contrast-validation'
import { testThemeSwitching } from './visual-regression-utils'

// Basic theme rendering
const { container } = renderWithLightTheme(<MyComponent />)
const { container: darkContainer } = renderWithDarkTheme(<MyComponent />)

// Test both themes with a callback
await testComponentInBothThemes(<MyComponent />, (container, theme) => {
  const heading = container.querySelector('h1')
  expect(heading).toHaveAccessibleContrast('AA')
})

// Visual regression testing
const result = await testThemeSwitching(<MyComponent />)
expect(result.comparison.hasDifferences).toBe(true)
```

## Theme Rendering Utilities

### `renderWithLightTheme(ui, options?)`
Renders a component wrapped in a ThemeProvider with light theme forced.

### `renderWithDarkTheme(ui, options?)`
Renders a component wrapped in a ThemeProvider with dark theme forced.

### `renderWithBothThemes(ui, options?)`
Returns both light and dark renders for comparison testing.

### `testComponentInBothThemes(ui, testFn)`
Executes a test function against both light and dark theme renders.

### `simulateThemeSwitch(theme)`
Programmatically switches the document theme by adding/removing the `dark` class.

## Contrast Validation

### `calculateContrastRatio(color1, color2)`
Calculates the WCAG contrast ratio between two colors.

### `meetsWCAGAA(ratio, isLargeText?)` / `meetsWCAGAAA(ratio, isLargeText?)`
Checks if a contrast ratio meets WCAG AA or AAA standards.

### `validateElementContrast(element, standard?)`
Validates the contrast ratio of an element against its background.

### Custom Matcher: `toHaveAccessibleContrast(standard?)`
Jest/Vitest matcher for asserting accessible contrast ratios.

```typescript
expect(element).toHaveAccessibleContrast('AA')
expect(element).toHaveAccessibleContrast('AAA')
```

## Visual Regression Testing

### `testThemeSwitching(ui, options?)`
Captures snapshots of a component in both themes and compares them.

### `testThemeSwitchingPerformance(ui)`
Measures the performance of theme switching operations.

### `detectLayoutShifts(ui)`
Detects if theme switching causes layout shifts (CLS).

### `validateThemeFunctionality(ui, testFn)`
Ensures component functionality works in both themes.

## Best Practices

### 1. Test All Interactive Elements
```typescript
it('should maintain button functionality in both themes', async () => {
  await testComponentInBothThemes(<MyButton />, async (container) => {
    const button = container.querySelector('button')
    await userEvent.click(button)
    // Verify click handler was called
  })
})
```

### 2. Validate Contrast Ratios
```typescript
it('should have accessible contrast in both themes', async () => {
  await testComponentInBothThemes(<MyComponent />, (container) => {
    const text = container.querySelector('p')
    expect(text).toHaveAccessibleContrast('AA')
  })
})
```

### 3. Check for Layout Shifts
```typescript
it('should not cause layout shifts when switching themes', async () => {
  const result = await detectLayoutShifts(<MyComponent />)
  expect(result.hasLayoutShift).toBe(false)
})
```

### 4. Verify Visual Differences
```typescript
it('should have visual differences between themes', async () => {
  const result = await testThemeSwitching(<MyComponent />)
  expect(result.comparison.hasDifferences).toBe(true)
  
  // Should have different background colors
  const bgDiff = result.comparison.differences.find(
    diff => diff.property.includes('background')
  )
  expect(bgDiff).toBeDefined()
})
```

### 5. Test Semantic Color Usage
```typescript
it('should use semantic color tokens', () => {
  const { container } = renderWithLightTheme(<MyComponent />)
  
  // Should use theme-aware classes
  expect(container.querySelector('[class*="bg-card"]')).toBeInTheDocument()
  expect(container.querySelector('[class*="text-foreground"]')).toBeInTheDocument()
  
  // Should not use hardcoded colors
  const hardcoded = container.querySelectorAll('[class*="text-gray"], [class*="bg-gray"]')
  expect(hardcoded).toHaveLength(0)
})
```

## Common Test Patterns

### Complete Theme Testing Suite
```typescript
describe('MyComponent Theme Testing', () => {
  describe('Rendering', () => {
    it('should render in light theme', () => {
      renderWithLightTheme(<MyComponent />)
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('should render in dark theme', () => {
      renderWithDarkTheme(<MyComponent />)
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible contrast ratios', async () => {
      await testComponentInBothThemes(<MyComponent />, (container) => {
        const elements = container.querySelectorAll('h1, p, button')
        elements.forEach(el => {
          expect(el).toHaveAccessibleContrast('AA')
        })
      })
    })
  })

  describe('Visual Regression', () => {
    it('should have theme differences without layout shifts', async () => {
      const [themeResult, layoutResult] = await Promise.all([
        testThemeSwitching(<MyComponent />),
        detectLayoutShifts(<MyComponent />)
      ])
      
      expect(themeResult.comparison.hasDifferences).toBe(true)
      expect(layoutResult.hasLayoutShift).toBe(false)
    })
  })

  describe('Functionality', () => {
    it('should work in both themes', async () => {
      const result = await validateThemeFunctionality(<MyComponent />, async (container) => {
        // Test component functionality
        const button = container.querySelector('button')
        await userEvent.click(button)
      })
      
      expect(result.lightThemeWorks).toBe(true)
      expect(result.darkThemeWorks).toBe(true)
    })
  })
})
```

## Integration with CI/CD

Add theme testing to your test scripts:

```json
{
  "scripts": {
    "test:theme": "vitest run --reporter=verbose lib/__tests__/*theme*.test.ts",
    "test:accessibility": "vitest run --reporter=verbose lib/__tests__/*contrast*.test.ts"
  }
}
```

## Troubleshooting

### Common Issues

1. **Hydration Mismatches**: Use `suppressHydrationWarning` in theme providers
2. **CSS Custom Properties Not Loading**: Ensure globals.css is imported in tests
3. **Theme Not Switching**: Check that `dark` class is properly applied to test containers
4. **Contrast Validation Failing**: Verify that CSS custom properties are resolved correctly

### Debug Utilities

```typescript
// Debug computed styles
import { getComputedThemeStyles } from './theme-test-utils'

const styles = getComputedThemeStyles(element)
console.log('Theme styles:', styles)

// Debug contrast calculations
import { validateElementContrast } from './contrast-validation'

const validation = validateElementContrast(element)
console.log('Contrast validation:', validation)
```