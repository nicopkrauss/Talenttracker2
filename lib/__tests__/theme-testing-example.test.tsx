import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  renderWithLightTheme,
  renderWithDarkTheme,
  testComponentInBothThemes
} from './theme-test-utils'
import {
  testThemeSwitching,
  detectLayoutShifts,
  validateThemeFunctionality
} from './visual-regression-utils'
import { validateElementContrast } from './contrast-validation'

// Example component that uses theme-aware colors
function ExampleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground mb-4">{description}</p>
      <div className="flex gap-2">
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
          Primary Action
        </button>
        <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90">
          Secondary Action
        </button>
      </div>
      <div className="mt-4 p-3 bg-muted rounded-md">
        <p className="text-sm text-muted-foreground">
          This is a muted information section
        </p>
      </div>
    </div>
  )
}

describe('Theme Testing Example - Card Component', () => {
  const cardProps = {
    title: 'Example Card',
    description: 'This is an example card component for testing theme functionality.'
  }

  describe('Basic Theme Rendering', () => {
    it('should render correctly in light theme', () => {
      renderWithLightTheme(<ExampleCard {...cardProps} />)
      
      expect(screen.getByText('Example Card')).toBeInTheDocument()
      expect(screen.getByText('Primary Action')).toBeInTheDocument()
      expect(screen.getByText('Secondary Action')).toBeInTheDocument()
    })

    it('should render correctly in dark theme', () => {
      renderWithDarkTheme(<ExampleCard {...cardProps} />)
      
      expect(screen.getByText('Example Card')).toBeInTheDocument()
      expect(screen.getByText('Primary Action')).toBeInTheDocument()
      expect(screen.getByText('Secondary Action')).toBeInTheDocument()
    })
  })

  describe('Contrast Validation', () => {
    it('should have accessible contrast ratios in light theme', () => {
      const { container } = renderWithLightTheme(<ExampleCard {...cardProps} />)
      
      // Test heading contrast
      const heading = screen.getByText('Example Card')
      expect(heading).toHaveAccessibleContrast('AA')
      
      // Test button contrast
      const primaryButton = screen.getByText('Primary Action')
      expect(primaryButton).toHaveAccessibleContrast('AA')
      
      // Test muted text (may have lower contrast, but should still be readable)
      const mutedText = screen.getByText('This is a muted information section')
      const validation = validateElementContrast(mutedText)
      expect(validation.contrastRatio).toBeGreaterThan(3) // At least 3:1 for muted text
    })

    it('should have accessible contrast ratios in dark theme', () => {
      const { container } = renderWithDarkTheme(<ExampleCard {...cardProps} />)
      
      // Test heading contrast
      const heading = screen.getByText('Example Card')
      expect(heading).toHaveAccessibleContrast('AA')
      
      // Test button contrast
      const primaryButton = screen.getByText('Primary Action')
      expect(primaryButton).toHaveAccessibleContrast('AA')
      
      // Test muted text
      const mutedText = screen.getByText('This is a muted information section')
      const validation = validateElementContrast(mutedText)
      expect(validation.contrastRatio).toBeGreaterThan(3)
    })

    it('should maintain contrast ratios across both themes', async () => {
      await testComponentInBothThemes(<ExampleCard {...cardProps} />, (container, theme) => {
        const heading = container.querySelector('h2')
        const primaryButton = container.querySelector('button')
        
        if (heading) {
          const headingValidation = validateElementContrast(heading)
          expect(headingValidation.passes).toBe(true)
          expect(headingValidation.contrastRatio).toBeGreaterThan(4.5)
        }
        
        if (primaryButton) {
          const buttonValidation = validateElementContrast(primaryButton)
          expect(buttonValidation.passes).toBe(true)
          expect(buttonValidation.contrastRatio).toBeGreaterThan(4.5)
        }
      })
    })
  })

  describe('Visual Regression Testing', () => {
    it('should have visual differences between light and dark themes', async () => {
      const result = await testThemeSwitching(<ExampleCard {...cardProps} />)
      
      expect(result.comparison.hasDifferences).toBe(true)
      expect(result.comparison.differences.length).toBeGreaterThan(0)
      
      // Should have different background colors
      const backgroundDiff = result.comparison.differences.find(
        diff => diff.property.includes('background')
      )
      expect(backgroundDiff).toBeDefined()
    })

    it('should not have layout shifts when switching themes', async () => {
      const result = await detectLayoutShifts(<ExampleCard {...cardProps} />)
      
      // Card should maintain same dimensions in both themes
      expect(result.hasLayoutShift).toBe(false)
      expect(result.measurements.light.width).toBe(result.measurements.dark.width)
      expect(result.measurements.light.height).toBe(result.measurements.dark.height)
    })
  })

  describe('Functionality Testing', () => {
    it('should maintain button functionality in both themes', async () => {
      const functionalityTest = async (container: HTMLElement) => {
        const primaryButton = container.querySelector('button')
        const secondaryButton = container.querySelectorAll('button')[1]
        
        expect(primaryButton).toBeInTheDocument()
        expect(secondaryButton).toBeInTheDocument()
        
        // Buttons should be clickable
        if (primaryButton) {
          await userEvent.click(primaryButton)
          // In a real test, you'd verify the click handler was called
        }
        
        if (secondaryButton) {
          await userEvent.click(secondaryButton)
          // In a real test, you'd verify the click handler was called
        }
      }
      
      const result = await validateThemeFunctionality(<ExampleCard {...cardProps} />, functionalityTest)
      
      expect(result.lightThemeWorks).toBe(true)
      expect(result.darkThemeWorks).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should have proper hover states in both themes', async () => {
      await testComponentInBothThemes(<ExampleCard {...cardProps} />, async (container, theme) => {
        const primaryButton = container.querySelector('button')
        
        if (primaryButton) {
          // Simulate hover
          await userEvent.hover(primaryButton)
          
          // In a real test, you'd verify hover styles are applied
          const computedStyle = window.getComputedStyle(primaryButton)
          expect(computedStyle).toBeDefined()
          
          // Simulate unhover
          await userEvent.unhover(primaryButton)
        }
      })
    })
  })

  describe('Semantic Color Usage', () => {
    it('should use semantic color tokens correctly', () => {
      const { container } = renderWithLightTheme(<ExampleCard {...cardProps} />)
      
      // Check that component uses theme-aware classes
      const card = container.querySelector('[class*="bg-card"]')
      const heading = container.querySelector('[class*="text-foreground"]')
      const mutedText = container.querySelector('[class*="text-muted-foreground"]')
      const primaryButton = container.querySelector('[class*="bg-primary"]')
      
      expect(card).toBeInTheDocument()
      expect(heading).toBeInTheDocument()
      expect(mutedText).toBeInTheDocument()
      expect(primaryButton).toBeInTheDocument()
    })

    it('should not use hardcoded color classes', () => {
      const { container } = renderWithLightTheme(<ExampleCard {...cardProps} />)
      
      // Check that no hardcoded gray colors are used
      const hardcodedColors = container.querySelectorAll('[class*="text-gray"], [class*="bg-gray"]')
      expect(hardcodedColors).toHaveLength(0)
    })
  })
})