import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import {
  renderWithLightTheme,
  renderWithDarkTheme,
  testComponentInBothThemes,
  simulateThemeSwitch,
  waitForThemeTransition
} from './theme-test-utils'
import {
  calculateContrastRatio,
  meetsWCAGAA,
  validateElementContrast
} from './contrast-validation'

// Simple test component
function SimpleCard() {
  return (
    <div className="bg-card text-card-foreground p-4 border border-border">
      <h2 className="text-foreground font-bold">Card Title</h2>
      <p className="text-muted-foreground">Card description text</p>
      <button className="bg-primary text-primary-foreground px-3 py-1 rounded">
        Action
      </button>
    </div>
  )
}

describe('Theme Testing Infrastructure Demo', () => {
  describe('Basic Theme Rendering', () => {
    it('should render component in light theme', () => {
      renderWithLightTheme(<SimpleCard />)
      
      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card description text')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
    })

    it('should render component in dark theme', () => {
      renderWithDarkTheme(<SimpleCard />)
      
      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card description text')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
    })

    it('should apply dark class in dark theme', () => {
      const { container } = renderWithDarkTheme(<SimpleCard />)
      expect(container.querySelector('.dark')).toBeInTheDocument()
    })

    it('should not apply dark class in light theme', () => {
      const { container } = renderWithLightTheme(<SimpleCard />)
      expect(container.querySelector('.dark')).not.toBeInTheDocument()
    })
  })

  describe('Theme Testing Utilities', () => {
    it('should test component in both themes', async () => {
      const testResults: Array<{ theme: string; hasTitle: boolean }> = []
      
      await testComponentInBothThemes(<SimpleCard />, (container, theme) => {
        const title = container.querySelector('h2')
        testResults.push({
          theme,
          hasTitle: !!title
        })
      })
      
      expect(testResults).toHaveLength(2)
      expect(testResults[0].theme).toBe('light')
      expect(testResults[1].theme).toBe('dark')
      expect(testResults[0].hasTitle).toBe(true)
      expect(testResults[1].hasTitle).toBe(true)
    })

    it('should simulate theme switching', async () => {
      // Ensure clean start
      document.documentElement.classList.remove('dark')
      
      // Start with light theme
      expect(document.documentElement).not.toHaveClass('dark')
      
      // Switch to dark
      simulateThemeSwitch('dark')
      expect(document.documentElement).toHaveClass('dark')
      
      // Switch back to light
      simulateThemeSwitch('light')
      expect(document.documentElement).not.toHaveClass('dark')
    })

    it('should wait for theme transitions', async () => {
      const start = performance.now()
      await waitForThemeTransition()
      const end = performance.now()
      
      expect(end - start).toBeGreaterThanOrEqual(100)
    })
  })

  describe('Contrast Validation Functions', () => {
    it('should calculate contrast ratios correctly', () => {
      // Test high contrast
      const highContrast = calculateContrastRatio('#000000', '#ffffff')
      expect(highContrast).toBeCloseTo(21, 1)
      
      // Test medium contrast
      const mediumContrast = calculateContrastRatio('#666666', '#ffffff')
      expect(mediumContrast).toBeGreaterThan(4)
      
      // Test low contrast
      const lowContrast = calculateContrastRatio('#cccccc', '#ffffff')
      expect(lowContrast).toBeLessThan(3)
    })

    it('should validate WCAG compliance', () => {
      expect(meetsWCAGAA(4.5)).toBe(true)
      expect(meetsWCAGAA(4.4)).toBe(false)
      expect(meetsWCAGAA(3.0, true)).toBe(true) // Large text
    })

    it('should validate element contrast', () => {
      const { container } = renderWithLightTheme(<SimpleCard />)
      const title = container.querySelector('h2')
      
      if (title) {
        const validation = validateElementContrast(title)
        expect(validation.contrastRatio).toBeGreaterThan(0)
        expect(validation.textColor).toBeDefined()
        expect(validation.backgroundColor).toBeDefined()
      }
    })
  })

  describe('Theme-Aware Component Testing', () => {
    it('should use semantic CSS classes', () => {
      const { container } = renderWithLightTheme(<SimpleCard />)
      
      // Check for theme-aware classes
      expect(container.querySelector('[class*="bg-card"]')).toBeInTheDocument()
      expect(container.querySelector('[class*="text-foreground"]')).toBeInTheDocument()
      expect(container.querySelector('[class*="text-muted-foreground"]')).toBeInTheDocument()
      expect(container.querySelector('[class*="bg-primary"]')).toBeInTheDocument()
    })

    it('should not use hardcoded color classes', () => {
      const { container } = renderWithLightTheme(<SimpleCard />)
      
      // Check that no hardcoded colors are used
      const hardcodedElements = container.querySelectorAll(
        '[class*="text-gray"], [class*="bg-gray"], [class*="text-slate"], [class*="bg-slate"]'
      )
      expect(hardcodedElements).toHaveLength(0)
    })

    it('should maintain structure in both themes', async () => {
      await testComponentInBothThemes(<SimpleCard />, (container) => {
        expect(container.querySelector('h2')).toBeInTheDocument()
        expect(container.querySelector('p')).toBeInTheDocument()
        expect(container.querySelector('button')).toBeInTheDocument()
      })
    })
  })

  describe('Integration Testing', () => {
    it('should demonstrate complete theme testing workflow', async () => {
      // 1. Render in light theme
      const { container: lightContainer } = renderWithLightTheme(<SimpleCard />)
      expect(lightContainer.querySelector('h2')).toBeInTheDocument()
      
      // 2. Render in dark theme
      const { container: darkContainer } = renderWithDarkTheme(<SimpleCard />)
      expect(darkContainer.querySelector('.dark')).toBeInTheDocument()
      
      // 3. Test theme switching simulation
      simulateThemeSwitch('dark')
      expect(document.documentElement).toHaveClass('dark')
      
      await waitForThemeTransition()
      
      simulateThemeSwitch('light')
      expect(document.documentElement).not.toHaveClass('dark')
      
      // 4. Validate contrast calculations work
      const contrastRatio = calculateContrastRatio('#000000', '#ffffff')
      expect(contrastRatio).toBeGreaterThan(7) // Should meet AAA standards
      
      // 5. Test both themes with callback
      let themeCount = 0
      await testComponentInBothThemes(<SimpleCard />, (container, theme) => {
        themeCount++
        expect(['light', 'dark']).toContain(theme)
        expect(container.querySelector('h2')).toBeInTheDocument()
      })
      expect(themeCount).toBe(2)
    })
  })
})