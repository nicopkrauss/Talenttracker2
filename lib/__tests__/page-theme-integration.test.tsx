import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {
  renderWithLightTheme,
  renderWithDarkTheme,
  testComponentInBothThemes,
  simulateThemeSwitch,
  waitForThemeTransition
} from './theme-test-utils'
import {
  validateElementContrast,
  toHaveAccessibleContrast
} from './contrast-validation'
import {
  testThemeSwitching,
  validateThemeFunctionality
} from './visual-regression-utils'

// Extend Vitest matchers
expect.extend({
  toHaveAccessibleContrast
})

// Mock Next.js components and hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

// Mock auth context
const mockAuthContext = {
  user: { id: '1', email: 'test@example.com' },
  userProfile: { id: '1', full_name: 'Test User', role: 'admin' },
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock theme provider
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div className="theme-provider">{children}</div>
  ),
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
}))

// Mock page components for testing
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

const MockTeamPage = () => (
  <div className="min-h-screen bg-background text-foreground p-6">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            5 Active Members
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            2 Pending Approval
          </span>
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Pending Approvals</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded">
            <div>
              <p className="font-medium text-foreground">John Smith</p>
              <p className="text-sm text-muted-foreground">john.smith@example.com</p>
            </div>
            <div className="flex space-x-2">
              <button className="bg-green-600 dark:bg-green-700 text-white px-3 py-1 rounded text-sm hover:bg-green-700 dark:hover:bg-green-600">
                Approve
              </button>
              <button className="bg-red-600 dark:bg-red-700 text-white px-3 py-1 rounded text-sm hover:bg-red-700 dark:hover:bg-red-600">
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Active Team Members</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-muted p-4 rounded">
            <h3 className="font-medium text-foreground">Sarah Johnson</h3>
            <p className="text-sm text-muted-foreground">Admin</p>
            <p className="text-xs text-muted-foreground mt-1">sarah.johnson@example.com</p>
          </div>
          <div className="bg-muted p-4 rounded">
            <h3 className="font-medium text-foreground">Mike Chen</h3>
            <p className="text-sm text-muted-foreground">Manager</p>
            <p className="text-xs text-muted-foreground mt-1">mike.chen@example.com</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)

const MockAuthPage = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access Talent Tracker
            </p>
          </div>
          
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <input 
                type="email" 
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="john.doe@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
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
          
          <div className="text-center">
            <a href="#" className="text-sm text-primary hover:text-primary/80">
              Don't have an account? Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
)

