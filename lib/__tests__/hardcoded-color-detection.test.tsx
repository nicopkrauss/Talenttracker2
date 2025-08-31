import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

/**
 * Utility to detect hardcoded color classes in component markup
 */
function detectHardcodedColors(element: HTMLElement): {
  hardcodedClasses: string[]
  missingDarkVariants: string[]
  themeAwareClasses: string[]
} {
  const hardcodedClasses: string[] = []
  const missingDarkVariants: string[] = []
  const themeAwareClasses: string[] = []
  
  // Patterns for hardcoded colors
  const hardcodedPatterns = [
    /\b(text|bg|border)-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)\b/g,
    /\btext-white\b/g,
    /\btext-black\b/g,
    /\bbg-white\b/g,
    /\bbg-black\b/g,
  ]
  
  // Patterns for semantic colors without dark variants
  const semanticWithoutDarkPattern = /\b(text|bg|border)-(red|green|blue|yellow|amber|orange|purple|pink)-(50|100|200|300|400|500|600|700|800|900)\b(?!.*dark:)/g
  
  // Patterns for theme-aware classes
  const themeAwarePatterns = [
    /\b(text|bg|border)-(background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|destructive-foreground|border|input|ring)\b/g,
  ]
  
  function analyzeElement(el: HTMLElement) {
    const className = el.className
    
    // Check for hardcoded colors
    hardcodedPatterns.forEach(pattern => {
      const matches = className.match(pattern)
      if (matches) {
        hardcodedClasses.push(...matches)
      }
    })
    
    // Check for semantic colors without dark variants
    const semanticMatches = className.match(semanticWithoutDarkPattern)
    if (semanticMatches) {
      missingDarkVariants.push(...semanticMatches)
    }
    
    // Check for theme-aware classes
    themeAwarePatterns.forEach(pattern => {
      const matches = className.match(pattern)
      if (matches) {
        themeAwareClasses.push(...matches)
      }
    })
    
    // Recursively check children
    Array.from(el.children).forEach(child => {
      if (child instanceof HTMLElement) {
        analyzeElement(child)
      }
    })
  }
  
  analyzeElement(element)
  
  return {
    hardcodedClasses: [...new Set(hardcodedClasses)],
    missingDarkVariants: [...new Set(missingDarkVariants)],
    themeAwareClasses: [...new Set(themeAwareClasses)]
  }
}

/**
 * Test component with various color patterns for validation
 */
const ColorTestComponent = () => (
  <div className="p-4 bg-background text-foreground">
    {/* Theme-aware colors (good) */}
    <div className="bg-card text-card-foreground border border-border p-4 mb-4">
      <h1 className="text-foreground text-2xl font-bold">Theme-aware heading</h1>
      <p className="text-muted-foreground">Theme-aware muted text</p>
      <button className="bg-primary text-primary-foreground px-4 py-2 rounded">
        Theme-aware button
      </button>
    </div>
    
    {/* Hardcoded colors (bad) */}
    <div className="bg-gray-100 text-gray-800 border border-gray-300 p-4 mb-4">
      <h2 className="text-gray-900 text-xl font-semibold">Hardcoded gray colors</h2>
      <p className="text-gray-600">This uses hardcoded gray colors</p>
      <button className="bg-blue-500 text-white px-4 py-2 rounded">
        Hardcoded blue button
      </button>
    </div>
    
    {/* Semantic colors with dark variants (good) */}
    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 mb-4">
      <p className="text-green-600 dark:text-green-400 font-medium">Success with dark variant</p>
      <p className="text-green-700 dark:text-green-300 text-sm">Proper semantic color usage</p>
    </div>
    
    {/* Semantic colors without dark variants (bad) */}
    <div className="bg-red-50 border border-red-200 p-4 mb-4">
      <p className="text-red-600 font-medium">Error without dark variant</p>
      <p className="text-red-700 text-sm">Missing dark theme support</p>
    </div>
    
    {/* Mixed usage */}
    <div className="bg-card border border-border p-4">
      <h3 className="text-foreground font-medium">Mixed usage example</h3>
      <div className="bg-slate-100 p-2 mt-2 rounded">
        <span className="text-slate-700">Hardcoded slate in theme-aware container</span>
      </div>
      <div className="bg-muted p-2 mt-2 rounded">
        <span className="text-muted-foreground">Proper theme-aware content</span>
      </div>
    </div>
  </div>
)

