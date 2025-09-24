-- Migration: Add Multi-Day Timecard Support
-- This migration adds support for timecards that span multiple days

-- Add new columns to support multi-day timecards
ALTER TABLE timecards 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS daily_breakdown JSONB;

-- Update existing timecards to use the new structure
UPDATE timecards 
SET 
  start_date = date,
  end_date = date,
  working_days = 1
WHERE start_date IS NULL;

-- Create an index for the new date range queries
CREATE INDEX IF NOT EXISTS idx_timecards_date_range ON timecards(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_timecards_working_days ON timecards(working_days);

-- Add a check constraint to ensure date consistency
ALTER TABLE timecards 
ADD CONSTRAINT chk_timecard_date_range 
CHECK (start_date <= end_date);

-- Add a comment explaining the new structure
COMMENT ON COLUMN timecards.daily_breakdown IS 'JSON array containing daily work details for multi-day timecards. Format: [{"date": "2025-01-01", "check_in": "08:00", "check_out": "17:00", "break_start": "12:00", "break_end": "13:00", "hours": 8.0}]';
COMMENT ON COLUMN timecards.working_days IS 'Number of actual working days covered by this timecard';
COMMENT ON COLUMN timecards.start_date IS 'First day of work covered by this timecard';
COMMENT ON COLUMN timecards.end_date IS 'Last day of work covered by this timecard';