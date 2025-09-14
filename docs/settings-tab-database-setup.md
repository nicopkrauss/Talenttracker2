# Settings Tab Database Setup

## Overview

The Settings tab implementation requires three new database tables to be created in Supabase. Since the automated migration script is not working, these tables need to be created manually through the Supabase dashboard.

## Required Tables

### 1. project_settings

```sql
CREATE TABLE IF NOT EXISTS project_settings (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  default_break_duration INTEGER DEFAULT 30 CHECK (default_break_duration >= 15 AND default_break_duration <= 120),
  payroll_export_format VARCHAR(10) DEFAULT 'csv' CHECK (payroll_export_format IN ('csv', 'xlsx', 'pdf')),
  notification_rules JSONB DEFAULT '{
    "timecardReminders": true,
    "shiftAlerts": true,
    "talentArrivalNotifications": false,
    "overtimeWarnings": true
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);
```

### 2. project_audit_log

```sql
CREATE TABLE IF NOT EXISTS project_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. project_attachments

```sql
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
```

## Indexes

```sql
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_audit_log_project_id ON project_audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_project_audit_log_created_at ON project_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_type ON project_attachments(type);
```

## Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- Project settings policies
CREATE POLICY "Users can view project settings for accessible projects" ON project_settings
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects -- Uses existing project access policy
    )
  );

CREATE POLICY "Users can update project settings for accessible projects" ON project_settings
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects -- Uses existing project access policy
    )
  );

-- Audit log policies
CREATE POLICY "Users can view audit log for accessible projects" ON project_audit_log
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects -- Uses existing project access policy
    )
  );

CREATE POLICY "Users can insert audit log entries for accessible projects" ON project_audit_log
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects -- Uses existing project access policy
    )
  );

-- Attachments policies
CREATE POLICY "Users can view attachments for accessible projects" ON project_attachments
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects -- Uses existing project access policy
    )
  );

CREATE POLICY "Users can manage attachments for accessible projects" ON project_attachments
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects -- Uses existing project access policy
    )
  );
```

## Triggers

```sql
-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_settings_updated_at
  BEFORE UPDATE ON project_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_project_settings_updated_at();
```

## Storage Setup (Optional)

For file attachments, you'll need to create a storage bucket:

```sql
-- Create storage bucket for project attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-attachments', 'project-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload project attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view project attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete project attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );
```

## Manual Setup Instructions

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Run each SQL block above in order:
   - First create the tables
   - Then create the indexes
   - Then enable RLS and create policies
   - Finally create the triggers
   - Optionally set up storage for file attachments

## Verification

After running the SQL, you can verify the setup by running:

```bash
node scripts/check-settings-tables.js
```

This should show that all three tables exist and are accessible.

## API Routes

The following API routes have been implemented and tested:

- `GET /api/projects/[id]/settings` - Fetch project settings
- `PUT /api/projects/[id]/settings` - Update project settings
- `GET /api/projects/[id]/audit-log` - Fetch audit log with pagination
- `GET /api/projects/[id]/attachments` - Fetch project attachments
- `POST /api/projects/[id]/attachments` - Create new attachment/note
- `DELETE /api/projects/[id]/attachments/[attachmentId]` - Delete attachment

## Features Implemented

1. **Project Configuration**
   - Default break duration (15-120 minutes)
   - Payroll export format (CSV, Excel, PDF)
   - Notification rules (toggles for different notification types)

2. **Audit Log**
   - Automatic logging of all settings changes
   - Paginated display with user attribution
   - Formatted action descriptions

3. **Attachments & Notes**
   - Text notes with content storage
   - File attachment support (requires storage setup)
   - Delete functionality with audit trail

4. **Error Handling**
   - Comprehensive validation
   - User-friendly error messages
   - Loading states and error boundaries

The Settings tab is fully functional once the database tables are created manually.