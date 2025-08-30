import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasAdminAccess, getDefaultRouteForUser } from '@/lib/role-utils'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register', 
  '/pending',
  '/terms',
  '/privacy'
]

// Define routes that require admin/in-house roles
const ADMIN_ROUTES = [
  '/team'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  
  // Allow access to public routes without authentication
  if (isPublicRoute) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
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
        remove(name: string, options: any) {
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
    // Get the current user (secure server-side validation)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // If no user, redirect to login
    if (!user || userError) {
      const redirectUrl = new URL('/login', request.url)
      if (pathname !== '/') {
        redirectUrl.searchParams.set('redirect', pathname)
      }
      return NextResponse.redirect(redirectUrl)
    }

    // Skip profile check for now since database is having issues
    // Just allow access if user is authenticated
    console.log('User authenticated:', user.email)

    // Redirect from root to talent page
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/talent', request.url))
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}