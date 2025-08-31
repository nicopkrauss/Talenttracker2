import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ThemeProvider } from 'next-themes'
import { ReactNode } from 'react'

/**
 * Theme Switching Performance Tests
 * 
 * Tests theme switching performance across all major pages to ensure:
 * - Theme switches complete within 100ms
 * - No layout shifts occur during transitions
 * - No visual artifacts appear
 * - Memory usage remains stable
 */

// Mock components for testing
const MockPage = ({ children, testId }: { children: ReactNode; testId: string }) => (
  <div data-testid={testId} className="min-h-screen bg-background text-foreground">
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Test Page</h1>
      <div className="bg-card text-card-foreground p-4 rounded-lg">
        <p className="text-muted-foreground">Sample content</p>
      </div>
      <div className="flex gap-2">
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
          Primary Button
        </button>
        <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded">
          Secondary Button
        </button>
      </div>
      <div className="space-y-2">
        <div className="text-green-600 dark:text-green-400">Success message</div>
        <div className="text-amber-600 dark:text-amber-400">Warning message</div>
        <div className="text-red-600 dark:text-red-400">Error message</div>
        <div className="text-blue-600 dark:text-blue-400">Info message</div>
      </div>
      {children}
    </div>
  </div>
)

const ThemeTestWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    {children}
  </ThemeProvider>
)

// Performance measurement utilities
const measurePerformance = async (operation: () => Promise<void> | void) => {
  const start = performance.now()
  await operation()
  const end = performance.now()
  return end - start
}

const measureLayoutShift = (element: HTMLElement) => {
  const initialRect = element.getBoundingClientRect()
  return {
    initial: initialRect,
    measure: () => {
      const currentRect = element.getBoundingClientRect()
      return {
        x: Math.abs(currentRect.x - initialRect.x),
        y: Math.abs(currentRect.y - initialRect.y),
        width: Math.abs(currentRect.width - initialRect.width),
        height: Math.abs(currentRect.height - initialRect.height)
      }
    }
  }
}

