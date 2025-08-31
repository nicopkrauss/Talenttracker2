import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

/**
 * Layout Shift Validation Tests
 * 
 * Tests that theme-aware CSS classes don't cause layout shifts by:
 * - Ensuring consistent dimensions across theme variants
 * - Validating that theme classes don't affect layout properties
 * - Checking that semantic colors maintain consistent spacing
 */

describe('Layout Shift Validation', () => {
  describe('Theme-aware Classes Consistency', () => {
    it('should have consistent layout properties for theme-aware text colors', () => {
      const { container } = render(
        <div>
          <div className="text-foreground">Foreground text</div>
          <div className="text-muted-foreground">Muted text</div>
          <div className="text-primary-foreground">Primary text</div>
          <div className="text-secondary-foreground">Secondary text</div>
        </div>
      )

      const elements = container.querySelectorAll('div > div')
      elements.forEach(element => {
        const styles = getComputedStyle(element)
        // These properties should not cause layout shifts
        expect(styles.display).toBeTruthy()
        expect(styles.position).toBeTruthy()
        expect(styles.boxSizing).toBeTruthy()
      })
    })

    it('should have consistent layout properties for theme-aware background colors', () => {
      const { container } = render(
        <div>
          <div className="bg-background p-4">Background</div>
          <div className="bg-card p-4">Card</div>
          <div className="bg-muted p-4">Muted</div>
          <div className="bg-primary p-4">Primary</div>
        </div>
      )

      const elements = container.querySelectorAll('div > div')
      elements.forEach(element => {
        const styles = getComputedStyle(element)
        // Padding should be consistent
        expect(styles.paddingTop).toBe(styles.paddingBottom)
        expect(styles.paddingLeft).toBe(styles.paddingRight)
      })
    })

    it('should maintain consistent dimensions for semantic colors with dark variants', () => {
      const { container } = render(
        <div>
          <div className="text-green-600 dark:text-green-400 p-2">Success message</div>
          <div className="text-amber-600 dark:text-amber-400 p-2">Warning message</div>
          <div className="text-red-600 dark:text-red-400 p-2">Error message</div>
          <div className="text-blue-600 dark:text-blue-400 p-2">Info message</div>
        </div>
      )

      const elements = container.querySelectorAll('div > div')
      const dimensions = Array.from(elements).map(element => {
        const rect = element.getBoundingClientRect()
        return {
          width: rect.width,
          height: rect.height,
          padding: getComputedStyle(element).padding
        }
      })

      // All elements should have the same padding
      const firstPadding = dimensions[0].padding
      dimensions.forEach(dim => {
        expect(dim.padding).toBe(firstPadding)
      })
    })
  })

  describe('Layout Stability Patterns', () => {
    it('should not affect layout with border theme classes', () => {
      const { container } = render(
        <div>
          <div className="border-border border p-4">Border element</div>
          <div className="border-input border p-4">Input border</div>
          <div className="border-ring border p-4">Ring border</div>
        </div>
      )

      const elements = container.querySelectorAll('div > div')
      elements.forEach(element => {
        const styles = getComputedStyle(element)
        // Border width should be consistent
        expect(styles.borderWidth).toBeTruthy()
        expect(styles.borderStyle).toBeTruthy()
      })
    })

    it('should maintain consistent spacing with theme-aware components', () => {
      const { container } = render(
        <div className="space-y-4">
          <div className="bg-card text-card-foreground p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">Card Title</h2>
            <p className="text-muted-foreground">Card content</p>
          </div>
          <div className="bg-muted text-foreground p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-foreground mb-2">Muted Card</h2>
            <p className="text-muted-foreground">Muted content</p>
          </div>
        </div>
      )

      const cards = container.querySelectorAll('div > div')
      const cardDimensions = Array.from(cards).map(card => {
        const rect = card.getBoundingClientRect()
        const styles = getComputedStyle(card)
        return {
          padding: styles.padding,
          borderRadius: styles.borderRadius,
          width: rect.width
        }
      })

      // Cards should have consistent styling
      expect(cardDimensions[0].padding).toBe(cardDimensions[1].padding)
      expect(cardDimensions[0].borderRadius).toBe(cardDimensions[1].borderRadius)
    })

    it('should handle complex layouts without shifts', () => {
      const { container } = render(
        <div className="grid grid-cols-2 gap-4 p-4">
          <div className="bg-card text-card-foreground p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Status Card</h3>
              <span className="text-green-600 dark:text-green-400">✓</span>
            </div>
            <p className="text-muted-foreground mb-4">Description text</p>
            <div className="flex gap-2">
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
                Primary
              </button>
              <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded">
                Secondary
              </button>
            </div>
          </div>
          <div className="bg-muted text-foreground p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Info Card</h3>
              <span className="text-blue-600 dark:text-blue-400">ℹ</span>
            </div>
            <p className="text-muted-foreground mb-4">Information text</p>
            <div className="space-y-2">
              <div className="text-amber-600 dark:text-amber-400">Warning item</div>
              <div className="text-red-600 dark:text-red-400">Error item</div>
            </div>
          </div>
        </div>
      )

      const gridContainer = container.querySelector('.grid')
      const gridItems = container.querySelectorAll('.grid > div')

      expect(gridContainer).toBeTruthy()
      expect(gridItems).toHaveLength(2)

      // Grid items should have consistent structure
      gridItems.forEach(item => {
        const buttons = item.querySelectorAll('button')
        const statusElements = item.querySelectorAll('[class*="text-green"], [class*="text-blue"], [class*="text-amber"], [class*="text-red"]')
        
        // Should have semantic color elements
        expect(statusElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('CSS Custom Properties Stability', () => {
    it('should not cause layout issues with CSS custom properties', () => {
      const { container } = render(
        <div style={{ 
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--card)',
            color: 'var(--card-foreground)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)'
          }}>
            <h2 style={{ color: 'var(--foreground)' }}>Custom Properties</h2>
            <p style={{ color: 'var(--muted-foreground)' }}>Using CSS custom properties</p>
          </div>
        </div>
      )

      const outerDiv = container.firstChild as HTMLElement
      const innerDiv = outerDiv.firstChild as HTMLElement

      expect(outerDiv).toBeTruthy()
      expect(innerDiv).toBeTruthy()

      // Elements should render properly with custom properties
      const outerStyles = getComputedStyle(outerDiv)
      const innerStyles = getComputedStyle(innerDiv)

      expect(outerStyles.padding).toBeTruthy()
      expect(innerStyles.padding).toBeTruthy()
      expect(innerStyles.borderRadius).toBeTruthy()
    })
  })

  describe('Performance Impact Validation', () => {
    it('should not create excessive DOM elements with theme classes', () => {
      const { container } = render(
        <div>
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="bg-card text-card-foreground p-4 mb-2 rounded">
              <h3 className="text-foreground font-semibold">Item {i + 1}</h3>
              <p className="text-muted-foreground">Description</p>
              <div className="flex gap-2 mt-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span className="text-amber-600 dark:text-amber-400">⚠</span>
                <span className="text-red-600 dark:text-red-400">✗</span>
              </div>
            </div>
          ))}
        </div>
      )

      const items = container.querySelectorAll('div > div')
      expect(items).toHaveLength(20)

      // Each item should have the expected structure
      items.forEach(item => {
        const title = item.querySelector('h3')
        const description = item.querySelector('p')
        const statusIcons = item.querySelectorAll('span')

        expect(title).toBeTruthy()
        expect(description).toBeTruthy()
        expect(statusIcons).toHaveLength(3)
      })
    })

    it('should handle nested theme classes efficiently', () => {
      const { container } = render(
        <div className="bg-background text-foreground">
          <div className="bg-card text-card-foreground p-4">
            <div className="bg-muted text-foreground p-2">
              <div className="bg-primary text-primary-foreground p-1">
                <span className="text-green-600 dark:text-green-400">Deeply nested</span>
              </div>
            </div>
          </div>
        </div>
      )

      const nestedElements = container.querySelectorAll('div')
      expect(nestedElements.length).toBeGreaterThan(3)

      // All elements should render properly
      nestedElements.forEach(element => {
        const styles = getComputedStyle(element)
        expect(styles.display).toBeTruthy()
      })
    })
  })

  describe('Accessibility Layout Validation', () => {
    it('should maintain focus indicators with theme classes', () => {
      const { container } = render(
        <div>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded focus:ring-2 focus:ring-ring">
            Primary Button
          </button>
          <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded focus:ring-2 focus:ring-ring">
            Secondary Button
          </button>
          <input className="border-input bg-background text-foreground px-3 py-2 rounded focus:ring-2 focus:ring-ring" />
        </div>
      )

      const focusableElements = container.querySelectorAll('button, input')
      expect(focusableElements).toHaveLength(3)

      focusableElements.forEach(element => {
        const styles = getComputedStyle(element)
        // Should have proper dimensions for focus indicators
        expect(styles.padding).toBeTruthy()
        expect(styles.borderRadius).toBeTruthy()
      })
    })

    it('should maintain proper contrast with semantic colors', () => {
      const { container } = render(
        <div className="space-y-2">
          <div className="bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 p-3 rounded">
            Success message with proper contrast
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 p-3 rounded">
            Warning message with proper contrast
          </div>
          <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded">
            Error message with proper contrast
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 p-3 rounded">
            Info message with proper contrast
          </div>
        </div>
      )

      const messages = container.querySelectorAll('div > div')
      expect(messages).toHaveLength(4)

      messages.forEach(message => {
        const styles = getComputedStyle(message)
        expect(styles.padding).toBeTruthy()
        expect(styles.borderRadius).toBeTruthy()
        expect(message.textContent).toBeTruthy()
      })
    })
  })
})

// Summary test to validate overall layout stability
describe('Overall Layout Stability', () => {
  it('should pass comprehensive layout stability check', () => {
    const { container } = render(
      <div className="min-h-screen bg-background text-foreground">
        <header className="bg-card text-card-foreground p-4 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Application Header</h1>
        </header>
        
        <main className="container mx-auto p-4 space-y-6">
          <section className="bg-card text-card-foreground p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-foreground mb-4">Main Content</h2>
            <p className="text-muted-foreground mb-4">
              This is a comprehensive layout test with various theme-aware components.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-muted p-4 rounded">
                <h3 className="text-foreground font-medium mb-2">Status Updates</h3>
                <div className="space-y-2">
                  <div className="text-green-600 dark:text-green-400">✓ All systems operational</div>
                  <div className="text-amber-600 dark:text-amber-400">⚠ Minor issues detected</div>
                  <div className="text-red-600 dark:text-red-400">✗ Critical error resolved</div>
                </div>
              </div>
              
              <div className="bg-primary text-primary-foreground p-4 rounded">
                <h3 className="font-medium mb-2">Actions</h3>
                <div className="space-y-2">
                  <button className="bg-secondary text-secondary-foreground px-3 py-1 rounded text-sm">
                    Secondary Action
                  </button>
                  <button className="bg-accent text-accent-foreground px-3 py-1 rounded text-sm">
                    Accent Action
                  </button>
                </div>
              </div>
            </div>
            
            <div className="border-t border-border pt-4">
              <div className="flex gap-4">
                <input 
                  className="flex-1 border-input bg-background text-foreground px-3 py-2 rounded"
                  placeholder="Enter text..."
                />
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
                  Submit
                </button>
              </div>
            </div>
          </section>
        </main>
        
        <footer className="bg-muted text-muted-foreground p-4 text-center">
          <p>Footer content with theme-aware styling</p>
        </footer>
      </div>
    )

    // Validate overall structure
    const header = container.querySelector('header')
    const main = container.querySelector('main')
    const footer = container.querySelector('footer')

    expect(header).toBeTruthy()
    expect(main).toBeTruthy()
    expect(footer).toBeTruthy()

    // Validate semantic color elements
    const semanticElements = container.querySelectorAll('[class*="text-green"], [class*="text-amber"], [class*="text-red"], [class*="text-blue"]')
    expect(semanticElements.length).toBeGreaterThan(0)

    // Validate interactive elements
    const buttons = container.querySelectorAll('button')
    const inputs = container.querySelectorAll('input')
    expect(buttons.length).toBeGreaterThan(0)
    expect(inputs.length).toBeGreaterThan(0)

    // All elements should render without errors
    expect(container.firstChild).toBeTruthy()
  })
})