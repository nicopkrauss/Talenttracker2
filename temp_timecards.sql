
-- First, let's get some user IDs and project IDs to work with
WITH staff_users AS (
  SELECT id, full_name, role 
  FROM profiles 
  WHERE role IN ('talent_escort', 'supervisor', 'coordinator') 
  AND status = 'active'
  LIMIT 8
),
active_projects AS (
  SELECT id, name 
  FROM projects 
  WHERE status = 'active' 
  LIMIT 3
),
fake_timecards AS (
  SELECT 
    s.id as user_id,
    p.id as project_id,
    (CURRENT_DATE - INTERVAL '7 days' + (random() * 7)::int * INTERVAL '1 day')::date as date,
    -- Check in time between 8-10 AM
    (CURRENT_DATE - INTERVAL '7 days' + (random() * 7)::int * INTERVAL '1 day' + 
     INTERVAL '8 hours' + (random() * 2)::int * INTERVAL '1 hour' + 
     (random() * 60)::int * INTERVAL '1 minute')::timestamp as check_in_time,
    -- Check out time between 4-7 PM  
    (CURRENT_DATE - INTERVAL '7 days' + (random() * 7)::int * INTERVAL '1 day' + 
     INTERVAL '16 hours' + (random() * 3)::int * INTERVAL '1 hour' + 
     (random() * 60)::int * INTERVAL '1 minute')::timestamp as check_out_time,
    -- Break start time around lunch
    (CURRENT_DATE - INTERVAL '7 days' + (random() * 7)::int * INTERVAL '1 day' + 
     INTERVAL '12 hours' + (random() * 2)::int * INTERVAL '1 hour')::timestamp as break_start_time,
    -- Break end time (30-60 minutes later)
    (CURRENT_DATE - INTERVAL '7 days' + (random() * 7)::int * INTERVAL '1 day' + 
     INTERVAL '12 hours' + (random() * 2)::int * INTERVAL '1 hour' + 
     INTERVAL '30 minutes' + (random() * 30)::int * INTERVAL '1 minute')::timestamp as break_end_time,
    -- Pay rate based on role
    CASE 
      WHEN s.role = 'talent_escort' THEN 25.00
      WHEN s.role = 'supervisor' THEN 35.00
      ELSE 30.00
    END as pay_rate,
    -- Status distribution
    CASE 
      WHEN random() < 0.3 THEN 'draft'::timecard_status
      WHEN random() < 0.6 THEN 'submitted'::timecard_status
      WHEN random() < 0.85 THEN 'approved'::timecard_status
      ELSE 'rejected'::timecard_status
    END as status,
    -- Some timecards are manually edited
    (random() < 0.25) as manually_edited,
    s.full_name,
    s.role,
    ROW_NUMBER() OVER () as rn
  FROM staff_users s
  CROSS JOIN active_projects p
  WHERE random() < 0.7 -- Not every combination
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
  status::timecard_status,
  manually_edited,
  supervisor_comments,
  submitted_at,
  approved_at,
  approved_by,
  created_at,
  updated_at
)
SELECT 
  user_id,
  project_id,
  date,
  check_in_time,
  check_out_time,
  break_start_time,
  break_end_time,
  -- Calculate total hours (work time minus break time)
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
    WHEN status = 'rejected' THEN 'Please verify break times and resubmit'
    WHEN manually_edited AND status = 'approved' THEN 'Approved with minor time adjustments'
    WHEN manually_edited AND status = 'submitted' THEN 'Hours adjusted based on security footage review'
    ELSE NULL
  END as supervisor_comments,
  -- Set submitted_at for non-draft timecards
  CASE 
    WHEN status != 'draft' THEN check_out_time + INTERVAL '1 hour'
    ELSE NULL
  END as submitted_at,
  -- Set approved_at for approved timecards
  CASE 
    WHEN status = 'approved' THEN check_out_time + INTERVAL '1 day'
    ELSE NULL
  END as approved_at,
  -- Set approver for approved timecards (use first admin)
  CASE 
    WHEN status = 'approved' THEN (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
    ELSE NULL
  END as approved_by,
  NOW() as created_at,
  NOW() as updated_at
FROM fake_timecards
WHERE rn <= 25; -- Limit to 25 timecards

-- Show summary
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE manually_edited) as manually_edited_count
FROM timecards 
GROUP BY status
ORDER BY 
  CASE status 
    WHEN 'draft' THEN 1
    WHEN 'submitted' THEN 2  
    WHEN 'approved' THEN 3
    WHEN 'rejected' THEN 4
  END;
