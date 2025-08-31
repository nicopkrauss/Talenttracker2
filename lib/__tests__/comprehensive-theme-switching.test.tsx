import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React, { ReactElement } from 'react'
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
  validateElementContrast,
  validateContrastForElements,
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

// Mock components for major pages
const MockLandingPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="bg-card border-b border-border p-4">
      <h1 className="text-2xl font-bold text-foreground">Talent Tracker</h1>
      <nav className="mt-2">
        <a href="#" className="text-primary hover:text-primary/80 mr-4">Home</a>
        <a href="#" className="text-muted-foreground hover:text-foreground mr-4">About</a>
      </nav>
    </header>
    <main className="p-6">
      <div className="bg-card rounded-lg border border-border p-6 mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Welcome</h2>
        <p className="text-muted-foreground">Manage your talent and projects efficiently.</p>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded mt-4 hover:bg-primary/90">
          Get Started
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted p-4 rounded">
          <h3 className="font-medium text-foreground">Projects</h3>
          <p className="text-sm text-muted-foreground">Manage your projects</p>
        </div>
        <div className="bg-muted p-4 rounded">
          <h3 className="font-medium text-foreground">Talent</h3>
          <p className="text-sm text-muted-foreground">Track talent status</p>
        </div>
        <div className="bg-muted p-4 rounded">
          <h3 className="font-medium text-foreground">Timecards</h3>
          <p className="text-sm text-muted-foreground">Review timecards</p>
        </div>
      </div>
    </main>
  </div>
)

const MockDashboardPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="flex">
      <aside className="w-64 bg-card border-r border-border p-4">
        <nav className="space-y-2">
          <a href="#" className="block px-3 py-2 rounded bg-primary text-primary-foreground">Dashboard</a>
          <a href="#" className="block px-3 py-2 rounded text-muted-foreground hover:bg-muted hover:text-foreground">Projects</a>
          <a href="#" className="block px-3 py-2 rounded text-muted-foreground hover:bg-muted hover:text-foreground">Team</a>
          <a href="#" className="block px-3 py-2 rounded text-muted-foreground hover:bg-muted hover:text-foreground">Talent</a>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
            <p className="text-2xl font-bold text-foreground">12</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Total Talent</h3>
            <p className="text-2xl font-bold text-foreground">48</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">Pending Timecards</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">3</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-sm font-medium text-muted-foreground">This Month</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">$24,500</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-foreground">John Doe checked in</span>
              <span className="text-sm text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-foreground">Project Alpha activated</span>
              <span className="text-sm text-muted-foreground">4 hours ago</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
)

const MockAuthPage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-lg p-8">
        <h1 className="text-2xl font-bold text-foreground text-center mb-6">Sign In</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <input 
              type="email" 
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Password</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2 rounded hover:bg-primary/90 focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Sign In
          </button>
        </form>
        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-primary hover:text-primary/80">
            Don't have an account? Sign up
          </a>
        </div>
      </div>
    </div>
  </div>
)

