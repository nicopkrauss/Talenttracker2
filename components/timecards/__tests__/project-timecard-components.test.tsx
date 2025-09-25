import { render, screen } from '@testing-library/react'
import { ProjectTimecardWrapper } from '../project-timecard-wrapper'
import { ProjectTimecardTabs } from '../project-timecard-tabs'
import { ProjectTimecardList } from '../project-timecard-list'
import { ProjectTimecardApproval } from '../project-timecard-approval'
import { ProjectPayrollSummary } from '../project-payroll-summary'

import { vi } from 'vitest'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { it } from 'date-fns/locale'
import { describe } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the auth context
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    userProfile: { role: 'admin' },
    loading: false,
    isAuthenticated: true
  })
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useParams: () => ({
    projectId: 'test-project-id'
  })
}))

// Mock Supabase client
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'test-project-id',
              name: 'Test Project',
              description: 'Test Description'
            },
            error: null
          })
        }),
        limit: () => Promise.resolve({
          data: [],
          error: null
        })
      })
    })
  })
}))

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
  })
)

const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'Test Description',
  production_company: 'Test Company'
}

describe('Project Timecard Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ProjectTimecardWrapper', () => {
    it('renders children with project context', async () => {
      render(
        <ProjectTimecardWrapper projectId="test-project-id">
          {(project, isLoading, error) => (
            <div data-testid="project-content">
              {project ? project.name : 'Loading...'}
            </div>
          )}
        </ProjectTimecardWrapper>
      )

      // Should show loading initially
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })
  })

  describe('ProjectTimecardTabs', () => {
    it('renders tabs for admin user', () => {
      render(
        <ProjectTimecardTabs
          projectId="test-project-id"
          project={mockProject}
          userRole="admin"
        />
      )

      expect(screen.getByText('Breakdown')).toBeInTheDocument()
      expect(screen.getByText('Approve')).toBeInTheDocument()
      expect(screen.getByText('Summary')).toBeInTheDocument()
    })

    it('renders limited tabs for regular user', () => {
      render(
        <ProjectTimecardTabs
          projectId="test-project-id"
          project={mockProject}
          userRole="talent_escort"
        />
      )

      expect(screen.getByText('My Timecards')).toBeInTheDocument()
      expect(screen.queryByText('Approve')).not.toBeInTheDocument()
      expect(screen.queryByText('Summary')).not.toBeInTheDocument()
    })
  })

  describe('ProjectTimecardList', () => {
    it('renders with project context', () => {
      render(
        <ProjectTimecardList
          projectId="test-project-id"
          project={mockProject}
          userRole="admin"
          showUserColumn={true}
        />
      )

      // Should show loading initially
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })

    it('displays role badges in breakdown view when showUserColumn is true', async () => {
      // Mock fetch to return timecards with user data
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [{
              id: 'test-timecard',
              user_id: 'test-user',
              profiles: { full_name: 'Test User' },
              status: 'approved',
              total_hours: 8,
              total_pay: 200,
              pay_rate: 25,
              check_in_time: '2024-01-01T09:00:00Z',
              check_out_time: '2024-01-01T17:00:00Z',
              date: '2024-01-01'
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            assignments: [{
              user_id: 'test-user',
              role: 'talent_escort'
            }]
          })
        })

      render(
        <ProjectTimecardList
          projectId="test-project-id"
          project={mockProject}
          userRole="admin"
          showUserColumn={true}
        />
      )

      // Wait for data to load and check for role badge
      await screen.findByText('Test User')
      expect(screen.getByText('Talent Escort')).toBeInTheDocument()
    })
  })

  describe('ProjectTimecardApproval', () => {
    it('renders approval interface', () => {
      render(
        <ProjectTimecardApproval
          projectId="test-project-id"
          project={mockProject}
        />
      )

      // Should show loading initially
      expect(screen.getByText('No Timecards to Approve')).toBeInTheDocument()
    })

    it('displays role badge when timecard has user role', async () => {
      // Mock fetch to return timecard with user data
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: [{
              id: 'test-timecard',
              user_id: 'test-user',
              profiles: { full_name: 'Test User' },
              status: 'submitted',
              total_hours: 8,
              total_pay: 200,
              pay_rate: 25
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            assignments: [{
              user_id: 'test-user',
              role: 'supervisor'
            }]
          })
        })

      render(
        <ProjectTimecardApproval
          projectId="test-project-id"
          project={mockProject}
        />
      )

      // Wait for data to load and check for role badge
      await screen.findByText('Test User')
      expect(screen.getByText('Supervisor')).toBeInTheDocument()
    })
  })

  describe('ProjectPayrollSummary', () => {
    it('renders payroll summary', () => {
      render(
        <ProjectPayrollSummary
          projectId="test-project-id"
          project={mockProject}
        />
      )

      // Should show loading initially or empty state
      expect(screen.getByText('No Payroll Data')).toBeInTheDocument()
    })
  })
})