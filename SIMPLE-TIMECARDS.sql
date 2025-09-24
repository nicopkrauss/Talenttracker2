-- SIMPLE VERSION: Guaranteed to create timecards
-- This version creates specific timecards without random selection

-- First check what we have to work with
SELECT 'Current Data Check:' as info;

SELECT 'Staff Count:' as type, COUNT(*) as count
FROM profiles 
WHERE role IN ('talent_escort', 'supervisor', 'coordinator') 
AND status = 'active'
UNION ALL
SELECT 'Project Count:' as type, COUNT(*) as count
FROM projects 
WHERE status = 'active';

-- Create test staff if we don't have enough
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM profiles WHERE role IN ('talent_escort', 'supervisor', 'coordinator') AND status = 'active') < 3 THEN
    INSERT INTO profiles (
      id,
      full_name,
      email,
      role,
      status,
      created_at,
      updated_at
    ) 
    SELECT 
      gen_random_uuid(),
      'Test User ' || generate_series,
      'testuser' || generate_series || '@example.com',
      CASE 
        WHEN generate_series % 3 = 1 THEN 'talent_escort'::system_role
        WHEN generate_series % 3 = 2 THEN 'supervisor'::system_role
        ELSE 'coordinator'::system_role
      END,
      'active',
      NOW(),
      NOW()
    FROM generate_series(1, 5);
  END IF;
END $$;

-- Create test project if we don't have one
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM projects WHERE status = 'active') = 0 THEN
    INSERT INTO projects (
      id,
      name,
      production_company,
      hiring_contact,
      location,
      description,
      start_date,
      end_date,
      status,
      created_by,
      created_at,
      updated_at,
      talent_expected
    ) VALUES (
      gen_random_uuid(),
      'Test Project for Timecards',
      'Test Production Company',
      'Test Hiring Contact',
      'Test Location',
      'Test project created for timecard testing purposes',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      'active',
      (SELECT id FROM profiles WHERE status = 'active' LIMIT 1),
      NOW(),
      NOW(),
      10
    );
  END IF;
END $$;

-- Clear ALL existing timecards to avoid constraint conflicts
DELETE FROM timecards;

-- Now create timecards with guaranteed data
WITH staff_data AS (
  SELECT 
    id as user_id,
    full_name,
    role,
    ROW_NUMBER() OVER () as staff_num
  FROM profiles 
  WHERE role IN ('talent_escort', 'supervisor', 'coordinator') 
  AND status = 'active'
  LIMIT 5
),
project_data AS (
  SELECT id as project_id
  FROM projects 
  WHERE status = 'active'
  LIMIT 1
),
timecard_data AS (
  SELECT 
    s.user_id,
    p.project_id,
    s.full_name,
    s.role,
    s.staff_num,
    -- Create different dates for each staff member
    (CURRENT_DATE - INTERVAL '1 day' * (s.staff_num + day_offset))::date as work_date,
    day_offset
  FROM staff_data s
  CROSS JOIN project_data p
  CROSS JOIN (VALUES (0), (1), (2), (3), (4)) AS days(day_offset)
  WHERE s.staff_num <= 5 -- Ensure we have staff
),
final_timecards AS (
  SELECT 
    user_id,
    project_id,
    work_date,
    -- Check in times (8-9 AM) - use staff_num for variation
    (work_date + INTERVAL '8 hours' + INTERVAL '1 hour' * (staff_num % 2))::timestamp as check_in_time,
    -- Check out times (5-6 PM) - use staff_num for variation
    (work_date + INTERVAL '17 hours' + INTERVAL '1 hour' * (staff_num % 2))::timestamp as check_out_time,
    -- Break start (12-1 PM) - use staff_num for variation
    (work_date + INTERVAL '12 hours' + INTERVAL '30 minutes' * (staff_num % 2))::timestamp as break_start_time,
    -- Break end (30-60 minutes later) - use staff_num for variation
    (work_date + INTERVAL '12 hours' + INTERVAL '30 minutes' * (staff_num % 2) + INTERVAL '45 minutes')::timestamp as break_end_time,
    -- Pay rate based on role
    CASE 
      WHEN role = 'talent_escort' THEN 25.00
      WHEN role = 'supervisor' THEN 35.00
      ELSE 30.00
    END as pay_rate,
    -- Status based on day offset
    CASE 
      WHEN day_offset = 0 THEN 'submitted'::timecard_status
      WHEN day_offset = 1 THEN 'draft'::timecard_status
      WHEN day_offset = 2 THEN 'approved'::timecard_status
      WHEN day_offset = 3 THEN 'submitted'::timecard_status
      ELSE 'rejected'::timecard_status
    END as status,
    -- Manual edit flag
    (day_offset % 3 = 0) as manually_edited,
    role,
    day_offset,
    staff_num
  FROM timecard_data
)
INSERT INTO timecards (
  user_id,
  project_id,
  date,
  check_in_time,
  check_out_time,
  break_start_time,
  break_end_time,
  total_hours,
  break_duration,
  pay_rate,
  total_pay,
  status,
  manually_edited,
  edit_comments,
  submitted_at,
  approved_at,
  approved_by,
  created_at,
  updated_at
)
SELECT 
  user_id,
  project_id,
  work_date,
  check_in_time,
  check_out_time,
  break_start_time,
  break_end_time,
  -- Calculate total hours
  ROUND(
    EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0 - 
    EXTRACT(EPOCH FROM (break_end_time - break_start_time)) / 3600.0,
    1
  ) as total_hours,
  -- Break duration in minutes
  ROUND(EXTRACT(EPOCH FROM (break_end_time - break_start_time)) / 60.0) as break_duration,
  pay_rate,
  -- Calculate total pay
  ROUND(
    (EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0 - 
     EXTRACT(EPOCH FROM (break_end_time - break_start_time)) / 3600.0) * pay_rate,
    2
  ) as total_pay,
  status,
  manually_edited,
  -- Add comments based on status and manual edit flag
  CASE 
    WHEN status = 'rejected'::timecard_status THEN 'Please verify break times and resubmit'
    WHEN manually_edited AND status = 'approved'::timecard_status THEN 'Approved with minor time adjustments'
    WHEN manually_edited AND status = 'submitted'::timecard_status THEN 'Hours adjusted based on security footage review'
    ELSE NULL
  END as edit_comments,
  -- Set submitted_at for non-draft timecards
  CASE 
    WHEN status != 'draft'::timecard_status THEN check_out_time + INTERVAL '1 hour'
    ELSE NULL
  END as submitted_at,
  -- Set approved_at for approved timecards
  CASE 
    WHEN status = 'approved'::timecard_status THEN check_out_time + INTERVAL '1 day'
    ELSE NULL
  END as approved_at,
  -- Set approver for approved timecards
  CASE 
    WHEN status = 'approved'::timecard_status THEN (SELECT id FROM profiles WHERE role IN ('admin', 'supervisor') LIMIT 1)
    ELSE NULL
  END as approved_by,
  NOW() as created_at,
  NOW() as updated_at
FROM final_timecards
ON CONFLICT (user_id, project_id, date) DO NOTHING;

-- Show results
SELECT 'Timecards Created:' as result;
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE manually_edited) as manually_edited_count
FROM timecards 
GROUP BY status
ORDER BY 
  CASE status 
    WHEN 'draft'::timecard_status THEN 1
    WHEN 'submitted'::timecard_status THEN 2  
    WHEN 'approved'::timecard_status THEN 3
    WHEN 'rejected'::timecard_status THEN 4
  END;