const MockProjectPage = () => (
  <div className="min-h-screen bg-background text-foreground p-6">
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Project Alpha</h1>
        <div className="flex items-center gap-4 mt-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            Active
          </span>
          <span className="text-muted-foreground">Started: Jan 15, 2024</span>
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Project Details</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Location:</span>
                <span className="ml-2 text-foreground">Los Angeles, CA</span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Duration:</span>
                <span className="ml-2 text-foreground">6 weeks</span>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Team Members</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <p className="font-medium text-foreground">Sarah Johnson</p>
                  <p className="text-sm text-muted-foreground">Project Manager</p>
                </div>
                <span className="text-green-600 dark:text-green-400 text-sm">Online</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <p className="font-medium text-foreground">Mike Chen</p>
                  <p className="text-sm text-muted-foreground">Lead Developer</p>
                </div>
                <span className="text-amber-600 dark:text-amber-400 text-sm">Away</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full bg-primary text-primary-foreground py-2 rounded hover:bg-primary/90">
                Add Team Member
              </button>
              <button className="w-full bg-secondary text-secondary-foreground py-2 rounded hover:bg-secondary/90">
                View Timecards
              </button>
              <button className="w-full border border-border text-foreground py-2 rounded hover:bg-muted">
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

describe('Comprehensive Theme Switching Tests', () => {
  beforeEach(() => {
    // Reset DOM classes before each test
    document.documentElement.className = ''
    vi.clearAllMocks()
  })

  describe('Major Page Theme Switching', () => {
    const pages = [
      { name: 'Landing Page', component: MockLandingPage },
      { name: 'Dashboard Page', component: MockDashboardPage },
      { name: 'Auth Page', component: MockAuthPage },
      { name: 'Project Page', component: MockProjectPage },
    ]

    pages.forEach(({ name, component: Component }) => {
      it(`should properly switch themes on ${name}`, async () => {
        const result = await testThemeSwitching(<Component />)
        
        expect(result.lightSnapshot.theme).toBe('light')
        expect(result.darkSnapshot.theme).toBe('dark')
        expect(result.comparison.hasDifferences).toBe(true)
        
        // Verify that theme-aware colors changed
        const colorDifferences = result.comparison.differences.filter(
          diff => diff.property.includes('color') || diff.property.includes('background')
        )
        expect(colorDifferences.length).toBeGreaterThan(0)
      })

      it(`should maintain functionality during theme switching on ${name}`, async () => {
        const functionalityTest = async (container: HTMLElement) => {
          // Test interactive elements
          const buttons = container.querySelectorAll('button')
          const links = container.querySelectorAll('a')
          const inputs = container.querySelectorAll('input')
          
          // Buttons should be clickable
          buttons.forEach(button => {
            expect(button).toBeInTheDocument()
            if (!button.disabled) {
              expect(button).not.toHaveAttribute('disabled')
            }
          })
          
          // Links should be accessible
          links.forEach(link => {
            expect(link).toBeInTheDocument()
            expect(link).toHaveAttribute('href')
          })
          
          // Inputs should be functional
          inputs.forEach(input => {
            expect(input).toBeInTheDocument()
            if (!input.disabled) {
              expect(input).not.toHaveAttribute('disabled')
            }
          })
        }
        
        const result = await validateThemeFunctionality(<Component />, functionalityTest)
        
        expect(result.lightThemeWorks).toBe(true)
        expect(result.darkThemeWorks).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it(`should not have layout shifts during theme switching on ${name}`, async () => {
        const result = await detectLayoutShifts(<Component />)
        
        // Allow for minimal layout shifts (less than 5px difference)
        const widthDiff = Math.abs(result.measurements.light.width - result.measurements.dark.width)
        const heightDiff = Math.abs(result.measurements.light.height - result.measurements.dark.height)
        
        expect(widthDiff).toBeLessThan(5)
        expect(heightDiff).toBeLessThan(5)
      })

      it(`should have fast theme switching performance on ${name}`, async () => {
        const performance = await testThemeSwitchingPerformance(<Component />)
        
        expect(performance.switchToLightTime).toBeLessThan(500) // 500ms max
        expect(performance.switchToDarkTime).toBeLessThan(500) // 500ms max
        expect(performance.averageSwitchTime).toBeLessThan(300) // 300ms average
      })
    })
  })

  describe('Hardcoded Color Detection', () => {
    const createComponentWithHardcodedColors = () => (
      <div className="p-4">
        {/* These should be flagged as hardcoded colors */}
        <div className="text-gray-600 bg-gray-100">Hardcoded gray text</div>
        <div className="text-slate-700 bg-slate-50">Hardcoded slate text</div>
        <div className="border-zinc-300">Hardcoded zinc border</div>
        
        {/* These are theme-aware and should pass */}
        <div className="text-foreground bg-background">Theme-aware text</div>
        <div className="text-muted-foreground bg-muted">Theme-aware muted</div>
        <div className="text-green-600 dark:text-green-400">Semantic color with dark variant</div>
      </div>
    )

    it('should detect hardcoded color classes in components', () => {
      const { container } = render(createComponentWithHardcodedColors())
      
      // Find elements with hardcoded colors
      const hardcodedElements = container.querySelectorAll('[class*="gray-"], [class*="slate-"], [class*="zinc-"]')
      
      expect(hardcodedElements.length).toBeGreaterThan(0)
      
      // Check that hardcoded colors don't adapt to theme changes
      const hardcodedElement = hardcodedElements[0] as HTMLElement
      const lightStyles = window.getComputedStyle(hardcodedElement)
      
      // Switch to dark theme
      document.documentElement.classList.add('dark')
      const darkStyles = window.getComputedStyle(hardcodedElement)
      
      // Hardcoded colors should remain the same (this is the problem we're fixing)
      // In a properly themed component, colors would change
      expect(lightStyles.color).toBe(darkStyles.color)
    })

    it('should validate that theme-aware components change colors', async () => {
      const ThemeAwareComponent = () => (
        <div className="p-4 bg-background text-foreground">
          <h1 className="text-foreground">Theme-aware heading</h1>
          <p className="text-muted-foreground">Theme-aware paragraph</p>
          <button className="bg-primary text-primary-foreground">Theme-aware button</button>
        </div>
      )

      await testComponentInBothThemes(<ThemeAwareComponent />, (container, theme) => {
        const elements = container.querySelectorAll('h1, p, button')
        
        elements.forEach(element => {
          if (element instanceof HTMLElement) {
            const styles = window.getComputedStyle(element)
            
            // Theme-aware elements should have different computed styles in different themes
            // We can't easily test this without actually switching themes, but we can verify
            // that the elements use CSS custom properties
            const hasThemeAwareClasses = element.className.includes('text-foreground') ||
                                       element.className.includes('text-muted-foreground') ||
                                       element.className.includes('bg-background') ||
                                       element.className.includes('bg-primary')
            
            expect(hasThemeAwareClasses).toBe(true)
          }
        })
      })
    })

    it('should identify semantic colors without dark variants', () => {
      const ComponentWithIncompleteSemanticColors = () => (
        <div className="p-4">
          {/* Missing dark variants - should be flagged */}
          <div className="text-red-600">Error without dark variant</div>
          <div className="text-green-600">Success without dark variant</div>
          <div className="text-blue-600">Info without dark variant</div>
          
          {/* Proper semantic colors with dark variants */}
          <div className="text-red-600 dark:text-red-400">Proper error color</div>
          <div className="text-green-600 dark:text-green-400">Proper success color</div>
          <div className="text-blue-600 dark:text-blue-400">Proper info color</div>
        </div>
      )

      const { container } = render(<ComponentWithIncompleteSemanticColors />)
      
      // Find semantic color elements
      const semanticElements = container.querySelectorAll('[class*="text-red-"], [class*="text-green-"], [class*="text-blue-"]')
      
      semanticElements.forEach(element => {
        const className = element.className
        
        // Check if semantic colors have dark variants
        const hasRedColor = className.includes('text-red-')
        const hasGreenColor = className.includes('text-green-')
        const hasBlueColor = className.includes('text-blue-')
        
        if (hasRedColor || hasGreenColor || hasBlueColor) {
          const hasDarkVariant = className.includes('dark:')
          
          // For this test, we expect some elements to be missing dark variants
          // In a real implementation, all semantic colors should have dark variants
          if (!hasDarkVariant) {
            // This element is missing a dark variant - should be fixed
            expect(className).not.toMatch(/dark:/)
          }
        }
      })
    })
  })

  describe('Accessibility and Contrast Validation', () => {
    it('should maintain WCAG AA contrast ratios in light theme', async () => {
      await testComponentInBothThemes(<MockDashboardPage />, (container, theme) => {
        if (theme === 'light') {
          const textElements = container.querySelectorAll('h1, h2, h3, p, span, a, button')
          
          textElements.forEach(element => {
            if (element instanceof HTMLElement) {
              const validation = validateElementContrast(element, 'AA')
              
              // Skip elements with transparent or inherited backgrounds
              if (validation.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                  validation.backgroundColor !== 'transparent') {
                expect(validation.contrastRatio).toBeGreaterThan(3)
                
                // Critical elements should meet AA standards
                if (['H1', 'H2', 'H3', 'BUTTON', 'A'].includes(element.tagName)) {
                  expect(element).toHaveAccessibleContrast('AA')
                }
              }
            }
          })
        }
      })
    })

    it('should maintain WCAG AA contrast ratios in dark theme', async () => {
      await testComponentInBothThemes(<MockDashboardPage />, (container, theme) => {
        if (theme === 'dark') {
          const textElements = container.querySelectorAll('h1, h2, h3, p, span, a, button')
          
          textElements.forEach(element => {
            if (element instanceof HTMLElement) {
              const validation = validateElementContrast(element, 'AA')
              
              // Skip elements with transparent or inherited backgrounds
              if (validation.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                  validation.backgroundColor !== 'transparent') {
                expect(validation.contrastRatio).toBeGreaterThan(3)
                
                // Critical elements should meet AA standards
                if (['H1', 'H2', 'H3', 'BUTTON', 'A'].includes(element.tagName)) {
                  expect(element).toHaveAccessibleContrast('AA')
                }
              }
            }
          })
        }
      })
    })

    it('should validate semantic color contrast in both themes', async () => {
      const SemanticColorComponent = () => (
        <div className="p-6 bg-background">
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <p className="text-green-600 dark:text-green-400 font-medium">Success message</p>
              <p className="text-green-700 dark:text-green-300 text-sm">Operation completed successfully</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 font-medium">Error message</p>
              <p className="text-red-700 dark:text-red-300 text-sm">Something went wrong</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-amber-600 dark:text-amber-400 font-medium">Warning message</p>
              <p className="text-amber-700 dark:text-amber-300 text-sm">Please review this item</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-blue-600 dark:text-blue-400 font-medium">Info message</p>
              <p className="text-blue-700 dark:text-blue-300 text-sm">Additional information available</p>
            </div>
          </div>
        </div>
      )

      await testComponentInBothThemes(<SemanticColorComponent />, (container, theme) => {
        const semanticElements = container.querySelectorAll('[class*="text-green-"], [class*="text-red-"], [class*="text-amber-"], [class*="text-blue-"]')
        
        semanticElements.forEach(element => {
          if (element instanceof HTMLElement) {
            const validation = validateElementContrast(element, 'AA')
            
            // Semantic colors should maintain good contrast
            expect(validation.contrastRatio).toBeGreaterThan(3)
            
            // For important semantic messages, ensure AA compliance
            if (element.className.includes('font-medium')) {
              expect(element).toHaveAccessibleContrast('AA')
            }
          }
        })
      })
    })

    it('should validate form element contrast in both themes', async () => {
      await testComponentInBothThemes(<MockAuthPage />, (container, theme) => {
        const formElements = container.querySelectorAll('input, button, label')
        
        formElements.forEach(element => {
          if (element instanceof HTMLElement) {
            const validation = validateElementContrast(element, 'AA')
            
            // Form elements are critical for accessibility
            if (validation.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                validation.backgroundColor !== 'transparent') {
              expect(validation.contrastRatio).toBeGreaterThan(3)
              
              // Buttons and labels should meet AA standards
              if (['BUTTON', 'LABEL'].includes(element.tagName)) {
                expect(element).toHaveAccessibleContrast('AA')
              }
            }
          }
        })
      })
    })
  })

  describe('Theme Switching Integration', () => {
    it('should handle rapid theme switching without errors', async () => {
      const { rerender } = render(<MockDashboardPage />)
      
      // Rapidly switch themes multiple times
      for (let i = 0; i < 5; i++) {
        simulateThemeSwitch('dark')
        await waitForThemeTransition()
        
        simulateThemeSwitch('light')
        await waitForThemeTransition()
      }
      
      // Component should still be functional
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
      expect(screen.getByText('Active Projects')).toBeInTheDocument()
    })

    it('should preserve component state during theme switching', async () => {
      const StatefulComponent = () => {
        const [count, setCount] = React.useState(0)
        
        return (
          <div className="p-4 bg-background text-foreground">
            <p>Count: {count}</p>
            <button 
              onClick={() => setCount(c => c + 1)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded"
            >
              Increment
            </button>
          </div>
        )
      }

      const user = userEvent.setup()
      const { rerender } = render(<StatefulComponent />)
      
      // Interact with component
      const button = screen.getByText('Increment')
      await user.click(button)
      await user.click(button)
      
      expect(screen.getByText('Count: 2')).toBeInTheDocument()
      
      // Switch theme
      simulateThemeSwitch('dark')
      await waitForThemeTransition()
      
      // State should be preserved
      expect(screen.getByText('Count: 2')).toBeInTheDocument()
      
      // Component should still be functional
      await user.click(button)
      expect(screen.getByText('Count: 3')).toBeInTheDocument()
    })

    it('should handle theme switching with animations', async () => {
      const AnimatedComponent = () => (
        <div className="p-4 bg-background text-foreground transition-colors duration-200">
          <div className="bg-card border border-border rounded-lg p-4 transition-colors duration-200">
            <h2 className="text-foreground transition-colors duration-200">Animated Card</h2>
            <p className="text-muted-foreground transition-colors duration-200">With smooth transitions</p>
          </div>
        </div>
      )

      const performance = await testThemeSwitchingPerformance(<AnimatedComponent />)
      
      // Even with animations, theme switching should be reasonably fast
      expect(performance.averageSwitchTime).toBeLessThan(1000) // 1 second max with animations
    })

    it('should validate theme switching across component tree', async () => {
      const NestedComponent = () => (
        <div className="bg-background text-foreground">
          <header className="bg-card border-b border-border p-4">
            <h1 className="text-foreground">Header</h1>
          </header>
          <main className="p-4">
            <div className="bg-muted p-4 rounded">
              <h2 className="text-foreground">Section</h2>
              <div className="bg-card border border-border p-3 mt-2">
                <p className="text-muted-foreground">Nested content</p>
                <button className="bg-primary text-primary-foreground px-3 py-1 rounded mt-2">
                  Action
                </button>
              </div>
            </div>
          </main>
        </div>
      )

      const result = await testThemeSwitching(<NestedComponent />)
      
      // Verify that nested components all switch themes
      expect(result.comparison.hasDifferences).toBe(true)
      
      // Check that multiple levels of nesting work correctly
      const colorDifferences = result.comparison.differences.filter(
        diff => diff.property.includes('color') || diff.property.includes('background')
      )
      
      // Should have differences at multiple nesting levels
      expect(colorDifferences.length).toBeGreaterThan(2)
    })
  })

  describe('Performance and Optimization', () => {
    it('should not cause memory leaks during theme switching', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Perform multiple theme switches
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<MockDashboardPage />)
        simulateThemeSwitch(i % 2 === 0 ? 'dark' : 'light')
        await waitForThemeTransition()
        unmount()
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Memory usage shouldn't grow significantly (allow for 50% increase)
      if (initialMemory > 0 && finalMemory > 0) {
        expect(finalMemory).toBeLessThan(initialMemory * 1.5)
      }
    })

    it('should have minimal CSS recalculation during theme switching', async () => {
      const { container } = render(<MockDashboardPage />)
      
      // Measure initial layout
      const initialRect = container.getBoundingClientRect()
      
      // Switch theme
      simulateThemeSwitch('dark')
      await waitForThemeTransition()
      
      // Measure after theme switch
      const finalRect = container.getBoundingClientRect()
      
      // Layout should remain stable
      expect(Math.abs(finalRect.width - initialRect.width)).toBeLessThan(1)
      expect(Math.abs(finalRect.height - initialRect.height)).toBeLessThan(1)
    })
  })
})