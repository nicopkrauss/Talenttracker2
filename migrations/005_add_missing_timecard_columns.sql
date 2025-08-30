-- Migration: Add Missing Timecard Columns
-- Description: Add all the missing columns to the existing timecards table
-- Date: 2025-01-29

BEGIN;

-- First, create the schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rollback_sql TEXT,
  notes TEXT
);

-- Add missing columns to timecards table
ALTER TABLE timecards 
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS check_in_time TIME,
ADD COLUMN IF NOT EXISTS check_out_time TIME,
ADD COLUMN IF NOT EXISTS break_start_time TIME,
ADD COLUMN IF NOT EXISTS break_end_time TIME,
ADD COLUMN IF NOT EXISTS total_hours DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS break_duration DECIMAL(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pay_rate DECIMAL(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pay DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS supervisor_comments TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);

-- Update the status column to have proper constraints if needed
DO $$
BEGIN
  -- Check if the status column has the right constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%status%' 
    AND conrelid = 'timecards'::regclass
  ) THEN
    -- Add status constraint
    ALTER TABLE timecards 
    ADD CONSTRAINT chk_timecard_status 
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'));
  END IF;
END $$;

-- Add constraints for data integrity (using DO blocks to check if they exist)
DO $$
BEGIN
  -- Add timecard times constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_timecard_times' 
    AND conrelid = 'timecards'::regclass
  ) THEN
    ALTER TABLE timecards 
    ADD CONSTRAINT chk_timecard_times CHECK (
      (check_in_time IS NULL AND check_out_time IS NULL) OR
      (check_in_time IS NOT NULL AND check_out_time IS NOT NULL AND check_out_time > check_in_time)
    );
  END IF;

  -- Add break times constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_break_times' 
    AND conrelid = 'timecards'::regclass
  ) THEN
    ALTER TABLE timecards 
    ADD CONSTRAINT chk_break_times CHECK (
      (break_start_time IS NULL AND break_end_time IS NULL) OR
      (break_start_time IS NOT NULL AND break_end_time IS NOT NULL AND break_end_time > break_start_time)
    );
  END IF;

  -- Add positive hours constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_positive_hours' 
    AND conrelid = 'timecards'::regclass
  ) THEN
    ALTER TABLE timecards 
    ADD CONSTRAINT chk_positive_hours CHECK (total_hours >= 0);
  END IF;

  -- Add positive break constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_positive_break' 
    AND conrelid = 'timecards'::regclass
  ) THEN
    ALTER TABLE timecards 
    ADD CONSTRAINT chk_positive_break CHECK (break_duration >= 0);
  END IF;

  -- Add positive pay rate constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_positive_pay_rate' 
    AND conrelid = 'timecards'::regclass
  ) THEN
    ALTER TABLE timecards 
    ADD CONSTRAINT chk_positive_pay_rate CHECK (pay_rate >= 0);
  END IF;

  -- Add positive total pay constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_positive_total_pay' 
    AND conrelid = 'timecards'::regclass
  ) THEN
    ALTER TABLE timecards 
    ADD CONSTRAINT chk_positive_total_pay CHECK (total_pay >= 0);
  END IF;
END $$;

-- Add unique constraint to prevent duplicate timecards for same user/project/date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'timecards_user_project_date_unique'
    AND conrelid = 'timecards'::regclass
  ) THEN
    ALTER TABLE timecards 
    ADD CONSTRAINT timecards_user_project_date_unique 
    UNIQUE(user_id, project_id, date);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_timecards_user_id ON timecards(user_id);
CREATE INDEX IF NOT EXISTS idx_timecards_project_id ON timecards(project_id);
CREATE INDEX IF NOT EXISTS idx_timecards_date ON timecards(date);
CREATE INDEX IF NOT EXISTS idx_timecards_status ON timecards(status);
CREATE INDEX IF NOT EXISTS idx_timecards_submitted_at ON timecards(submitted_at);
CREATE INDEX IF NOT EXISTS idx_timecards_approved_by ON timecards(approved_by);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_timecards_user_status ON timecards(user_id, status);
CREATE INDEX IF NOT EXISTS idx_timecards_project_status ON timecards(project_id, status);
CREATE INDEX IF NOT EXISTS idx_timecards_user_date ON timecards(user_id, date);

-- Create or replace trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_timecards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_timecards_updated_at ON timecards;
CREATE TRIGGER trigger_timecards_updated_at
  BEFORE UPDATE ON timecards
  FOR EACH ROW
  EXECUTE FUNCTION update_timecards_updated_at();

-- Create or replace timecard_summary view for reporting
CREATE OR REPLACE VIEW timecard_summary AS
SELECT 
  t.user_id,
  p.full_name as user_name,
  pr.name as project_name,
  SUM(t.total_hours) as total_hours,
  SUM(t.total_pay) as total_pay,
  COUNT(*) as timecard_count,
  COUNT(CASE WHEN t.status = 'submitted' THEN 1 END) as pending_count
FROM timecards t
JOIN profiles p ON t.user_id = p.id
JOIN projects pr ON t.project_id = pr.id
WHERE t.status IN ('approved', 'submitted')
GROUP BY t.user_id, p.full_name, pr.name, t.project_id;

-- Record migration in tracking table
INSERT INTO schema_migrations (migration_name, notes) 
VALUES ('005_add_missing_timecard_columns', 'Added missing columns to existing timecards table to match application requirements')
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;