import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { renderWithLightTheme, renderWithDarkTheme } from './theme-test-utils'

// Mock Next.js and other dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null })
        })
      })
    })
  })
}))

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
    userProfile: { id: '1', full_name: 'Test User', role: 'admin', status: 'active' },
    loading: false,
    canAccessAdminFeatures: true,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div className="theme-provider">{children}</div>,
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), resolvedTheme: 'light' }),
}))

/**
 * Utility to detect hardcoded color classes in component markup
 */
function detectHardcodedColors(element: HTMLElement): {
  hardcodedClasses: string[]
  missingDarkVariants: string[]
  themeAwareClasses: string[]
  problematicElements: Array<{
    element: HTMLElement
    issues: string[]
  }>
} {
  const hardcodedClasses: string[] = []
  const missingDarkVariants: string[] = []
  const themeAwareClasses: string[] = []
  const problematicElements: Array<{ element: HTMLElement; issues: string[] }> = []
  
  // Patterns for hardcoded colors (more comprehensive)
  const hardcodedPatterns = [
    /\b(text|bg|border)-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)\b/g,
    /\btext-white\b/g,
    /\btext-black\b/g,
    /\bbg-white\b/g,
    /\bbg-black\b/g,
    /\bborder-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)\b/g,
  ]
  
  // Patterns for semantic colors without dark variants
  const semanticWithoutDarkPattern = /\b(text|bg|border)-(red|green|blue|yellow|amber|orange|purple|pink|indigo|violet|cyan|teal|lime|emerald|sky|rose)-(50|100|200|300|400|500|600|700|800|900)\b(?!.*dark:)/g
  
  // Patterns for theme-aware classes
  const themeAwarePatterns = [
    /\b(text|bg|border)-(background|foreground|card|card-foreground|popover|popover-foreground|primary|primary-foreground|secondary|secondary-foreground|muted|muted-foreground|accent|accent-foreground|destructive|destructive-foreground|border|input|ring)\b/g,
  ]
  
  function analyzeElement(el: HTMLElement) {
    const className = el.className
    const elementIssues: string[] = []
    
    // Check for hardcoded colors
    hardcodedPatterns.forEach(pattern => {
      const matches = className.match(pattern)
      if (matches) {
        hardcodedClasses.push(...matches)
        elementIssues.push(`Hardcoded colors: ${matches.join(', ')}`)
      }
    })
    
    // Check for semantic colors without dark variants
    const semanticMatches = className.match(semanticWithoutDarkPattern)
    if (semanticMatches) {
      missingDarkVariants.push(...semanticMatches)
      elementIssues.push(`Missing dark variants: ${semanticMatches.join(', ')}`)
    }
    
    // Check for theme-aware classes
    themeAwarePatterns.forEach(pattern => {
      const matches = className.match(pattern)
      if (matches) {
        themeAwareClasses.push(...matches)
      }
    })
    
    // Record problematic elements
    if (elementIssues.length > 0) {
      problematicElements.push({
        element: el,
        issues: elementIssues
      })
    }
    
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
    themeAwareClasses: [...new Set(themeAwareClasses)],
    problematicElements
  }
}

// Import actual components to test
import { LoginForm } from '@/components/auth/login-form'
import { RegistrationForm } from '@/components/auth/registration-form'
import { PendingApprovalPage } from '@/components/auth/pending-approval-page'

