-- Create project_attachments table for file metadata
CREATE TABLE IF NOT EXISTS project_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('file', 'note')),
  content TEXT, -- For notes
  file_url TEXT, -- For files
  file_size BIGINT, -- File size in bytes
  mime_type VARCHAR(100), -- MIME type for files
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES profiles(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_type ON project_attachments(type);

-- Enable RLS
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage attachments for accessible projects" ON project_attachments
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects -- Uses existing project access policy
    )
  );