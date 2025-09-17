require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMissingTables() {
  console.log('🔧 Creating missing database tables...')

  try {
    // Create project_settings table
    console.log('Creating project_settings table...')
    const { error: settingsError } = await supabase.rpc('exec_sql', {
      sql_query: `
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
      `
    })

    if (settingsError) {
      console.error('Error creating project_settings:', settingsError)
    } else {
      console.log('✅ project_settings table created')
    }

    // Create project_audit_log table
    console.log('Creating project_audit_log table...')
    const { error: auditError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS project_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES profiles(id),
          action VARCHAR(100) NOT NULL,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (auditError) {
      console.error('Error creating project_audit_log:', auditError)
    } else {
      console.log('✅ project_audit_log table created')
    }

    // Create project_attachments table
    console.log('Creating project_attachments table...')
    const { error: attachmentsError } = await supabase.rpc('exec_sql', {
      sql_query: `
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
      `
    })

    if (attachmentsError) {
      console.error('Error creating project_attachments:', attachmentsError)
    } else {
      console.log('✅ project_attachments table created')
    }

    // Create indexes
    console.log('Creating indexes...')
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE INDEX IF NOT EXISTS idx_project_audit_log_project_id ON project_audit_log(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_audit_log_created_at ON project_audit_log(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON project_attachments(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_attachments_type ON project_attachments(type);
      `
    })

    if (indexError) {
      console.error('Error creating indexes:', indexError)
    } else {
      console.log('✅ Indexes created')
    }

    // Enable RLS
    console.log('Enabling RLS...')
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE project_audit_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;
      `
    })

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError)
    } else {
      console.log('✅ RLS enabled')
    }

    // Create RLS policies
    console.log('Creating RLS policies...')
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Project settings policies
        CREATE POLICY "Users can view project settings for accessible projects" ON project_settings
          FOR SELECT USING (
            project_id IN (
              SELECT id FROM projects
            )
          );

        CREATE POLICY "Users can update project settings for accessible projects" ON project_settings
          FOR ALL USING (
            project_id IN (
              SELECT id FROM projects
            )
          );

        -- Audit log policies
        CREATE POLICY "Users can view audit log for accessible projects" ON project_audit_log
          FOR SELECT USING (
            project_id IN (
              SELECT id FROM projects
            )
          );

        CREATE POLICY "Users can insert audit log entries for accessible projects" ON project_audit_log
          FOR INSERT WITH CHECK (
            project_id IN (
              SELECT id FROM projects
            )
          );

        -- Attachments policies
        CREATE POLICY "Users can view attachments for accessible projects" ON project_attachments
          FOR SELECT USING (
            project_id IN (
              SELECT id FROM projects
            )
          );

        CREATE POLICY "Users can manage attachments for accessible projects" ON project_attachments
          FOR ALL USING (
            project_id IN (
              SELECT id FROM projects
            )
          );
      `
    })

    if (policyError) {
      console.error('Error creating policies:', policyError)
    } else {
      console.log('✅ RLS policies created')
    }

    console.log('🎉 All missing tables created successfully!')

  } catch (error) {
    console.error('❌ Error creating tables:', error)
    process.exit(1)
  }
}

createMissingTables()