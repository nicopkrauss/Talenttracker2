# Manual SQL Migration Guide for Normalized Timecard Structure

## Overview

This guide walks you through manually applying the normalized timecard structure to your Supabase database. This will create the new `timecard_headers` and `timecard_daily_entries` tables alongside the existing `timecards` table.

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query** to create a new SQL script

## Step 2: Execute the Migration SQL

Copy and paste the following SQL into the SQL Editor and execute it:

```sql
-- Create timecard_headers table for overall timecard information
CREATE TABLE IF NOT EXISTS timecard_headers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Timecard metadata
  status TEXT DEFAULT 'draft',
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
CREATE TABLE IF NOT EXISTS timecard_daily_entries (
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
CREATE INDEX IF NOT EXISTS idx_timecard_headers_user_project ON timecard_headers(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_timecard_headers_status ON timecard_headers(status);
CREATE INDEX IF NOT EXISTS idx_timecard_headers_period ON timecard_headers(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_timecard_headers_submitted ON timecard_headers(submitted_at);

CREATE INDEX IF NOT EXISTS idx_timecard_daily_entries_header ON timecard_daily_entries(timecard_header_id);
CREATE INDEX IF NOT EXISTS idx_timecard_daily_entries_date ON timecard_daily_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_timecard_daily_entries_header_date ON timecard_daily_entries(timecard_header_id, work_date);

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

-- Add comments
COMMENT ON TABLE timecard_headers IS 'Header information for timecards covering one or more days';
COMMENT ON TABLE timecard_daily_entries IS 'Individual day entries within a timecard period';
COMMENT ON COLUMN timecard_headers.period_start_date IS 'First day covered by this timecard';
COMMENT ON COLUMN timecard_headers.period_end_date IS 'Last day covered by this timecard';
COMMENT ON COLUMN timecard_daily_entries.work_date IS 'Specific date this entry represents';
```

## Step 3: Verify Table Creation

After executing the SQL, verify the tables were created by running:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('timecard_headers', 'timecard_daily_entries');

-- Check table structure
\d timecard_headers
\d timecard_daily_entries
```

## Step 4: Migrate Existing Data

Once the tables are created, run the data migration script:

```bash
node scripts/migrate-existing-timecard-data.js
```

## Step 5: Update Prisma Schema

The Prisma schema has already been updated with the new models. Regenerate the Prisma client:

```bash
npx prisma generate
```

## Step 6: Test the New Structure

Test the new API endpoints:

```bash
# Test fetching normalized timecards
curl -X GET "http://localhost:3000/api/timecards-v2"

# Test creating a new normalized timecard
curl -X POST "http://localhost:3000/api/timecards-v2" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "your-project-id",
    "period_start_date": "2024-01-15",
    "period_end_date": "2024-01-17",
    "pay_rate": 25.00,
    "daily_entries": [
      {
        "work_date": "2024-01-15",
        "check_in_time": "08:00",
        "check_out_time": "17:00",
        "break_start_time": "12:00",
        "break_end_time": "13:00",
        "hours_worked": 8.0,
        "break_duration": 1.0,
        "daily_pay": 200.00,
        "hours_worked": 8.0,
        "break_duration": 1.0,
        "daily_pay": 200.00
      },
      {
        "work_date": "2024-01-16",
        "check_in_time": "07:00",
        "check_out_time": "19:00",
        "break_start_time": "12:30",
        "break_end_time": "13:30",
        "hours_worked": 11.0,
        "break_duration": 1.0,
        "daily_pay": 275.00
      }
    ]
  }'
```

## Benefits After Migration

### ✅ True Multi-Day Support
- Each day can have different check-in/out times
- Individual daily notes and locations
- Realistic daily variations in hours and pay

### ✅ Data Integrity
- Foreign key constraints ensure data consistency
- Automatic total calculations via triggers
- Proper normalization reduces data duplication

### ✅ Scalability
- Efficient queries for daily data
- Easy to add new daily-specific features
- Better performance for large datasets

### ✅ Flexibility
- Support for any number of working days
- Non-consecutive work dates within a period
- Individual day editing and management

## Example Usage

### Single-Day Timecard
```sql
-- Create header
INSERT INTO timecard_headers (user_id, project_id, period_start_date, period_end_date, pay_rate)
VALUES ('user-uuid', 'project-uuid', '2024-01-15', '2024-01-15', 25.00);

-- Create daily entry
INSERT INTO timecard_daily_entries (timecard_header_id, work_date, check_in_time, check_out_time, hours_worked, daily_pay)
VALUES ('header-uuid', '2024-01-15', '08:00', '17:00', 8.0, 200.00);
```

### Multi-Day Timecard
```sql
-- Create header for 5-day period
INSERT INTO timecard_headers (user_id, project_id, period_start_date, period_end_date, pay_rate)
VALUES ('user-uuid', 'project-uuid', '2024-01-15', '2024-01-19', 25.00);

-- Create multiple daily entries with variations
INSERT INTO timecard_daily_entries (timecard_header_id, work_date, check_in_time, check_out_time, hours_worked, daily_pay)
VALUES 
  ('header-uuid', '2024-01-15', '08:00', '17:00', 8.0, 200.00),
  ('header-uuid', '2024-01-16', '07:00', '19:00', 11.0, 275.00),
  ('header-uuid', '2024-01-17', '08:00', '16:00', 7.0, 175.00),
  ('header-uuid', '2024-01-18', '08:00', '17:00', 8.0, 200.00),
  ('header-uuid', '2024-01-19', '09:00', '15:00', 6.0, 150.00);
```

## Troubleshooting

### If Tables Already Exist
If you get errors about tables already existing, that's fine! The `IF NOT EXISTS` clauses will prevent errors.

### If Migration Fails
1. Check the Supabase logs for detailed error messages
2. Ensure you have proper permissions
3. Verify the existing `timecards` table has data to migrate

### If Prisma Errors Occur
1. Make sure to run `npx prisma generate` after updating the schema
2. Restart your development server
3. Check that the new models are properly defined in the schema

## Next Steps

1. **Update Components**: Use the new `NormalizedTimecardDisplay` component
2. **Update API Routes**: Migrate existing timecard routes to use the new structure
3. **Test Thoroughly**: Verify all timecard functionality works with the new structure
4. **Consider Deprecation**: Plan to eventually deprecate the old `timecards` table

Your timecard system now supports true multi-day functionality with individual day variations!