describe('Hardcoded Color Detection Tests', () => {
  beforeEach(() => {
    document.documentElement.className = ''
  })

  describe('Color Pattern Detection', () => {
    it('should detect hardcoded color classes', () => {
      const { container } = render(<ColorTestComponent />)
      const analysis = detectHardcodedColors(container)
      
      // Should find hardcoded gray, blue, and slate colors
      expect(analysis.hardcodedClasses).toContain('bg-gray-100')
      expect(analysis.hardcodedClasses).toContain('text-gray-800')
      expect(analysis.hardcodedClasses).toContain('border-gray-300')
      expect(analysis.hardcodedClasses).toContain('text-gray-900')
      expect(analysis.hardcodedClasses).toContain('text-gray-600')
      expect(analysis.hardcodedClasses).toContain('bg-blue-500')
      expect(analysis.hardcodedClasses).toContain('text-white')
      expect(analysis.hardcodedClasses).toContain('bg-slate-100')
      expect(analysis.hardcodedClasses).toContain('text-slate-700')
      
      expect(analysis.hardcodedClasses.length).toBeGreaterThan(5)
    })

    it('should detect semantic colors without dark variants', () => {
      const { container } = render(<ColorTestComponent />)
      const analysis = detectHardcodedColors(container)
      
      // Should find red colors without dark variants
      expect(analysis.missingDarkVariants).toContain('bg-red-50')
      expect(analysis.missingDarkVariants).toContain('border-red-200')
      expect(analysis.missingDarkVariants).toContain('text-red-600')
      expect(analysis.missingDarkVariants).toContain('text-red-700')
      
      expect(analysis.missingDarkVariants.length).toBeGreaterThan(0)
    })

    it('should detect theme-aware classes', () => {
      const { container } = render(<ColorTestComponent />)
      const analysis = detectHardcodedColors(container)
      
      // Should find theme-aware classes
      expect(analysis.themeAwareClasses).toContain('bg-background')
      expect(analysis.themeAwareClasses).toContain('text-foreground')
      expect(analysis.themeAwareClasses).toContain('bg-card')
      expect(analysis.themeAwareClasses).toContain('text-card-foreground')
      expect(analysis.themeAwareClasses).toContain('border-border')
      expect(analysis.themeAwareClasses).toContain('text-muted-foreground')
      expect(analysis.themeAwareClasses).toContain('bg-primary')
      expect(analysis.themeAwareClasses).toContain('text-primary-foreground')
      expect(analysis.themeAwareClasses).toContain('bg-muted')
      
      expect(analysis.themeAwareClasses.length).toBeGreaterThan(5)
    })

    it('should provide comprehensive analysis report', () => {
      const { container } = render(<ColorTestComponent />)
      const analysis = detectHardcodedColors(container)
      
      // Should have findings in all categories
      expect(analysis.hardcodedClasses.length).toBeGreaterThan(0)
      expect(analysis.missingDarkVariants.length).toBeGreaterThan(0)
      expect(analysis.themeAwareClasses.length).toBeGreaterThan(0)
      
      // Hardcoded classes should outnumber theme-aware in this test component
      expect(analysis.hardcodedClasses.length).toBeGreaterThan(3)
    })
  })

  describe('Component-Specific Detection', () => {
    it('should detect hardcoded colors in navigation components', () => {
      const NavigationWithHardcodedColors = () => (
        <nav className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-gray-900 text-xl font-bold">App Name</h1>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-600 hover:text-gray-900">Home</a>
              <a href="#" className="text-blue-600 hover:text-blue-800">Projects</a>
              <button className="bg-blue-500 text-white px-3 py-1 rounded">
                Sign In
              </button>
            </div>
          </div>
        </nav>
      )

      const { container } = render(<NavigationWithHardcodedColors />)
      const analysis = detectHardcodedColors(container)
      
      expect(analysis.hardcodedClasses).toContain('bg-white')
      expect(analysis.hardcodedClasses).toContain('border-gray-200')
      expect(analysis.hardcodedClasses).toContain('text-gray-900')
      expect(analysis.hardcodedClasses).toContain('text-gray-600')
      expect(analysis.hardcodedClasses).toContain('bg-blue-500')
      expect(analysis.hardcodedClasses).toContain('text-white')
    })

    it('should detect hardcoded colors in form components', () => {
      const FormWithHardcodedColors = () => (
        <form className="bg-white p-6 rounded-lg border border-gray-300">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input 
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input 
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign In
          </button>
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            Error message
          </div>
        </form>
      )

      const { container } = render(<FormWithHardcodedColors />)
      const analysis = detectHardcodedColors(container)
      
      // Should detect multiple hardcoded colors in form
      expect(analysis.hardcodedClasses.length).toBeGreaterThan(8)
      expect(analysis.hardcodedClasses).toContain('bg-white')
      expect(analysis.hardcodedClasses).toContain('border-gray-300')
      expect(analysis.hardcodedClasses).toContain('text-gray-700')
      expect(analysis.hardcodedClasses).toContain('bg-blue-500')
      expect(analysis.hardcodedClasses).toContain('text-white')
    })

    it('should validate properly themed components have minimal hardcoded colors', () => {
      const ProperlyThemedComponent = () => (
        <div className="bg-background text-foreground p-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <h1 className="text-foreground text-2xl font-bold mb-4">Dashboard</h1>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded">
                <h2 className="text-foreground font-medium">Projects</h2>
                <p className="text-muted-foreground text-sm">12 active</p>
              </div>
              <div className="bg-muted p-4 rounded">
                <h2 className="text-foreground font-medium">Team</h2>
                <p className="text-muted-foreground text-sm">8 members</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90">
                Primary Action
              </button>
              <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/90">
                Secondary Action
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
                <p className="text-green-600 dark:text-green-400 text-sm">Success message</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-red-600 dark:text-red-400 text-sm">Error message</p>
              </div>
            </div>
          </div>
        </div>
      )

      const { container } = render(<ProperlyThemedComponent />)
      const analysis = detectHardcodedColors(container)
      
      // Should have many theme-aware classes
      expect(analysis.themeAwareClasses.length).toBeGreaterThan(10)
      
      // Should have no hardcoded colors
      expect(analysis.hardcodedClasses.length).toBe(0)
      
      // Should have no missing dark variants (all semantic colors have dark variants)
      expect(analysis.missingDarkVariants.length).toBe(0)
    })
  })

  describe('Real Component Analysis', () => {
    it('should analyze actual component markup for color issues', () => {
      // This test would analyze real components from the codebase
      const RealComponentExample = () => (
        <div className="min-h-screen bg-background">
          <header className="bg-card border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">Talent Tracker</h1>
              <nav className="flex space-x-6">
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  Projects
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  Team
                </a>
              </nav>
            </div>
          </header>
          <main className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Active Projects
                </h2>
                <p className="text-3xl font-bold text-foreground">12</p>
                <p className="text-sm text-muted-foreground">+2 from last month</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Team Members
                </h2>
                <p className="text-3xl font-bold text-foreground">48</p>
                <p className="text-sm text-green-600 dark:text-green-400">All active</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Pending Reviews
                </h2>
                <p className="text-3xl font-bold text-foreground">3</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">Needs attention</p>
              </div>
            </div>
          </main>
        </div>
      )

      const { container } = render(<RealComponentExample />)
      const analysis = detectHardcodedColors(container)
      
      // This component should be properly themed
      expect(analysis.hardcodedClasses.length).toBe(0)
      expect(analysis.missingDarkVariants.length).toBe(0)
      expect(analysis.themeAwareClasses.length).toBeGreaterThan(8)
      
      // Should use semantic colors with dark variants
      const semanticElements = container.querySelectorAll('[class*="text-green-"], [class*="text-amber-"]')
      semanticElements.forEach(element => {
        expect(element.className).toMatch(/dark:/)
      })
    })

    it('should provide actionable recommendations for fixing color issues', () => {
      const { container } = render(<ColorTestComponent />)
      const analysis = detectHardcodedColors(container)
      
      // Generate recommendations based on analysis
      const recommendations = {
        hardcodedColorFixes: analysis.hardcodedClasses.map(className => {
          if (className.includes('text-gray-')) {
            return `Replace "${className}" with "text-foreground" or "text-muted-foreground"`
          }
          if (className.includes('bg-gray-')) {
            return `Replace "${className}" with "bg-background", "bg-card", or "bg-muted"`
          }
          if (className.includes('border-gray-')) {
            return `Replace "${className}" with "border-border"`
          }
          if (className === 'text-white') {
            return `Replace "text-white" with "text-primary-foreground" on colored backgrounds`
          }
          if (className === 'bg-white') {
            return `Replace "bg-white" with "bg-background" or "bg-card"`
          }
          return `Review and replace hardcoded color: ${className}`
        }),
        
        missingDarkVariantFixes: analysis.missingDarkVariants.map(className => {
          const colorMatch = className.match(/(red|green|blue|yellow|amber|orange|purple|pink)-(\d+)/)
          if (colorMatch) {
            const [, color, shade] = colorMatch
            const darkShade = parseInt(shade) >= 600 ? '400' : '300'
            return `Add dark variant to "${className}": "${className} dark:${className.replace(shade, darkShade)}"`
          }
          return `Add dark variant to: ${className}`
        })
      }
      
      expect(recommendations.hardcodedColorFixes.length).toBeGreaterThan(0)
      expect(recommendations.missingDarkVariantFixes.length).toBeGreaterThan(0)
      
      // Verify recommendations are actionable
      recommendations.hardcodedColorFixes.forEach(fix => {
        expect(fix).toMatch(/Replace .+ with .+/)
      })
      
      recommendations.missingDarkVariantFixes.forEach(fix => {
        expect(fix).toMatch(/Add dark variant/)
      })
    })
  })
})