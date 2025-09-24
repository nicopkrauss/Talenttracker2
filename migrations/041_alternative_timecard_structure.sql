-- Alternative Migration: Restructure timecards for proper multi-day support
-- This creates a normalized structure with separate tables for timecard headers and daily entries

-- Create timecard_headers table for overall timecard information
CREATE TABLE timecard_headers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Timecard metadata
  status timecard_status DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- Period information
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Calculated totals (computed from daily entries)
  total_hours DECIMAL(5,2) DEFAULT 0,
  total_break_duration DECIMAL(4,2) DEFAULT 0,
  total_pay DECIMAL(10,2) DEFAULT 0,
  
  -- Metadata
  pay_rate DECIMAL(8,2) DEFAULT 0,
  manually_edited BOOLEAN DEFAULT false,
  edit_comments TEXT,
  admin_edited BOOLEAN DEFAULT false,
  last_edited_by TEXT,
  edit_type TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, project_id, period_start_date),
  CHECK(period_end_date >= period_start_date)
);

-- Create timecard_daily_entries table for individual day details
CREATE TABLE timecard_daily_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timecard_header_id UUID NOT NULL REFERENCES timecard_headers(id) ON DELETE CASCADE,
  
  -- Day information
  work_date DATE NOT NULL,
  
  -- Time tracking
  check_in_time TIME,
  check_out_time TIME,
  break_start_time TIME,
  break_end_time TIME,
  
  -- Calculated values
  hours_worked DECIMAL(4,2) DEFAULT 0,
  break_duration DECIMAL(3,2) DEFAULT 0,
  daily_pay DECIMAL(8,2) DEFAULT 0,
  
  -- Simplified structure - no individual daily notes or locations
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(timecard_header_id, work_date),
  CHECK(hours_worked >= 0),
  CHECK(break_duration >= 0),
  CHECK(daily_pay >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_timecard_headers_user_project ON timecard_headers(user_id, project_id);
CREATE INDEX idx_timecard_headers_status ON timecard_headers(status);
CREATE INDEX idx_timecard_headers_period ON timecard_headers(period_start_date, period_end_date);
CREATE INDEX idx_timecard_headers_submitted ON timecard_headers(submitted_at);

CREATE INDEX idx_timecard_daily_entries_header ON timecard_daily_entries(timecard_header_id);
CREATE INDEX idx_timecard_daily_entries_date ON timecard_daily_entries(work_date);
CREATE INDEX idx_timecard_daily_entries_header_date ON timecard_daily_entries(timecard_header_id, work_date);

-- Create function to update totals when daily entries change
CREATE OR REPLACE FUNCTION update_timecard_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the header totals based on daily entries
  UPDATE timecard_headers 
  SET 
    total_hours = (
      SELECT COALESCE(SUM(hours_worked), 0) 
      FROM timecard_daily_entries 
      WHERE timecard_header_id = COALESCE(NEW.timecard_header_id, OLD.timecard_header_id)
    ),
    total_break_duration = (
      SELECT COALESCE(SUM(break_duration), 0) 
      FROM timecard_daily_entries 
      WHERE timecard_header_id = COALESCE(NEW.timecard_header_id, OLD.timecard_header_id)
    ),
    total_pay = (
      SELECT COALESCE(SUM(daily_pay), 0) 
      FROM timecard_daily_entries 
      WHERE timecard_header_id = COALESCE(NEW.timecard_header_id, OLD.timecard_header_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.timecard_header_id, OLD.timecard_header_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update totals
CREATE TRIGGER trigger_update_timecard_totals_insert
  AFTER INSERT ON timecard_daily_entries
  FOR EACH ROW EXECUTE FUNCTION update_timecard_totals();

CREATE TRIGGER trigger_update_timecard_totals_update
  AFTER UPDATE ON timecard_daily_entries
  FOR EACH ROW EXECUTE FUNCTION update_timecard_totals();

CREATE TRIGGER trigger_update_timecard_totals_delete
  AFTER DELETE ON timecard_daily_entries
  FOR EACH ROW EXECUTE FUNCTION update_timecard_totals();

-- Add RLS policies
ALTER TABLE timecard_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE timecard_daily_entries ENABLE ROW LEVEL SECURITY;

-- Users can see their own timecards
CREATE POLICY "Users can view own timecard headers" ON timecard_headers
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'in_house')
    )
  );

-- Users can create their own timecards
CREATE POLICY "Users can create own timecard headers" ON timecard_headers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own draft timecards
CREATE POLICY "Users can update own draft timecard headers" ON timecard_headers
  FOR UPDATE USING (
    auth.uid() = user_id AND status = 'draft'
  );

-- Daily entries follow header permissions
CREATE POLICY "Users can view daily entries for accessible timecards" ON timecard_daily_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM timecard_headers 
      WHERE id = timecard_header_id 
      AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'in_house')
        )
      )
    )
  );

CREATE POLICY "Users can manage daily entries for own draft timecards" ON timecard_daily_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM timecard_headers 
      WHERE id = timecard_header_id 
      AND user_id = auth.uid() 
      AND status = 'draft'
    )
  );

-- Comments
COMMENT ON TABLE timecard_headers IS 'Header information for timecards covering one or more days';
COMMENT ON TABLE timecard_daily_entries IS 'Individual day entries within a timecard period';
COMMENT ON COLUMN timecard_headers.period_start_date IS 'First day covered by this timecard';
COMMENT ON COLUMN timecard_headers.period_end_date IS 'Last day covered by this timecard';
COMMENT ON COLUMN timecard_daily_entries.work_date IS 'Specific date this entry represents';

-- Example usage:
-- 
-- Single-day timecard:
-- INSERT INTO timecard_headers (user_id, project_id, period_start_date, period_end_date, pay_rate)
-- VALUES ('user-uuid', 'project-uuid', '2024-01-15', '2024-01-15', 25.00);
-- 
-- INSERT INTO timecard_daily_entries (timecard_header_id, work_date, check_in_time, check_out_time, hours_worked, daily_pay)
-- VALUES ('header-uuid', '2024-01-15', '08:00', '17:00', 8.0, 200.00);
--
-- Multi-day timecard:
-- INSERT INTO timecard_headers (user_id, project_id, period_start_date, period_end_date, pay_rate)
-- VALUES ('user-uuid', 'project-uuid', '2024-01-15', '2024-01-19', 25.00);
-- 
-- INSERT INTO timecard_daily_entries (timecard_header_id, work_date, check_in_time, check_out_time, hours_worked, daily_pay, notes)
-- VALUES 
--   ('header-uuid', '2024-01-15', '08:00', '17:00', 8.0, 200.00, 'Regular Monday'),
--   ('header-uuid', '2024-01-16', '07:00', '19:00', 11.0, 275.00, 'Long Tuesday with overtime'),
--   ('header-uuid', '2024-01-17', '08:00', '16:00', 7.0, 175.00, 'Short Wednesday'),
--   ('header-uuid', '2024-01-18', '08:00', '17:00', 8.0, 200.00, 'Regular Thursday'),
--   ('header-uuid', '2024-01-19', '09:00', '15:00', 6.0, 150.00, 'Half day Friday');