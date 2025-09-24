import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug API route called')
    
    // Step 1: Test basic response
    console.log('✅ Step 1: Basic response test')
    
    // Step 2: Test cookies
    const cookieStore = await cookies()
    console.log('✅ Step 2: Cookies accessed')
    
    // Step 3: Test Supabase client creation
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
    console.log('✅ Step 3: Supabase client created')
    
    // Step 4: Test simple database query
    const { data: simple, error: simpleError } = await supabase
      .from('timecard_headers')
      .select('id')
      .limit(1)
    
    if (simpleError) {
      console.error('❌ Step 4 failed:', simpleError)
      return NextResponse.json(
        { error: 'Database query failed', details: simpleError },
        { status: 500 }
      )
    }
    
    console.log('✅ Step 4: Database query successful')
    
    return NextResponse.json({
      success: true,
      message: 'Debug API working',
      steps: [
        'Basic response',
        'Cookies accessed', 
        'Supabase client created',
        'Database query successful'
      ],
      data: simple
    })

  } catch (error) {
    console.error('💥 Debug API error:', error)
    return NextResponse.json(
      { 
        error: 'Debug API failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}