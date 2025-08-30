/**
 * Tests for basic authentication security utilities
 */

import { checkRateLimit, logAuthEvent, getClientIP } from '../auth-security'

import { vi } from 'vitest'

// Mock console.log to avoid noise in tests
const originalConsoleLog = console.log
beforeAll(() => {
  console.log = vi.fn()
})

afterAll(() => {
  console.log = originalConsoleLog
})

describe('Auth Security Utils', () => {
  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit store between tests
      const rateLimitStore = (global as any).rateLimitStore
      if (rateLimitStore) {
        rateLimitStore.clear()
      }
    })

    it('should allow requests under the limit', () => {
      const identifier = 'test-ip-1'
      
      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(identifier, 5)).toBe(true)
      }
    })

    it('should block requests over the limit', () => {
      const identifier = 'test-ip-2'
      
      // First 5 requests allowed
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier, 5)
      }
      
      // 6th request should be blocked
      expect(checkRateLimit(identifier, 5)).toBe(false)
    })

    it('should reset after time window expires', () => {
      const identifier = 'test-ip-3'
      const shortWindow = 100 // 100ms
      
      // Fill up the limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(identifier, 3, shortWindow)
      }
      
      // Should be blocked
      expect(checkRateLimit(identifier, 3, shortWindow)).toBe(false)
      
      // Wait for window to expire
      return new Promise(resolve => {
        setTimeout(() => {
          // Should be allowed again
          expect(checkRateLimit(identifier, 3, shortWindow)).toBe(true)
          resolve(undefined)
        }, 150)
      })
    })

    it('should handle different identifiers separately', () => {
      const ip1 = 'test-ip-4'
      const ip2 = 'test-ip-5'
      
      // Fill limit for ip1
      for (let i = 0; i < 3; i++) {
        checkRateLimit(ip1, 3)
      }
      
      // ip1 should be blocked
      expect(checkRateLimit(ip1, 3)).toBe(false)
      
      // ip2 should still be allowed
      expect(checkRateLimit(ip2, 3)).toBe(true)
    })
  })

  describe('logAuthEvent', () => {
    it('should log basic auth events', async () => {
      const mockConsoleLog = console.log as any
      
      await logAuthEvent({
        type: 'login_attempt',
        email: 'test@example.com',
        ipAddress: '192.168.1.1'
      })
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[AUTH] login_attempt:',
        expect.objectContaining({
          email: 'test@example.com',
          ip: '192.168.1.1',
          timestamp: expect.any(String)
        })
      )
    })

    it('should handle missing optional fields', async () => {
      const mockConsoleLog = console.log as any
      
      await logAuthEvent({
        type: 'registration'
      })
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[AUTH] registration:',
        expect.objectContaining({
          email: undefined,
          userId: undefined,
          ip: undefined,
          details: undefined,
          timestamp: expect.any(String)
        })
      )
    })

    it('should not throw on logging errors', async () => {
      // This should not throw even if there are internal errors
      await expect(logAuthEvent({
        type: 'login_success',
        email: 'test@example.com'
      })).resolves.not.toThrow()
    })
  })

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      })
      
      expect(getClientIP(request)).toBe('192.168.1.1')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '192.168.1.2'
        }
      })
      
      expect(getClientIP(request)).toBe('192.168.1.2')
    })

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2'
        }
      })
      
      expect(getClientIP(request)).toBe('192.168.1.1')
    })

    it('should return unknown when no IP headers present', () => {
      const request = new Request('http://localhost')
      
      expect(getClientIP(request)).toBe('unknown')
    })

    it('should handle malformed forwarded header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': ''
        }
      })
      
      expect(getClientIP(request)).toBe('unknown')
    })
  })
})