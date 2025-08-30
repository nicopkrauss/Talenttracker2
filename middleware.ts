import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { UserProfile, SystemRole, ProjectRole, UserRole } from './lib/types'

/**
 * New Middleware for Server-Side Authentication Protection
 * Task 5.1: Create new middleware for server-side protection
 * 
 * Features:
 * - Secure middleware with proper Supabase server client
 * - Session validation and user authentication checking
 * - Role-based route protection for admin and protected routes
 * - Proper redirect logic with return URL handling
 */

// Route configuration
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/terms',
  '/privacy'
]

const ADMIN_ROUTES = [
  '/admin',
  '/team',
  '/projects'
]

const PROTECTED_ROUTES = [
  '/talent',
  '/timecards',
  '/profile'
]

// API routes that are public (no authentication required)
const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/auth/profile' // Allow profile fetching during authentication
]

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  '/api/projects',
  '/api/talent',
  '/api/timecards',
  '/api/notifications'
]

// API routes that require admin access
const ADMIN_API_ROUTES = [
  '/api/admin',
  '/api/projects',
  '/api/notifications/send-email'
]

/**
 * Check if a route is public (no authentication required)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(route)
  })
}

/**
 * Check if a route requires admin access
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if a route is protected (requires authentication)
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route)) || 
         isAdminRoute(pathname)
}

/**
 * Check if an API route is public (no authentication required)
 */
function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if an API route requires authentication
 */
function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if an API route requires admin access
 */
function isAdminApiRoute(pathname: string): boolean {
  return ADMIN_API_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if user has admin access
 */
function hasAdminAccess(systemRole: SystemRole | null): boolean {
  return systemRole === 'admin' || systemRole === 'in_house'
}

/**
 * Get user profile from database
 */
async function getUserProfile(supabase: any, userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

/**
 * Create redirect response with return URL
 */
function createRedirectResponse(
  request: NextRequest,
  redirectTo: string,
  preserveReturnUrl: boolean = true
): NextResponse {
  const url = new URL(redirectTo, request.url)
  
  if (preserveReturnUrl && !isPublicRoute(request.nextUrl.pathname)) {
    url.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search)
  }
  
  return NextResponse.redirect(url)
}

/**
 * Create API error response
 */
function createApiErrorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message, code: 'AUTHENTICATION_ERROR' },
    { status }
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }



  // Create response object
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    // Get authenticated user from Supabase (more secure than getSession)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      // Only log actual errors, not expected "no session" states
      if (!userError.message?.includes('session missing') && userError.message !== 'Auth session missing!') {
        console.error('User authentication error:', userError)
      }
      
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return createApiErrorResponse('Authentication validation failed', 401)
      }
      
      // For protected routes, redirect to login
      if (isProtectedRoute(pathname)) {
        return createRedirectResponse(request, '/login')
      }
      
      return response
    }

    // Handle public routes (web pages)
    if (isPublicRoute(pathname)) {
      // If user is authenticated and trying to access login/register, redirect to appropriate page
      if (user && (pathname === '/login' || pathname === '/register')) {
        const userProfile = await getUserProfile(supabase, user.id)
        
        if (userProfile?.status === 'pending') {
          return NextResponse.redirect(new URL('/pending', request.url))
        } else if (userProfile?.status === 'active') {
          // Redirect to return URL or default route based on role
          const returnUrl = request.nextUrl.searchParams.get('returnUrl')
          if (returnUrl && !isPublicRoute(returnUrl)) {
            return NextResponse.redirect(new URL(returnUrl, request.url))
          }
          
          // Default redirect based on role
          const defaultRoute = hasAdminAccess(userProfile.role) ? '/projects' : '/talent'
          return NextResponse.redirect(new URL(defaultRoute, request.url))
        }
      }
      
      return response
    }

    // Handle public API routes (no authentication required)
    if (pathname.startsWith('/api/') && isPublicApiRoute(pathname)) {
      return response
    }

    // Check if user is authenticated for protected routes
    if (!user) {

      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return createApiErrorResponse('Authentication required', 401)
      }
      
      // For protected routes, redirect to login
      return createRedirectResponse(request, '/login')
    }

    // Get user profile for role-based access control
    const userProfile = await getUserProfile(supabase, user.id)
    
    if (!userProfile) {
      console.error('User profile not found for authenticated user:', user.id)
      
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return createApiErrorResponse('User profile not found', 403)
      }
      
      // For web routes, redirect to login
      return createRedirectResponse(request, '/login', false)
    }

    // Check if user is approved
    if (userProfile.status === 'pending') {
      // Allow access to pending page
      if (pathname === '/pending') {
        return response
      }
      
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return createApiErrorResponse('Account pending approval', 403)
      }
      
      // Redirect to pending page
      return NextResponse.redirect(new URL('/pending', request.url))
    }

    if (userProfile.status !== 'active') {
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return createApiErrorResponse('Account not active', 403)
      }
      
      // Redirect to login
      return createRedirectResponse(request, '/login', false)
    }

    // Handle admin route protection
    if (isAdminRoute(pathname) || isAdminApiRoute(pathname)) {
      if (!hasAdminAccess(userProfile.role)) {
        // For API routes, return JSON error
        if (pathname.startsWith('/api/')) {
          return createApiErrorResponse('Admin access required', 403)
        }
        
        // Redirect to appropriate page based on user role
        const defaultRoute = '/talent'
        return NextResponse.redirect(new URL(defaultRoute, request.url))
      }
    }

    // Handle protected API routes
    if (isProtectedApiRoute(pathname)) {
      // User is authenticated and approved, allow access
      return response
    }

    // Add user information to request headers for use in API routes
    if (pathname.startsWith('/api/')) {
      response.headers.set('x-user-id', user.id)
      response.headers.set('x-user-email', user.email || '')
      response.headers.set('x-user-role', userProfile.role || 'none')
      response.headers.set('x-user-status', userProfile.status)
    }

    return response

  } catch (error) {
    console.error('Middleware error:', error)
    
    // For API routes, return JSON error
    if (pathname.startsWith('/api/')) {
      return createApiErrorResponse('Internal server error', 500)
    }
    
    // For protected routes, redirect to login
    if (isProtectedRoute(pathname)) {
      return createRedirectResponse(request, '/login', false)
    }
    
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}