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

    // Get the uploaded file from form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', code: 'NO_FILE' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${id}/${timestamp}_${sanitizedFileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', code: 'UPLOAD_ERROR' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-attachments')
      .getPublicUrl(fileName)

    // Create attachment record in database
    const { data: attachment, error: attachmentError } = await supabase
      .from('project_attachments')
      .insert({
        project_id: id,
        name: file.name,
        type: 'file',
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
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
      console.error('Error creating attachment record:', attachmentError)
      
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('project-attachments')
        .remove([fileName])

      return NextResponse.json(
        { error: 'Failed to create attachment record', code: 'DB_ERROR' },
        { status: 500 }
      )
    }

    // Log the file upload
    await supabase
      .from('project_audit_log')
      .insert({
        project_id: id,
        user_id: user.id,
        action: 'file_uploaded',
        details: {
          attachmentName: file.name,
          attachmentType: 'file',
          fileSize: file.size,
          mimeType: file.type,
        },
        created_at: new Date().toISOString(),
      })

    return NextResponse.json({ 
      data: attachment,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('File Upload API Error:', error)
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