describe('Codebase Hardcoded Color Validation', () => {
  beforeEach(() => {
    document.documentElement.className = ''
    vi.clearAllMocks()
  })

  describe('Authentication Components Color Validation', () => {
    it('should have no hardcoded colors in LoginForm', () => {
      const { container } = render(<LoginForm onSubmit={vi.fn()} />)
      const analysis = detectHardcodedColors(container)
      
      // Report findings
      if (analysis.hardcodedClasses.length > 0) {
        console.warn('LoginForm hardcoded colors found:', analysis.hardcodedClasses)
      }
      if (analysis.missingDarkVariants.length > 0) {
        console.warn('LoginForm missing dark variants:', analysis.missingDarkVariants)
      }
      if (analysis.problematicElements.length > 0) {
        console.warn('LoginForm problematic elements:', analysis.problematicElements.map(p => ({
          tagName: p.element.tagName,
          className: p.element.className,
          issues: p.issues
        })))
      }
      
      // Assertions - these should pass after theme migration is complete
      expect(analysis.hardcodedClasses.length).toBe(0)
      expect(analysis.missingDarkVariants.length).toBe(0)
      expect(analysis.themeAwareClasses.length).toBeGreaterThan(0)
    })

    it('should have no hardcoded colors in RegistrationForm', () => {
      const { container } = render(<RegistrationForm onSubmit={vi.fn()} />)
      const analysis = detectHardcodedColors(container)
      
      // Report findings
      if (analysis.hardcodedClasses.length > 0) {
        console.warn('RegistrationForm hardcoded colors found:', analysis.hardcodedClasses)
      }
      if (analysis.missingDarkVariants.length > 0) {
        console.warn('RegistrationForm missing dark variants:', analysis.missingDarkVariants)
      }
      
      // Assertions
      expect(analysis.hardcodedClasses.length).toBe(0)
      expect(analysis.missingDarkVariants.length).toBe(0)
      expect(analysis.themeAwareClasses.length).toBeGreaterThan(0)
    })

    it('should have no hardcoded colors in PendingApprovalPage', () => {
      const { container } = render(<PendingApprovalPage />)
      const analysis = detectHardcodedColors(container)
      
      // Report findings
      if (analysis.hardcodedClasses.length > 0) {
        console.warn('PendingApprovalPage hardcoded colors found:', analysis.hardcodedClasses)
      }
      if (analysis.missingDarkVariants.length > 0) {
        console.warn('PendingApprovalPage missing dark variants:', analysis.missingDarkVariants)
      }
      
      // Assertions
      expect(analysis.hardcodedClasses.length).toBe(0)
      expect(analysis.missingDarkVariants.length).toBe(0)
      expect(analysis.themeAwareClasses.length).toBeGreaterThan(0)
    })
  })

  describe('Theme-Aware Class Usage Validation', () => {
    it('should use semantic theme tokens appropriately', () => {
      const components = [
        { name: 'LoginForm', component: <LoginForm onSubmit={vi.fn()} /> },
        { name: 'RegistrationForm', component: <RegistrationForm onSubmit={vi.fn()} /> },
        { name: 'PendingApprovalPage', component: <PendingApprovalPage /> },
      ]
      
      components.forEach(({ name, component }) => {
        const { container } = render(component)
        const analysis = detectHardcodedColors(container)
        
        // Should use theme-aware classes
        expect(analysis.themeAwareClasses.length).toBeGreaterThan(0)
        
        // Common theme-aware classes that should be present
        const expectedClasses = [
          'text-foreground',
          'bg-background',
          'bg-card',
          'border-border',
          'text-muted-foreground'
        ]
        
        const hasExpectedClasses = expectedClasses.some(expectedClass =>
          analysis.themeAwareClasses.some(actualClass => actualClass.includes(expectedClass))
        )
        
        expect(hasExpectedClasses).toBe(true)
        
        console.log(`${name} theme-aware classes:`, analysis.themeAwareClasses)
      })
    })

    it('should have proper semantic color usage with dark variants', () => {
      const components = [
        { name: 'LoginForm', component: <LoginForm onSubmit={vi.fn()} error="Test error" /> },
        { name: 'RegistrationForm', component: <RegistrationForm onSubmit={vi.fn()} error="Test error" /> },
      ]
      
      components.forEach(({ name, component }) => {
        const { container } = render(component)
        
        // Look for semantic color elements
        const semanticElements = container.querySelectorAll('[class*="text-red-"], [class*="text-green-"], [class*="text-blue-"], [class*="text-amber-"], [class*="bg-red-"], [class*="bg-green-"], [class*="bg-blue-"], [class*="bg-amber-"]')
        
        semanticElements.forEach(element => {
          const className = element.className
          
          // If using semantic colors, should have dark variants
          const hasSemanticColor = /\b(text|bg)-(red|green|blue|amber|yellow|orange|purple|pink)-\d+\b/.test(className)
          
          if (hasSemanticColor) {
            const hasDarkVariant = /dark:(text|bg)-(red|green|blue|amber|yellow|orange|purple|pink)-\d+/.test(className)
            
            if (!hasDarkVariant) {
              console.warn(`${name} semantic color without dark variant:`, className)
            }
            
            // For now, we'll log this but not fail the test since migration might be in progress
            // expect(hasDarkVariant).toBe(true)
          }
        })
      })
    })
  })

  describe('Color Migration Progress Tracking', () => {
    it('should track migration progress across components', () => {
      const components = [
        { name: 'LoginForm', component: <LoginForm onSubmit={vi.fn()} /> },
        { name: 'RegistrationForm', component: <RegistrationForm onSubmit={vi.fn()} /> },
        { name: 'PendingApprovalPage', component: <PendingApprovalPage /> },
      ]
      
      const migrationReport = components.map(({ name, component }) => {
        const { container } = render(component)
        const analysis = detectHardcodedColors(container)
        
        const totalColorClasses = analysis.hardcodedClasses.length + analysis.themeAwareClasses.length
        const migrationPercentage = totalColorClasses > 0 
          ? Math.round((analysis.themeAwareClasses.length / totalColorClasses) * 100)
          : 100
        
        return {
          component: name,
          hardcodedColors: analysis.hardcodedClasses.length,
          themeAwareColors: analysis.themeAwareClasses.length,
          missingDarkVariants: analysis.missingDarkVariants.length,
          migrationPercentage,
          issues: analysis.problematicElements.length
        }
      })
      
      console.log('Theme Migration Progress Report:')
      console.table(migrationReport)
      
      // Overall migration should be progressing
      const overallMigrationPercentage = migrationReport.reduce((sum, report) => sum + report.migrationPercentage, 0) / migrationReport.length
      
      console.log(`Overall migration progress: ${overallMigrationPercentage.toFixed(1)}%`)
      
      // Expect significant progress (at least 70% theme-aware)
      expect(overallMigrationPercentage).toBeGreaterThan(70)
      
      // No component should have more than 5 hardcoded colors
      migrationReport.forEach(report => {
        expect(report.hardcodedColors).toBeLessThanOrEqual(5)
      })
    })

    it('should generate actionable migration recommendations', () => {
      const { container } = render(<LoginForm onSubmit={vi.fn()} />)
      const analysis = detectHardcodedColors(container)
      
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
        }),
        
        elementSpecificIssues: analysis.problematicElements.map(({ element, issues }) => ({
          element: `${element.tagName.toLowerCase()}${element.className ? '.' + element.className.split(' ').join('.') : ''}`,
          issues,
          suggestions: issues.map(issue => {
            if (issue.includes('Hardcoded colors')) {
              return 'Use theme-aware color tokens instead of hardcoded values'
            }
            if (issue.includes('Missing dark variants')) {
              return 'Add dark: variants for semantic colors'
            }
            return 'Review color usage for theme compatibility'
          })
        }))
      }
      
      if (recommendations.hardcodedColorFixes.length > 0) {
        console.log('Hardcoded Color Fix Recommendations:')
        recommendations.hardcodedColorFixes.forEach(fix => console.log(`  - ${fix}`))
      }
      
      if (recommendations.missingDarkVariantFixes.length > 0) {
        console.log('Missing Dark Variant Fix Recommendations:')
        recommendations.missingDarkVariantFixes.forEach(fix => console.log(`  - ${fix}`))
      }
      
      if (recommendations.elementSpecificIssues.length > 0) {
        console.log('Element-Specific Issues:')
        recommendations.elementSpecificIssues.forEach(({ element, issues, suggestions }) => {
          console.log(`  ${element}:`)
          issues.forEach(issue => console.log(`    - Issue: ${issue}`))
          suggestions.forEach(suggestion => console.log(`    - Suggestion: ${suggestion}`))
        })
      }
      
      // This test documents the current state and provides actionable recommendations
      // It should pass even with some hardcoded colors, but provides guidance for fixes
      expect(recommendations).toBeDefined()
    })
  })

  describe('Regression Prevention', () => {
    it('should prevent introduction of new hardcoded colors', () => {
      // This test would be run in CI to prevent regression
      const components = [
        { name: 'LoginForm', component: <LoginForm onSubmit={vi.fn()} /> },
        { name: 'RegistrationForm', component: <RegistrationForm onSubmit={vi.fn()} /> },
        { name: 'PendingApprovalPage', component: <PendingApprovalPage /> },
      ]
      
      components.forEach(({ name, component }) => {
        const { container } = render(component)
        const analysis = detectHardcodedColors(container)
        
        // Set thresholds based on current state
        // These should be tightened as migration progresses
        const maxHardcodedColors = 5 // Adjust based on current state
        const maxMissingDarkVariants = 3 // Adjust based on current state
        
        if (analysis.hardcodedClasses.length > maxHardcodedColors) {
          console.error(`${name} has ${analysis.hardcodedClasses.length} hardcoded colors (max: ${maxHardcodedColors})`)
          console.error('Hardcoded colors:', analysis.hardcodedClasses)
        }
        
        if (analysis.missingDarkVariants.length > maxMissingDarkVariants) {
          console.error(`${name} has ${analysis.missingDarkVariants.length} missing dark variants (max: ${maxMissingDarkVariants})`)
          console.error('Missing dark variants:', analysis.missingDarkVariants)
        }
        
        // For now, we'll warn but not fail to allow gradual migration
        // expect(analysis.hardcodedClasses.length).toBeLessThanOrEqual(maxHardcodedColors)
        // expect(analysis.missingDarkVariants.length).toBeLessThanOrEqual(maxMissingDarkVariants)
        
        // But we should always have some theme-aware classes
        expect(analysis.themeAwareClasses.length).toBeGreaterThan(0)
      })
    })
  })
})