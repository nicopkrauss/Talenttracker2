-- Create global_settings table with individual columns
-- Migration: 031_create_global_settings_table.sql

-- Create the global_settings table
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Break duration settings (in minutes)
  default_escort_break_minutes INTEGER NOT NULL DEFAULT 30 CHECK (default_escort_break_minutes > 0),
  default_staff_break_minutes INTEGER NOT NULL DEFAULT 60 CHECK (default_staff_break_minutes > 0),
  
  -- Timecard notification settings
  timecard_reminder_frequency_days INTEGER NOT NULL DEFAULT 1 CHECK (timecard_reminder_frequency_days > 0),
  submission_opens_on_show_day BOOLEAN NOT NULL DEFAULT true,
  
  -- Shift limit settings
  max_hours_before_stop INTEGER NOT NULL DEFAULT 20 CHECK (max_hours_before_stop BETWEEN 12 AND 24),
  overtime_warning_hours INTEGER NOT NULL DEFAULT 12 CHECK (overtime_warning_hours BETWEEN 8 AND 16),
  
  -- System settings
  archive_date_month INTEGER NOT NULL DEFAULT 12 CHECK (archive_date_month BETWEEN 1 AND 12),
  archive_date_day INTEGER NOT NULL DEFAULT 31 CHECK (archive_date_day BETWEEN 1 AND 31),
  post_show_transition_time TIME NOT NULL DEFAULT '06:00:00',
  
  -- Role permissions
  in_house_can_approve_timecards BOOLEAN NOT NULL DEFAULT true,
  in_house_can_initiate_checkout BOOLEAN NOT NULL DEFAULT true,
  in_house_can_manage_projects BOOLEAN NOT NULL DEFAULT true,
  supervisor_can_approve_timecards BOOLEAN NOT NULL DEFAULT false,
  supervisor_can_initiate_checkout BOOLEAN NOT NULL DEFAULT true,
  coordinator_can_approve_timecards BOOLEAN NOT NULL DEFAULT false,
  coordinator_can_initiate_checkout BOOLEAN NOT NULL DEFAULT false,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Create an index on updated_at for audit purposes
CREATE INDEX IF NOT EXISTS idx_global_settings_updated_at ON global_settings(updated_at);

-- Insert default settings (only one row should exist)
INSERT INTO global_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Add RLS policy for admin access only
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read global settings
CREATE POLICY "Admins can read global settings" ON global_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy: Only admins can update global settings
CREATE POLICY "Admins can update global settings" ON global_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_global_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_global_settings_updated_at
  BEFORE UPDATE ON global_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_global_settings_updated_at();