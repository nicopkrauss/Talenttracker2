/**
 * Tests for Timecard Calculation API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST, PUT } from '../route'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          })),
          single: vi.fn()
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

// Mock calculation engine
vi.mock('@/lib/timecard-calculation-engine', () => ({
  createTimecardCalculationEngine: vi.fn(() => ({
    calculateTimecard: vi.fn(),
    applyBreakGracePeriod: vi.fn(),
    updateTimecardCalculations: vi.fn()
  }))
}))

const { createServerClient } = await import('@supabase/ssr')
const { createTimecardCalculationEngine } = await import('@/lib/timecard-calculation-engine')

describe('/api/timecards/calculate', () => {
  let mockSupabase: any
  let mockEngine: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn()
            })),
            single: vi.fn()
          }))
        }))
      }))
    }

    mockEngine = {
      calculateTimecard: vi.fn(),
      applyBreakGracePeriod: vi.fn(),
      updateTimecardCalculations: vi.fn()
    }

    ;(createServerClient as any).mockReturnValue(mockSupabase)
    ;(createTimecardCalculationEngine as any).mockReturnValue(mockEngine)
  })

  describe('POST /api/timecards/calculate', () => {
    it('should calculate timecard successfully', async () => {
      const requestData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z'
      }

      const request = new NextRequest('http://localhost:3000/api/timecards/calculate', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      // Mock team assignment check
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'assignment-1' },
        error: null
      })

      // Mock calculation result
      mockEngine.calculateTimecard.mockResolvedValue({
        total_hours: 8,
        break_duration: 0,
        total_pay: 200,
        is_valid: true,
        validation_errors: [],
        manually_edited_flag: false
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data.total_hours).toBe(8)
      expect(responseData.data.total_pay).toBe(200)
      expect(mockEngine.calculateTimecard).toHaveBeenCalled()
    })

    it('should apply grace period when requested', async () => {
      const requestData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        date: '2024-01-15',
        check_in_time: '2024-01-15T09:00:00Z',
        check_out_time: '2024-01-15T17:00:00Z',
        break_start_time: '2024-01-15T12:00:00Z',
        break_end_time: '2024-01-15T12:32:00Z',
        apply_grace_period: true,
        default_break_duration: 30
      }

      const request = new NextRequest('http://localhost:3000/api/timecards/calculate', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      // Mock team assignment check
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'assignment-1' },
        error: null
      })

      // Mock grace period application (returns default duration)
      mockEngine.applyBreakGracePeriod.mockReturnValue(30)

      // Mock calculation result
      mockEngine.calculateTimecard.mockResolvedValue({
        total_hours: 8,
        break_duration: 30,
        total_pay: 200,
        is_valid: true,
        validation_errors: [],
        manually_edited_flag: false
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(mockEngine.applyBreakGracePeriod).toHaveBeenCalledWith(
        '2024-01-15T12:00:00Z',
        '2024-01-15T12:32:00Z',
        30
      )
    })

    it('should return 401 for unauthenticated requests', async () => {
      const requestData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        date: '2024-01-15'
      }

      const request = new NextRequest('http://localhost:3000/api/timecards/calculate', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      // Mock authentication failure
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toBe('Unauthorized')
      expect(responseData.code).toBe('UNAUTHORIZED')
    })

    it('should return 400 for invalid request data', async () => {
      const requestData = {
        user_id: 'invalid-uuid',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        date: 'invalid-date'
      }

      const request = new NextRequest('http://localhost:3000/api/timecards/calculate', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Validation failed')
      expect(responseData.code).toBe('VALIDATION_ERROR')
      expect(responseData.details).toBeDefined()
    })

    it('should return 403 for unauthorized project access', async () => {
      const requestData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        date: '2024-01-15'
      }

      const request = new NextRequest('http://localhost:3000/api/timecards/calculate', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      // Mock no team assignment (access denied)
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: new Error('Not found')
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.error).toBe('Access denied to project')
      expect(responseData.code).toBe('ACCESS_DENIED')
    })

    it('should return 400 for calculation errors', async () => {
      const requestData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        date: '2024-01-15',
        check_in_time: '2024-01-15T17:00:00Z',
        check_out_time: '2024-01-15T09:00:00Z' // Invalid: check-out before check-in
      }

      const request = new NextRequest('http://localhost:3000/api/timecards/calculate', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      // Mock team assignment check
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'assignment-1' },
        error: null
      })

      // Mock calculation failure
      mockEngine.calculateTimecard.mockResolvedValue({
        total_hours: 0,
        break_duration: 0,
        total_pay: 0,
        is_valid: false,
        validation_errors: ['Check-out time must be after check-in time'],
        manually_edited_flag: false
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Calculation failed')
      expect(responseData.code).toBe('CALCULATION_ERROR')
      expect(responseData.details).toContain('Check-out time must be after check-in time')
    })
  })

  describe('PUT /api/timecards/calculate', () => {
    it('should update timecard calculations successfully', async () => {
      const requestData = {
        timecard_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const request = new NextRequest('http://localhost:3000/api/timecards/calculate', {
        method: 'PUT',
        body: JSON.stringify(requestData)
      })

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      // Mock successful update
      mockEngine.updateTimecardCalculations.mockResolvedValue(true)

      // Mock fetch updated timecard
      const updatedTimecard = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        total_hours: 8,
        total_pay: 200,
        updated_at: '2024-01-15T18:00:00Z'
      }
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: updatedTimecard,
        error: null
      })

      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data).toEqual(updatedTimecard)
      expect(mockEngine.updateTimecardCalculations).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000'
      )
    })

    it('should return 400 for failed updates', async () => {
      const requestData = {
        timecard_id: '123e4567-e89b-12d3-a456-426614174000'
      }

      const request = new NextRequest('http://localhost:3000/api/timecards/calculate', {
        method: 'PUT',
        body: JSON.stringify(requestData)
      })

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      // Mock failed update
      mockEngine.updateTimecardCalculations.mockResolvedValue(false)

      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Failed to update timecard calculations')
      expect(responseData.code).toBe('UPDATE_FAILED')
    })

    it('should return 400 for invalid timecard ID', async () => {
      const requestData = {
        timecard_id: 'invalid-uuid'
      }

      const request = new NextRequest('http://localhost:3000/api/timecards/calculate', {
        method: 'PUT',
        body: JSON.stringify(requestData)
      })

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      const response = await PUT(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Validation failed')
      expect(responseData.code).toBe('VALIDATION_ERROR')
    })
  })
})