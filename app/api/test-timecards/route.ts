import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test API route called')
    
    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    console.log('✅ Supabase client created')

    // Test 1: Simple query
    console.log('🔍 Testing simple query...')
    const { data: simple, error: simpleError } = await supabase
      .from('timecard_headers')
      .select('id, user_id, status')
      .limit(1)

    if (simpleError) {
      console.error('❌ Simple query failed:', simpleError)
      return NextResponse.json(
        { error: 'Simple query failed', details: simpleError },
        { status: 500 }
      )
    }

    console.log('✅ Simple query successful:', simple)

    // Test 2: Full query like the main API
    console.log('🔍 Testing full query...')
    const { data: timecards, error: fetchError } = await supabase
      .from('timecard_headers')
      .select(`
        id,
        user_id,
        project_id,
        status,
        total_hours,
        user_profile:profiles!user_id(full_name),
        project_info:projects!project_id(name)
      `)
      .limit(1)

    if (fetchError) {
      console.error('❌ Full query failed:', fetchError)
      return NextResponse.json(
        { error: 'Full query failed', details: fetchError },
        { status: 500 }
      )
    }

    console.log('✅ Full query successful:', timecards)

    return NextResponse.json({
      success: true,
      message: 'Test API working',
      data: {
        simple,
        timecards
      }
    })

  } catch (error) {
    console.error('💥 Test API error:', error)
    return NextResponse.json(
      { 
        error: 'Test API failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}