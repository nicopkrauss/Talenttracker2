import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { TalentProfileForm } from '../talent-profile-form'
import { TalentLocationTracker } from '../talent-location-tracker'
import { TalentProjectManager } from '../talent-project-manager'

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
      select: vi.fn(() => ({ order: vi.fn(() => ({ data: [], error: null })) })),
      insert: vi.fn(() => ({ error: null }))
    })),
    auth: {
      getUser: vi.fn(() => ({ data: { user: { id: 'test-user' } } }))
    }
  }))
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '5 minutes')
}))

const mockTalent = {
  id: 'test-talent-id',
  first_name: 'John',
  last_name: 'Doe',
  rep_name: 'Jane Smith',
  rep_email: 'jane@example.com',
  rep_phone: '555-123-4567',
  notes: 'Test notes'
}

describe('Talent Components Theme Migration', () => {
  it('should render TalentProfileForm with theme-aware error states', () => {
    const { container } = render(
      <TalentProfileForm talent={mockTalent} onUpdate={() => {}} />
    )
    
    // Check that error border classes include dark variants
    const inputs = container.querySelectorAll('input')
    inputs.forEach(input => {
      const className = input.className
      if (className.includes('border-red-500')) {
        expect(className).toContain('dark:border-red-400')
      }
    })
  })

  // NOTE: TalentLocationTracker is for PROJECT-SPECIFIC use only
  // It should not be used in global talent profile contexts
  it('should render TalentLocationTracker with theme-aware colors (project context only)', () => {
    const mockCurrentStatus = {
      id: 'status-1',
      talent_id: 'test-id',
      project_id: 'project-1',
      current_location_id: 'loc-1',
      status: 'on_location' as const,
      last_updated: new Date().toISOString(),
      updated_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_location: {
        id: 'loc-1',
        project_id: 'project-1',
        name: 'Stage A',
        color: '#3b82f6',
        is_default: false,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    const { container } = render(
      <TalentLocationTracker
        talentId="test-id"
        projectId="project-1"
        currentStatus={mockCurrentStatus}
        onLocationUpdate={() => {}}
      />
    )
    
    // Check for theme-aware muted text
    const mutedElements = container.querySelectorAll('.text-muted-foreground')
    expect(mutedElements.length).toBeGreaterThan(0)
    
    // Check for theme-aware success badge
    const badge = container.querySelector('.bg-green-50')
    expect(badge?.className).toContain('dark:bg-green-950/20')
  })

  it('should render TalentProjectManager with theme-aware colors', () => {
    const { container } = render(
      <TalentProjectManager talent={mockTalent} onUpdate={() => {}} />
    )
    
    // Check for theme-aware loading skeleton
    const skeletonElements = container.querySelectorAll('.bg-muted')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })
})