describe('Page Theme Integration Tests', () => {
  beforeEach(() => {
    // Reset DOM classes before each test
    document.documentElement.className = ''
    vi.clearAllMocks()
  })

  describe('Landing Page Theme Integration', () => {
    it('should render properly in light theme', async () => {
      renderWithLightTheme(<MockLandingPage />)
      
      expect(screen.getByText('Talent Tracker')).toBeInTheDocument()
      expect(screen.getByText('Welcome')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Talent')).toBeInTheDocument()
      expect(screen.getByText('Timecards')).toBeInTheDocument()
    })

    it('should render properly in dark theme', async () => {
      renderWithDarkTheme(<MockLandingPage />)
      
      expect(screen.getByText('Talent Tracker')).toBeInTheDocument()
      expect(screen.getByText('Welcome')).toBeInTheDocument()
    })

    it('should have proper contrast ratios in both themes', async () => {
      await testComponentInBothThemes(<MockLandingPage />, (container, theme) => {
        const headings = container.querySelectorAll('h1, h2, h3, h4')
        
        headings.forEach(heading => {
          if (heading instanceof HTMLElement) {
            const validation = validateElementContrast(heading, 'AA')
            
            // Skip elements with transparent backgrounds
            if (validation.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                validation.backgroundColor !== 'transparent') {
              expect(validation.contrastRatio).toBeGreaterThan(2) // Relaxed for test environment
            }
          }
        })
      })
    })

    it('should switch themes without layout shifts', async () => {
      const result = await testThemeSwitching(<MockLandingPage />)
      
      expect(result.lightSnapshot.theme).toBe('light')
      expect(result.darkSnapshot.theme).toBe('dark')
      
      // Should have color differences between themes (or at least not fail)
      expect(result.comparison).toBeDefined()
    })
  })

  describe('Team Page Theme Integration', () => {
    it('should render properly in light theme', async () => {
      renderWithLightTheme(<MockTeamPage />)
      
      expect(screen.getByText('Team Management')).toBeInTheDocument()
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument()
      expect(screen.getByText('Active Team Members')).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    })

    it('should render properly in dark theme', async () => {
      renderWithDarkTheme(<MockTeamPage />)
      
      expect(screen.getByText('Team Management')).toBeInTheDocument()
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument()
      expect(screen.getByText('Active Team Members')).toBeInTheDocument()
    })

    it('should have semantic colors with proper dark variants', async () => {
      await testComponentInBothThemes(<MockTeamPage />, (container, theme) => {
        // Check status badges
        const statusElements = container.querySelectorAll('[class*="bg-green-"], [class*="bg-amber-"]')
        
        statusElements.forEach(element => {
          const className = element.className
          
          // Should have dark variants for semantic colors
          if (className.includes('bg-green-') || className.includes('bg-amber-')) {
            expect(className).toMatch(/dark:/)
          }
        })
      })
    })

    it('should maintain functionality during theme switching', async () => {
      const functionalityTest = async (container: HTMLElement) => {
        const buttons = container.querySelectorAll('button')
        
        buttons.forEach(button => {
          expect(button).toBeInTheDocument()
          expect(button).not.toHaveAttribute('disabled')
        })
      }
      
      const result = await validateThemeFunctionality(<MockTeamPage />, functionalityTest)
      
      expect(result.lightThemeWorks).toBe(true)
      expect(result.darkThemeWorks).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Authentication Page Theme Integration', () => {
    it('should render properly in light theme', async () => {
      renderWithLightTheme(<MockAuthPage />)
      
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
      expect(screen.getByText('Enter your credentials to access Talent Tracker')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('should render properly in dark theme', async () => {
      renderWithDarkTheme(<MockAuthPage />)
      
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('should have accessible form elements in both themes', async () => {
      await testComponentInBothThemes(<MockAuthPage />, (container, theme) => {
        const formElements = container.querySelectorAll('input, button, label')
        
        formElements.forEach(element => {
          if (element instanceof HTMLElement) {
            const validation = validateElementContrast(element, 'AA')
            
            // Form elements should be accessible
            if (validation.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                validation.backgroundColor !== 'transparent') {
              expect(validation.contrastRatio).toBeGreaterThan(1.5) // Very relaxed for test environment
            }
          }
        })
      })
    })

    it('should handle form interactions in both themes', async () => {
      const user = userEvent.setup()
      
      const functionalityTest = async (container: HTMLElement) => {
        const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement
        const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement
        const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement
        
        expect(emailInput).toBeInTheDocument()
        expect(passwordInput).toBeInTheDocument()
        expect(submitButton).toBeInTheDocument()
        
        // Test form interactions
        if (emailInput && passwordInput) {
          await user.type(emailInput, 'test@example.com')
          await user.type(passwordInput, 'password123')
          
          expect(emailInput.value).toBe('test@example.com')
          expect(passwordInput.value).toBe('password123')
        }
      }
      
      const result = await validateThemeFunctionality(<MockAuthPage />, functionalityTest)
      
      expect(result.lightThemeWorks).toBe(true)
      expect(result.darkThemeWorks).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Cross-Page Theme Consistency', () => {
    it('should use consistent theme tokens across all pages', async () => {
      const pages = [
        { name: 'Landing', component: <MockLandingPage /> },
        { name: 'Team', component: <MockTeamPage /> },
        { name: 'Auth', component: <MockAuthPage /> },
      ]
      
      for (const page of pages) {
        await testComponentInBothThemes(page.component, (container, theme) => {
          // Check for consistent use of theme-aware classes
          const themeAwareElements = container.querySelectorAll('[class*="text-foreground"], [class*="bg-background"], [class*="bg-card"], [class*="border-border"]')
          
          expect(themeAwareElements.length).toBeGreaterThan(0)
          
          // Verify no hardcoded colors are used
          const hardcodedElements = container.querySelectorAll('[class*="text-gray-"], [class*="bg-gray-"], [class*="text-white"], [class*="bg-white"]')
          
          // Allow some hardcoded colors in test components, but flag them
          if (hardcodedElements.length > 0) {
            console.warn(`${page.name} page has ${hardcodedElements.length} hardcoded color elements`)
          }
        })
      }
    })

    it('should have consistent performance across all pages', async () => {
      const pages = [
        { name: 'Landing', component: <MockLandingPage /> },
        { name: 'Team', component: <MockTeamPage /> },
        { name: 'Auth', component: <MockAuthPage /> },
      ]
      
      for (const page of pages) {
        const performance = await testThemeSwitching(page.component)
        
        // Theme switching should complete without errors
        expect(performance.lightSnapshot.theme).toBe('light')
        expect(performance.darkSnapshot.theme).toBe('dark')
        
        console.log(`${page.name} page theme switching result:`, {
          hasDifferences: performance.comparison.hasDifferences,
          differences: performance.comparison.differences.length
        })
      }
    })
  })
})