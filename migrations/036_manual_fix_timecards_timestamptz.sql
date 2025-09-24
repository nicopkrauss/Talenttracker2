-- Manual Migration: Fix Timecards Table Time Fields to TIMESTAMPTZ
-- Description: Convert TIME fields to TIMESTAMPTZ for real-time tracking
-- Instructions: Run this SQL in the Supabase SQL Editor
-- Date: 2025-01-21

-- Step 1: Drop existing TIME columns and recreate as TIMESTAMPTZ
-- Note: This will lose any existing time data, but since the table is empty, this is safe

-- Drop existing TIME columns
ALTER TABLE timecards DROP COLUMN IF EXISTS check_in_time CASCADE;
ALTER TABLE timecards DROP COLUMN IF EXISTS check_out_time CASCADE;
ALTER TABLE timecards DROP COLUMN IF EXISTS break_start_time CASCADE;
ALTER TABLE timecards DROP COLUMN IF EXISTS break_end_time CASCADE;

-- Add new TIMESTAMPTZ columns
ALTER TABLE timecards ADD COLUMN check_in_time TIMESTAMPTZ;
ALTER TABLE timecards ADD COLUMN check_out_time TIMESTAMPTZ;
ALTER TABLE timecards ADD COLUMN break_start_time TIMESTAMPTZ;
ALTER TABLE timecards ADD COLUMN break_end_time TIMESTAMPTZ;

-- Step 2: Add constraints for TIMESTAMPTZ fields
ALTER TABLE timecards DROP CONSTRAINT IF EXISTS chk_timecard_times;
ALTER TABLE timecards DROP CONSTRAINT IF EXISTS chk_break_times;

ALTER TABLE timecards 
ADD CONSTRAINT chk_timecard_times CHECK (
  (check_in_time IS NULL AND check_out_time IS NULL) OR
  (check_in_time IS NOT NULL AND check_out_time IS NOT NULL AND check_out_time > check_in_time)
);

ALTER TABLE timecards 
ADD CONSTRAINT chk_break_times CHECK (
  (break_start_time IS NULL AND break_end_time IS NULL) OR
  (break_start_time IS NOT NULL AND break_end_time IS NOT NULL AND break_end_time > break_start_time)
);

-- Add constraint to ensure break times are within shift times
ALTER TABLE timecards 
ADD CONSTRAINT chk_break_within_shift CHECK (
  (break_start_time IS NULL AND break_end_time IS NULL) OR
  (check_in_time IS NOT NULL AND check_out_time IS NOT NULL AND 
   break_start_time >= check_in_time AND break_end_time <= check_out_time)
);

-- Step 3: Create indexes for the new TIMESTAMPTZ columns
CREATE INDEX IF NOT EXISTS idx_timecards_check_in_time ON timecards(check_in_time);
CREATE INDEX IF NOT EXISTS idx_timecards_check_out_time ON timecards(check_out_time);
CREATE INDEX IF NOT EXISTS idx_timecards_break_start_time ON timecards(break_start_time);
CREATE INDEX IF NOT EXISTS idx_timecards_break_end_time ON timecards(break_end_time);

-- Composite index for time tracking queries
CREATE INDEX IF NOT EXISTS idx_timecards_user_date_times ON timecards(user_id, date, check_in_time, check_out_time);

-- Step 4: Create helper functions for timecard calculations
CREATE OR REPLACE FUNCTION calculate_timecard_hours(
  p_check_in TIMESTAMPTZ,
  p_check_out TIMESTAMPTZ,
  p_break_start TIMESTAMPTZ DEFAULT NULL,
  p_break_end TIMESTAMPTZ DEFAULT NULL
) RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_minutes INTEGER;
  break_minutes INTEGER := 0;
