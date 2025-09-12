import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock the schedule utilities
vi.mock('@/lib/schedule-utils', () => ({
  createProjectScheduleFromStrings: vi.fn((startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    return {
      startDate: start,
      endDate: end,
      isSingleDay: start.getTime() === end.getTime(),
      rehearsalDates: start.getTime() === end.getTime() ? [] : [start],
      showDates: [end],
      allDates: start.getTime() === end.getTime() ? [start] : [start, end]
    }
  })
}))

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'test-project-id',
              name: 'Test Project',
              start_date: '2024-03-15',
              end_date: '2024-03-17',
              status: 'prep'
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}))

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-cookie' }))
  }))
}))

describe('GET /api/projects/[id]/schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return calculated project schedule', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/schedule')
    const params = { id: 'test-project-id' }

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toBeDefined()
    expect(data.data.projectId).toBe('test-project-id')
    expect(data.data.projectName).toBe('Test Project')
    expect(data.data.schedule).toBeDefined()
    expect(data.data.schedule.isSingleDay).toBe(false)
    expect(data.data.schedule.totalDays).toBeDefined()
  })

  it('should handle schedule calculation logic correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects/test-project-id/schedule')
    const params = { id: 'test-project-id' }

    const response = await GET(request, { params })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.schedule.rehearsalDates).toBeDefined()
    expect(data.data.schedule.showDates).toBeDefined()
    expect(data.data.schedule.allDates).toBeDefined()
    expect(data.data.schedule.rehearsalDaysCount).toBeDefined()
    expect(data.data.schedule.showDaysCount).toBeDefined()
  })
})