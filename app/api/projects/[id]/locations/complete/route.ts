import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update the project setup checklist
    const { data: checklist, error: checklistError } = await supabase
      .from('project_setup_checklist')
      .upsert({
        project_id: id,
        locations_completed: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      })
      .select('*')
      .single()

    if (checklistError) {
      console.error('Error updating checklist:', checklistError)
      return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 })
    }

    return NextResponse.json({ data: checklist })
  } catch (error) {
    console.error('Error updating locations checklist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}