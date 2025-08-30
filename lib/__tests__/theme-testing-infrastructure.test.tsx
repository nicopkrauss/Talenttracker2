import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  renderWithLightTheme,
  renderWithDarkTheme,
  renderWithBothThemes,
  testComponentInBothThemes,
  simulateThemeSwitch,
  waitForThemeTransition
} from './theme-test-utils'
import {
  calculateContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  validateElementContrast,
  toHaveAccessibleContrast
} from './contrast-validation'
import {
  testThemeSwitching,
  testThemeSwitchingPerformance,
  detectLayoutShifts,
  validateThemeFunctionality
} from './visual-regression-utils'

// Extend Vitest matchers
expect.extend({
  toHaveAccessibleContrast
})

// Mock component for testing
function TestComponent({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-background text-foreground ${className}`}>
      <h1 className="text-2xl font-bold text-foreground">Test Heading</h1>
      <p className="text-muted-foreground">Test paragraph with muted text</p>
      <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
        Test Button
      </button>
      <div className="bg-card text-card-foreground p-2 border border-border">
        Card content
      </div>
    </div>
  )
}

describe('Theme Testing Infrastructure', () => {
  beforeEach(() => {
    // Reset DOM classes before each test
    document.documentElement.className = ''
  })

  describe('Theme Rendering Utilities', () => {
    it('should render component in light theme', () => {
      const { container } = renderWithLightTheme(<TestComponent />)
      
      expect(container.firstChild).toBeInTheDocument()
      expect(document.documentElement).not.toHaveClass('dark')
    })

    it('should render component in dark theme', () => {
      const { container } = renderWithDarkTheme(<TestComponent />)
      
      expect(container.firstChild).toBeInTheDocument()
      expect(container.querySelector('.dark')).toBeInTheDocument()
    })

    it('should render component in both themes', () => {
      const { light, dark } = renderWithBothThemes(<TestComponent />)
      
      expect(light.container.firstChild).toBeInTheDocument()
      expect(dark.container.firstChild).toBeInTheDocument()
      expect(dark.container.querySelector('.dark')).toBeInTheDocument()
      
      // Cleanup
      light.unmount()
      dark.unmount()
    })

    it('should test component in both themes with callback', async () => {
      const testFn = vi.fn()
      
      await testComponentInBothThemes(<TestComponent />, testFn)
      
      expect(testFn).toHaveBeenCalledTimes(2)
      expect(testFn).toHaveBeenCalledWith(expect.any(HTMLElement), 'light')
      expect(testFn).toHaveBeenCalledWith(expect.any(HTMLElement), 'dark')
    })
  })

  describe('Contrast Validation', () => {
    it('should calculate contrast ratio correctly', () => {
      const whiteBlackRatio = calculateContrastRatio('#ffffff', '#000000')
      expect(whiteBlackRatio).toBeCloseTo(21, 1)
      
      const grayRatio = calculateContrastRatio('#ffffff', '#767676')
      expect(grayRatio).toBeGreaterThan(4.5)
    })

    it('should validate WCAG AA compliance', () => {
      expect(meetsWCAGAA(4.5)).toBe(true)
      expect(meetsWCAGAA(4.4)).toBe(false)
      expect(meetsWCAGAA(3.0, true)).toBe(true) // Large text
      expect(meetsWCAGAA(2.9, true)).toBe(false)
    })

    it('should validate WCAG AAA compliance', () => {
      expect(meetsWCAGAAA(7.0)).toBe(true)
      expect(meetsWCAGAAA(6.9)).toBe(false)
      expect(meetsWCAGAAA(4.5, true)).toBe(true) // Large text
      expect(meetsWCAGAAA(4.4, true)).toBe(false)
    })

    it('should validate element contrast in light theme', () => {
      const { container } = renderWithLightTheme(<TestComponent />)
      const heading = container.querySelector('h1')
      
      if (heading) {
        const validation = validateElementContrast(heading)
        expect(validation.contrastRatio).toBeGreaterThan(0)
        expect(validation.textColor).toBeDefined()
        expect(validation.backgroundColor).toBeDefined()
      }
    })

    it('should validate element contrast in dark theme', () => {
      const { container } = renderWithDarkTheme(<TestComponent />)
      const heading = container.querySelector('h1')
      
      if (heading) {
        const validation = validateElementContrast(heading)
        expect(validation.contrastRatio).toBeGreaterThan(0)
        expect(validation.textColor).toBeDefined()
        expect(validation.backgroundColor).toBeDefined()
      }
    })
  })

  describe('Visual Regression Testing', () => {
    it('should detect theme differences', async () => {
      const result = await testThemeSwitching(<TestComponent />)
      
      expect(result.lightSnapshot.theme).toBe('light')
      expect(result.darkSnapshot.theme).toBe('dark')
      expect(result.comparison.hasDifferences).toBe(true)
    })

    it('should measure theme switching performance', async () => {
      const performance = await testThemeSwitchingPerformance(<TestComponent />)
      
      expect(performance.switchToLightTime).toBeGreaterThan(0)
      expect(performance.switchToDarkTime).toBeGreaterThan(0)
      expect(performance.averageSwitchTime).toBeGreaterThan(0)
      expect(performance.averageSwitchTime).toBeLessThan(1000) // Should be fast
    })

    it('should detect layout shifts during theme switching', async () => {
      const result = await detectLayoutShifts(<TestComponent />)
      
      expect(result.measurements.light).toBeDefined()
      expect(result.measurements.dark).toBeDefined()
      // Layout shifts should be minimal for well-designed components
    })

    it('should validate functionality in both themes', async () => {
      const functionalityTest = async (container: HTMLElement) => {
        const button = container.querySelector('button')
        expect(button).toBeInTheDocument()
        
        if (button) {
          await userEvent.click(button)
          // Button should be clickable in both themes
        }
      }
      
      const result = await validateThemeFunctionality(<TestComponent />, functionalityTest)
      
      expect(result.lightThemeWorks).toBe(true)
      expect(result.darkThemeWorks).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Theme Switching Simulation', () => {
    it('should simulate theme switching', async () => {
      simulateThemeSwitch('dark')
      expect(document.documentElement).toHaveClass('dark')
      
      simulateThemeSwitch('light')
      expect(document.documentElement).not.toHaveClass('dark')
    })

    it('should wait for theme transitions', async () => {
      const start = performance.now()
      await waitForThemeTransition()
      const end = performance.now()
      
      expect(end - start).toBeGreaterThanOrEqual(100) // Should wait at least 100ms
    })
  })

  describe('Integration Tests', () => {
    it('should test complete theme switching workflow', async () => {
      // Render component
      const { container } = render(<TestComponent />)
      
      // Test initial state (light theme)
      let heading = container.querySelector('h1')
      expect(heading).toBeInTheDocument()
      
      // Switch to dark theme
      simulateThemeSwitch('dark')
      await waitForThemeTransition()
      
      // Verify dark theme is applied
      expect(document.documentElement).toHaveClass('dark')
      
      // Switch back to light theme
      simulateThemeSwitch('light')
      await waitForThemeTransition()
      
      // Verify light theme is restored
      expect(document.documentElement).not.toHaveClass('dark')
    })

    it('should validate theme-aware components maintain accessibility', async () => {
      await testComponentInBothThemes(<TestComponent />, async (container, theme) => {
        const elements = container.querySelectorAll('h1, p, button')
        
        elements.forEach(element => {
          if (element instanceof HTMLElement) {
            const validation = validateElementContrast(element)
            expect(validation.contrastRatio).toBeGreaterThan(3) // Minimum for any text
            
            // For critical elements, ensure AA compliance
            if (element.tagName === 'H1' || element.tagName === 'BUTTON') {
              expect(validation.passes).toBe(true)
            }
          }
        })
      })
    })
  })
})