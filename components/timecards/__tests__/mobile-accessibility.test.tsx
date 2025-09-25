import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { TimecardProjectHub } from '../timecard-project-hub'
import { TimecardProjectCard } from '../timecard-project-card'
import { ProjectTimecardBreadcrumb } from '../project-timecard-breadcrumb'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the auth context
const mockAuthContext = {
  user: { id: 'test-user' },
  userProfile: { role: 'admin' },
  isAuthenticated: true,
  loading: false
}

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => mockAuthContext
}))

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ projectId: 'test-project' })
}))

describe('Mobile Responsiveness and Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful API response
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          {
            projectId: 'project-1',
            projectName: 'Test Project 1',
            projectDescription: 'A test project description',
            productionCompany: 'Test Productions',
            totalTimecards: 5,
            statusBreakdown: {
              draft: 1,
              submitted: 2,
              approved: 1,
              rejected: 1
            },
            totalHours: 40.5,
            totalApprovedPay: 1000,
            totalPotentialPay: 1500,
            lastActivity: '2024-01-15T10:00:00Z'
          }
        ],
        count: 1,
        userRole: 'admin'
      })
    })
  })

  describe('TimecardProjectHub', () => {
    it('should have proper touch targets on mobile', async () => {
      render(
        <TimecardProjectHub
          userRole="admin"
          onSelectProject={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      })

      // Check search input has minimum touch target size
      const searchInput = screen.getByRole('searchbox')
      expect(searchInput).toHaveClass('min-h-[44px]')

      // Check filter buttons have minimum touch target size
      const filterButtons = screen.getAllByRole('button', { name: /show/i })
      filterButtons.forEach(button => {
        expect(button).toHaveClass('min-h-[44px]')
      })
    })

    it('should be accessible with screen readers', async () => {
      render(
        <TimecardProjectHub
          userRole="admin"
          onSelectProject={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      })

      // Check ARIA labels
      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search projects')
      
      // Check filter buttons have proper ARIA attributes
      const allButton = screen.getByRole('button', { name: /show all projects/i })
      expect(allButton).toHaveAttribute('aria-pressed')
    })

    it('should have responsive grid layout', async () => {
      render(
        <TimecardProjectHub
          userRole="admin"
          onSelectProject={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeInTheDocument()
      })

      const grid = screen.getByRole('grid')
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4')
    })
  })

  describe('TimecardProjectCard', () => {
    const mockProject = {
      id: 'project-1',
      name: 'Test Project',
      description: 'Test description',
      production_company: 'Test Productions',
      status: 'active',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      location: 'Test Location',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      created_by: 'test-user'
    }

    const mockTimecardStats = {
      projectId: 'project-1',
      projectName: 'Test Project',
      projectDescription: 'Test description',
      productionCompany: 'Test Productions',
      totalTimecards: 5,
      statusBreakdown: {
        draft: 1,
        submitted: 2,
        approved: 1,
        rejected: 1
      },
      totalHours: 40.5,
      totalApprovedPay: 1000,
      totalPotentialPay: 1500,
      lastActivity: '2024-01-15T10:00:00Z'
    }

    it('should have proper touch targets', () => {
      render(
        <TimecardProjectCard
          project={mockProject}
          timecardStats={mockTimecardStats}
          userRole="admin"
          onSelectProject={vi.fn()}
        />
      )

      // Check main action button has minimum touch target size
      const viewButton = screen.getByText('View Timecards')
      expect(viewButton).toHaveClass('min-h-[44px]')
    })

    it('should be accessible with screen readers', async () => {
      render(
        <TimecardProjectCard
          project={mockProject}
          timecardStats={mockTimecardStats}
          userRole="admin"
          onSelectProject={vi.fn()}
        />
      )

      // Check ARIA labels and structure
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByText('View Timecards')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /open test project/i })).toBeInTheDocument()
    })

    it('should have responsive text sizes', () => {
      render(
        <TimecardProjectCard
          project={mockProject}
          timecardStats={mockTimecardStats}
          userRole="admin"
          onSelectProject={vi.fn()}
        />
      )

      // Check responsive text classes
      const projectTitle = screen.getByText('Test Project')
      expect(projectTitle).toHaveClass('text-base', 'sm:text-lg')
    })
  })

  describe('ProjectTimecardBreadcrumb', () => {
    const mockProject = {
      id: 'project-1',
      name: 'Test Project',
      description: 'Test description',
      production_company: 'Test Productions',
      status: 'active'
    }

    it('should have proper touch targets', () => {
      render(
        <ProjectTimecardBreadcrumb
          project={mockProject}
          onBackToProjects={vi.fn()}
        />
      )

      // Check back button has minimum touch target size
      const backButton = screen.getByRole('button', { name: /back to project selection/i })
      expect(backButton).toHaveClass('min-h-[44px]')
    })

    it('should be accessible with screen readers', async () => {
      render(
        <ProjectTimecardBreadcrumb
          project={mockProject}
          onBackToProjects={vi.fn()}
        />
      )

      // Check ARIA labels
      expect(screen.getByRole('button', { name: /back to project selection/i })).toBeInTheDocument()
    })

    it('should have responsive layout', () => {
      render(
        <ProjectTimecardBreadcrumb
          project={mockProject}
          onBackToProjects={vi.fn()}
        />
      )

      // Check responsive title classes
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveClass('text-lg', 'sm:text-xl', 'md:text-2xl')
    })

    it('should handle long project names gracefully', () => {
      const longNameProject = {
        ...mockProject,
        name: 'This is a very long project name that should be truncated on mobile devices'
      }

      render(
        <ProjectTimecardBreadcrumb
          project={longNameProject}
          onBackToProjects={vi.fn()}
        />
      )

      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveClass('truncate')
    })
  })

  describe('Focus Management', () => {
    it('should maintain focus indicators', async () => {
      const user = userEvent.setup()

      render(
        <TimecardProjectHub
          userRole="admin"
          onSelectProject={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument()
      })

      // Test focus indicators on interactive elements
      const searchInput = screen.getByRole('searchbox')
      await user.click(searchInput)
      expect(searchInput).toHaveFocus()

      // Tab to filter buttons
      await user.keyboard('{Tab}')
      const focusedElement = document.activeElement
      expect(focusedElement).toHaveClass('min-h-[44px]')
    })
  })
})