import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params
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

    // Get attachment details before deletion for audit log
    const { data: attachment, error: attachmentFetchError } = await supabase
      .from('project_attachments')
      .select('id, name, type, file_url')
      .eq('id', attachmentId)
      .eq('project_id', id)
      .single()

    if (attachmentFetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found', code: 'ATTACHMENT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Delete from storage if it's a file
    if (attachment.type === 'file' && attachment.file_url) {
      try {
        // Extract file path from URL
        const url = new URL(attachment.file_url)
        const filePath = url.pathname.split('/').slice(-2).join('/') // Get bucket/path
        
        const { error: storageError } = await supabase.storage
          .from('project-attachments')
          .remove([filePath])

        if (storageError) {
          console.error('Error deleting file from storage:', storageError)
          // Continue with database deletion even if storage deletion fails
        }
      } catch (storageError) {
        console.error('Error parsing file URL for deletion:', storageError)
        // Continue with database deletion
      }
    }

    // Delete attachment from database
    const { error: deleteError } = await supabase
      .from('project_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('project_id', id)

    if (deleteError) {
      console.error('Error deleting attachment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete attachment', code: 'DELETE_ERROR' },
        { status: 500 }
      )
    }

    // Log the attachment deletion
    await supabase
      .from('project_audit_log')
      .insert({
        project_id: id,
        user_id: user.id,
        action: attachment.type === 'file' ? 'file_deleted' : 'note_deleted',
        details: {
          attachmentName: attachment.name,
          attachmentType: attachment.type,
        },
        created_at: new Date().toISOString(),
      })

    return NextResponse.json({ 
      message: 'Attachment deleted successfully',
      data: { id: attachmentId }
    })
  } catch (error) {
    console.error('Attachment Deletion API Error:', error)
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