import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Create project_attachments table using raw SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS project_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('file', 'note')),
        content TEXT,
        file_url TEXT,
        file_size BIGINT,
        mime_type VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID NOT NULL REFERENCES profiles(id)
      );

      CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON project_attachments(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_attachments_type ON project_attachments(type);

      ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

      CREATE POLICY IF NOT EXISTS "Users can view attachments for accessible projects" ON project_attachments
        FOR SELECT USING (
          project_id IN (
            SELECT id FROM projects
          )
        );

      CREATE POLICY IF NOT EXISTS "Users can manage attachments for accessible projects" ON project_attachments
        FOR ALL USING (
          project_id IN (
            SELECT id FROM projects
          )
        );
    `

    // Execute the SQL using a direct database connection
    const { error } = await supabase.rpc('exec', { sql: createTableSQL })

    if (error) {
      console.error('Error creating table:', error)
      return NextResponse.json(
        { error: 'Failed to create table', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'project_attachments table created successfully' 
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}