BEGIN
  -- Return 0 if check-in or check-out is missing
  IF p_check_in IS NULL OR p_check_out IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate total minutes worked
  total_minutes := EXTRACT(EPOCH FROM (p_check_out - p_check_in)) / 60;

  -- Subtract break time if both break times are provided
  IF p_break_start IS NOT NULL AND p_break_end IS NOT NULL THEN
    break_minutes := EXTRACT(EPOCH FROM (p_break_end - p_break_start)) / 60;
    total_minutes := total_minutes - break_minutes;
  END IF;

  -- Convert to hours with 2 decimal places
  RETURN ROUND(total_minutes / 60.0, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_break_duration(
  p_break_start TIMESTAMPTZ,
  p_break_end TIMESTAMPTZ
) RETURNS DECIMAL(4,2) AS $$
DECLARE
  break_minutes INTEGER;
BEGIN
  -- Return 0 if either break time is missing
  IF p_break_start IS NULL OR p_break_end IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate break duration in minutes
  break_minutes := EXTRACT(EPOCH FROM (p_break_end - p_break_start)) / 60;

  -- Return as decimal with 2 places
  RETURN ROUND(break_minutes, 2);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to automatically calculate hours when timecard is updated
CREATE OR REPLACE FUNCTION update_timecard_calculations()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total hours
  NEW.total_hours := calculate_timecard_hours(
    NEW.check_in_time,
    NEW.check_out_time,
    NEW.break_start_time,
    NEW.break_end_time
  );

  -- Calculate break duration
  NEW.break_duration := calculate_break_duration(
    NEW.break_start_time,
    NEW.break_end_time
  );

  -- Calculate total pay (if pay_rate is set)
  IF NEW.pay_rate IS NOT NULL AND NEW.pay_rate > 0 THEN
    NEW.total_pay := NEW.total_hours * NEW.pay_rate;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic calculations
DROP TRIGGER IF EXISTS trigger_update_timecard_calculations ON timecards;
CREATE TRIGGER trigger_update_timecard_calculations
  BEFORE INSERT OR UPDATE ON timecards
  FOR EACH ROW
  EXECUTE FUNCTION update_timecard_calculations();

-- Step 6: Create view for current time tracking status
CREATE OR REPLACE VIEW current_time_tracking_status AS
SELECT 
  t.id,
  t.user_id,
  t.project_id,
  t.date,
  t.check_in_time,
  t.check_out_time,
  t.break_start_time,
  t.break_end_time,
  t.status,
  p.full_name as user_name,
  pr.name as project_name,
  -- Derive current state from timestamps
  CASE 
    WHEN t.check_in_time IS NULL THEN 'checked_out'
    WHEN t.check_in_time IS NOT NULL AND t.break_start_time IS NULL THEN 'checked_in'
    WHEN t.break_start_time IS NOT NULL AND t.break_end_time IS NULL THEN 'on_break'
    WHEN t.break_end_time IS NOT NULL AND t.check_out_time IS NULL THEN 'break_ended'
    WHEN t.check_out_time IS NOT NULL THEN 'checked_out'
    ELSE 'unknown'
  END as current_state,
  -- Calculate shift duration in hours
  CASE 
    WHEN t.check_in_time IS NOT NULL AND t.check_out_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (t.check_out_time - t.check_in_time)) / 3600
    WHEN t.check_in_time IS NOT NULL AND t.check_out_time IS NULL THEN
      EXTRACT(EPOCH FROM (NOW() - t.check_in_time)) / 3600
    ELSE 0
  END as current_shift_hours,
  -- Check if approaching overtime
  CASE 
    WHEN t.check_in_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (COALESCE(t.check_out_time, NOW()) - t.check_in_time)) / 3600 >= 12
    ELSE false
  END as is_overtime
FROM timecards t
JOIN profiles p ON t.user_id = p.id
JOIN projects pr ON t.project_id = pr.id
WHERE t.date = CURRENT_DATE
  AND t.status = 'draft';

-- Step 7: Record migration completion
INSERT INTO schema_migrations (migration_name, notes) 
VALUES ('036_manual_fix_timecards_timestamptz', 'Converted TIME fields to TIMESTAMPTZ for real-time tracking, added calculation functions and triggers')
ON CONFLICT (migration_name) DO NOTHING;

-- Verification queries (run these to confirm the migration worked)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'timecards' AND column_name LIKE '%time%';
-- SELECT * FROM global_settings;
-- SELECT calculate_timecard_hours('2025-01-21 09:00:00+00', '2025-01-21 17:00:00+00', '2025-01-21 12:00:00+00', '2025-01-21 12:30:00+00');