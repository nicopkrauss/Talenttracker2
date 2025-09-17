import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const attachmentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['file', 'note']),
  content: z.string().optional(),
  fileUrl: z.string().url().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
}).refine((data) => {
  if (data.type === 'file') {
    return data.fileUrl && data.fileSize && data.mimeType
  }
  if (data.type === 'note') {
    return data.content
  }
  return false
}, {
  message: "File attachments require fileUrl, fileSize, and mimeType. Note attachments require content."
})

export async function GET(
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check if user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Fetch project attachments - return empty array if table doesn't exist
    try {
      const { data: attachments, error: attachmentsError } = await supabase
        .from('project_attachments')
        .select(`
          id,
          name,
          type,
          content,
          file_url,
          file_size,
          mime_type,
          created_at,
          created_by_user:profiles!project_attachments_created_by_fkey(
            id,
            full_name
          )
        `)
        .eq('project_id', id)
        .order('created_at', { ascending: false })

      if (attachmentsError) {
        console.error('Error fetching attachments:', attachmentsError)
        // If table doesn't exist, return empty array instead of error
        if (attachmentsError.code === 'PGRST205') {
          console.log('project_attachments table not found, returning empty array')
          return NextResponse.json({ data: [] })
        }
        return NextResponse.json(
          { error: 'Failed to fetch attachments', code: 'FETCH_ERROR' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: attachments || []
      })
    } catch (error) {
      console.error('Attachments fetch error:', error)
      return NextResponse.json({ data: [] })
    }
  } catch (error) {
    console.error('Attachments API Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Validate request data first
    const body = await request.json()
    const validationResult = attachmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    // Check if user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const { name, type, content, fileUrl, fileSize, mimeType } = validationResult.data

    // Create attachment
    const { data: attachment, error: attachmentError } = await supabase
      .from('project_attachments')
      .insert({
        project_id: id,
        name,
        type,
        content,
        file_url: fileUrl,
        file_size: fileSize,
        mime_type: mimeType,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select(`
        id,
        name,
        type,
        content,
        file_url,
        file_size,
        mime_type,
        created_at,
        created_by_user:profiles!project_attachments_created_by_fkey(
          id,
          full_name
        )
      `)
      .single()

    if (attachmentError) {
      console.error('Error creating attachment:', attachmentError)
      return NextResponse.json(
        { error: 'Failed to create attachment', code: 'CREATE_ERROR' },
        { status: 500 }
      )
    }

    // Log the attachment creation
    await supabase
      .from('project_audit_log')
      .insert({
        project_id: id,
        user_id: user.id,
        action: type === 'file' ? 'file_uploaded' : 'note_added',
        details: {
          attachmentName: name,
          attachmentType: type,
        },
        created_at: new Date().toISOString(),
      })

    return NextResponse.json({ data: attachment })
  } catch (error) {
    console.error('Attachment Creation API Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}