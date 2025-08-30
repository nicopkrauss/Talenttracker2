/**
 * Basic authentication security utilities
 * Simple logging and rate limiting for internal tool
 */

import { createClient } from '@supabase/supabase-js'

// Only create Supabase client if environment variables are available
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

// Simple in-memory rate limiting for development
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Simple rate limiting check
 */
export function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const key = identifier
  const current = rateLimitStore.get(key)

  // Clean up expired entries
  if (current && now > current.resetTime) {
    rateLimitStore.delete(key)
  }

  const entry = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs }
  
  if (entry.count >= maxAttempts) {
    return false // Rate limited
  }

  entry.count++
  rateLimitStore.set(key, entry)
  return true // Allowed
}

/**
 * Log authentication events for debugging
 */
export async function logAuthEvent(event: {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'registration' | 'approval'
  email?: string
  userId?: string
  ipAddress?: string
  details?: string
}): Promise<void> {
  try {
    // For an internal tool, simple console logging is sufficient
    console.log(`[AUTH] ${event.type}:`, {
      email: event.email,
      userId: event.userId,
      ip: event.ipAddress,
      details: event.details,
      timestamp: new Date().toISOString()
    })

    // Optionally store in database for admin review if needed
    // This is much simpler than the complex security monitoring system
    if (process.env.NODE_ENV === 'production' && supabase) {
      await supabase
        .from('auth_logs')
        .insert({
          event_type: event.type,
          email: event.email,
          user_id: event.userId,
          ip_address: event.ipAddress,
          details: event.details,
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Failed to log auth event:', error)
    // Don't throw - logging failures shouldn't break auth
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}