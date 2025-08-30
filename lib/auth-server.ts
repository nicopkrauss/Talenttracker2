import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { UserProfile } from '@/lib/types'

/**
 * Server-side authentication utilities for secure user validation
 */

export async function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export async function getServerUser() {
  const supabase = await createServerSupabaseClient()
  
  // Use getUser() for secure server-side validation
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function getServerUserProfile(): Promise<UserProfile | null> {
  const user = await getServerUser()
  
  if (!user) {
    return null
  }
  
  const supabase = await createServerSupabaseClient()
  
  const { data: userProfile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error || !userProfile) {
    return null
  }
  
  return userProfile
}

export async function requireAuth() {
  const user = await getServerUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

export async function requireApprovedUser() {
  const userProfile = await getServerUserProfile()
  
  if (!userProfile) {
    redirect('/login')
  }
  
  if (userProfile.status === 'pending') {
    redirect('/pending')
  }
  
  if (userProfile.status === 'rejected') {
    redirect('/login?error=account-rejected')
  }
  
  if (userProfile.status !== 'approved' && userProfile.status !== 'active') {
    redirect('/pending')
  }
  
  return userProfile
}

export async function requireAdminUser() {
  const userProfile = await requireApprovedUser()
  
  if (userProfile.role !== 'admin' && userProfile.role !== 'in_house') {
    redirect('/talent') // Redirect to default route for non-admin users
  }
  
  return userProfile
}