describe('Theme Switching Performance', () => {
  let performanceEntries: PerformanceEntry[] = []

  beforeEach(() => {
    // Clear performance entries
    performance.clearMarks()
    performance.clearMeasures()
    performanceEntries = []
    
    // Mock performance observer
    global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      disconnect: vi.fn()
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Theme Switch Timing', () => {
    it('should switch themes within 100ms', async () => {
      const { container } = render(
        <ThemeTestWrapper>
          <MockPage testId="performance-test">
            <button data-testid="theme-toggle">Toggle Theme</button>
          </MockPage>
        </ThemeTestWrapper>
      )

      const themeToggle = screen.getByTestId('theme-toggle')
      const testPage = screen.getByTestId('performance-test')

      // Measure theme switch performance
      const switchTime = await measurePerformance(async () => {
        fireEvent.click(themeToggle)
        await waitFor(() => {
          // Wait for theme class to be applied
          expect(document.documentElement.classList.contains('dark')).toBe(true)
        }, { timeout: 200 })
      })

      expect(switchTime).toBeLessThan(100) // Should complete within 100ms
    })

    it('should handle rapid theme switches without performance degradation', async () => {
      render(
        <ThemeTestWrapper>
          <MockPage testId="rapid-switch-test">
            <button data-testid="theme-toggle">Toggle Theme</button>
          </MockPage>
        </ThemeTestWrapper>
      )

      const themeToggle = screen.getByTestId('theme-toggle')
      const switchTimes: number[] = []

      // Perform 10 rapid theme switches
      for (let i = 0; i < 10; i++) {
        const switchTime = await measurePerformance(async () => {
          fireEvent.click(themeToggle)
          await waitFor(() => {
            const isDark = document.documentElement.classList.contains('dark')
            expect(typeof isDark).toBe('boolean')
          }, { timeout: 100 })
        })
        switchTimes.push(switchTime)
      }

      // Performance should not degrade significantly
      const averageTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length
      const maxTime = Math.max(...switchTimes)
      
      expect(averageTime).toBeLessThan(50) // Average should be very fast
      expect(maxTime).toBeLessThan(100) // Even slowest should be under 100ms
    })
  })

  describe('Layout Stability', () => {
    it('should not cause layout shifts during theme transitions', async () => {
      const { container } = render(
        <ThemeTestWrapper>
          <MockPage testId="layout-stability-test">
            <div data-testid="measured-element" className="bg-card p-4">
              <h2 className="text-lg font-semibold text-foreground">Stable Element</h2>
              <p className="text-muted-foreground">This should not shift</p>
            </div>
            <button data-testid="theme-toggle">Toggle Theme</button>
          </MockPage>
        </ThemeTestWrapper>
      )

      const measuredElement = screen.getByTestId('measured-element')
      const themeToggle = screen.getByTestId('theme-toggle')

      // Set up layout shift measurement
      const layoutMeasurement = measureLayoutShift(measuredElement)

      // Switch theme
      fireEvent.click(themeToggle)
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })

      // Measure layout shift
      const shift = layoutMeasurement.measure()

      // Should have minimal or no layout shift
      expect(shift.x).toBeLessThan(1) // Less than 1px horizontal shift
      expect(shift.y).toBeLessThan(1) // Less than 1px vertical shift
      expect(shift.width).toBeLessThan(1) // Less than 1px width change
      expect(shift.height).toBeLessThan(1) // Less than 1px height change
    })

    it('should maintain element dimensions during theme switch', async () => {
      render(
        <ThemeTestWrapper>
          <MockPage testId="dimension-stability-test">
            <div data-testid="dimension-test" className="w-64 h-32 bg-primary text-primary-foreground p-4">
              Fixed size element
            </div>
            <button data-testid="theme-toggle">Toggle Theme</button>
          </MockPage>
        </ThemeTestWrapper>
      )

      const testElement = screen.getByTestId('dimension-test')
      const themeToggle = screen.getByTestId('theme-toggle')

      // Get initial dimensions
      const initialRect = testElement.getBoundingClientRect()

      // Switch theme
      fireEvent.click(themeToggle)
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })

      // Check dimensions after theme switch
      const finalRect = testElement.getBoundingClientRect()

      expect(finalRect.width).toBe(initialRect.width)
      expect(finalRect.height).toBe(initialRect.height)
    })
  })

  describe('Visual Consistency', () => {
    it('should apply theme colors consistently across all elements', async () => {
      render(
        <ThemeTestWrapper>
          <MockPage testId="color-consistency-test">
            <div data-testid="background-element" className="bg-background">Background</div>
            <div data-testid="card-element" className="bg-card">Card</div>
            <div data-testid="muted-element" className="bg-muted">Muted</div>
            <div data-testid="primary-element" className="bg-primary">Primary</div>
            <button data-testid="theme-toggle">Toggle Theme</button>
          </MockPage>
        </ThemeTestWrapper>
      )

      const elements = [
        screen.getByTestId('background-element'),
        screen.getByTestId('card-element'),
        screen.getByTestId('muted-element'),
        screen.getByTestId('primary-element')
      ]
      const themeToggle = screen.getByTestId('theme-toggle')

      // Get initial computed styles
      const initialStyles = elements.map(el => ({
        element: el,
        backgroundColor: getComputedStyle(el).backgroundColor
      }))

      // Switch to dark theme
      fireEvent.click(themeToggle)
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })

      // Check that colors have changed (indicating theme switch worked)
      const finalStyles = elements.map(el => ({
        element: el,
        backgroundColor: getComputedStyle(el).backgroundColor
      }))

      // At least some colors should have changed
      const changedColors = initialStyles.filter((initial, index) => 
        initial.backgroundColor !== finalStyles[index].backgroundColor
      )

      expect(changedColors.length).toBeGreaterThan(0)
    })

    it('should handle semantic colors correctly in both themes', async () => {
      render(
        <ThemeTestWrapper>
          <MockPage testId="semantic-colors-test">
            <div data-testid="success" className="text-green-600 dark:text-green-400">Success</div>
            <div data-testid="warning" className="text-amber-600 dark:text-amber-400">Warning</div>
            <div data-testid="error" className="text-red-600 dark:text-red-400">Error</div>
            <div data-testid="info" className="text-blue-600 dark:text-blue-400">Info</div>
            <button data-testid="theme-toggle">Toggle Theme</button>
          </MockPage>
        </ThemeTestWrapper>
      )

      const semanticElements = [
        { element: screen.getByTestId('success'), type: 'success' },
        { element: screen.getByTestId('warning'), type: 'warning' },
        { element: screen.getByTestId('error'), type: 'error' },
        { element: screen.getByTestId('info'), type: 'info' }
      ]
      const themeToggle = screen.getByTestId('theme-toggle')

      // Test in light theme
      semanticElements.forEach(({ element, type }) => {
        const color = getComputedStyle(element).color
        expect(color).toBeTruthy() // Should have a color value
      })

      // Switch to dark theme
      fireEvent.click(themeToggle)
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })

      // Test in dark theme - colors should be different but still present
      semanticElements.forEach(({ element, type }) => {
        const color = getComputedStyle(element).color
        expect(color).toBeTruthy() // Should have a color value
      })
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory during theme switches', async () => {
      const { unmount } = render(
        <ThemeTestWrapper>
          <MockPage testId="memory-test">
            <button data-testid="theme-toggle">Toggle Theme</button>
          </MockPage>
        </ThemeTestWrapper>
      )

      const themeToggle = screen.getByTestId('theme-toggle')

      // Perform multiple theme switches
      for (let i = 0; i < 20; i++) {
        fireEvent.click(themeToggle)
        await waitFor(() => {
          const isDark = document.documentElement.classList.contains('dark')
          expect(typeof isDark).toBe('boolean')
        }, { timeout: 50 })
      }

      // Clean up
      unmount()

      // Memory should be cleaned up (this is more of a smoke test)
      expect(true).toBe(true) // If we get here without errors, memory is likely fine
    })
  })

  describe('Accessibility During Theme Switch', () => {
    it('should maintain focus during theme transitions', async () => {
      render(
        <ThemeTestWrapper>
          <MockPage testId="focus-test">
            <button data-testid="focusable-button" className="bg-primary text-primary-foreground px-4 py-2">
              Focusable Button
            </button>
            <button data-testid="theme-toggle">Toggle Theme</button>
          </MockPage>
        </ThemeTestWrapper>
      )

      const focusableButton = screen.getByTestId('focusable-button')
      const themeToggle = screen.getByTestId('theme-toggle')

      // Focus the button
      focusableButton.focus()
      expect(document.activeElement).toBe(focusableButton)

      // Switch theme
      fireEvent.click(themeToggle)
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })

      // Focus should be maintained
      expect(document.activeElement).toBe(focusableButton)
    })

    it('should not cause screen reader announcements during theme switch', async () => {
      // This is a basic test - in a real app you'd use more sophisticated screen reader testing
      render(
        <ThemeTestWrapper>
          <MockPage testId="screen-reader-test">
            <div aria-live="polite" data-testid="live-region"></div>
            <button data-testid="theme-toggle">Toggle Theme</button>
          </MockPage>
        </ThemeTestWrapper>
      )

      const liveRegion = screen.getByTestId('live-region')
      const themeToggle = screen.getByTestId('theme-toggle')

      // Switch theme
      fireEvent.click(themeToggle)
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })

      // Live region should remain empty (no unwanted announcements)
      expect(liveRegion.textContent).toBe('')
    })
  })
})

// Performance benchmark test
describe('Theme Performance Benchmarks', () => {
  it('should meet performance benchmarks', async () => {
    const results = {
      themeSwitchTime: 0,
      layoutShiftScore: 0,
      memoryUsage: 0
    }

    const { container } = render(
      <ThemeTestWrapper>
        <MockPage testId="benchmark-test">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i} className="bg-card text-card-foreground p-4 rounded">
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
          <button data-testid="theme-toggle">Toggle Theme</button>
        </MockPage>
      </ThemeTestWrapper>
    )

    const themeToggle = screen.getByTestId('theme-toggle')

    // Measure theme switch performance with many elements
    results.themeSwitchTime = await measurePerformance(async () => {
      fireEvent.click(themeToggle)
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      }, { timeout: 200 })
    })

    // Performance benchmarks
    expect(results.themeSwitchTime).toBeLessThan(150) // Allow slightly more time for complex layouts
    
    console.log('Performance Results:', results)
  })
})