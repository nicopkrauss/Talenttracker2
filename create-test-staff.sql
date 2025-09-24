-- Create test staff members if needed for timecard testing
-- Run this if you don't have enough active staff members

INSERT INTO profiles (
  id,
  full_name,
  email,
  role,
  status,
  created_at,
  updated_at
) VALUES
-- Generate UUIDs for test users (replace with actual UUIDs if needed)
(gen_random_uuid(), 'Sarah Johnson', 'sarah.johnson@test.com', 'talent_escort', 'active', NOW(), NOW()),
(gen_random_uuid(), 'Mike Chen', 'mike.chen@test.com', 'talent_escort', 'active', NOW(), NOW()),
(gen_random_uuid(), 'Emily Rodriguez', 'emily.rodriguez@test.com', 'supervisor', 'active', NOW(), NOW()),
(gen_random_uuid(), 'David Kim', 'david.kim@test.com', 'coordinator', 'active', NOW(), NOW()),
(gen_random_uuid(), 'Lisa Thompson', 'lisa.thompson@test.com', 'talent_escort', 'active', NOW(), NOW()),
(gen_random_uuid(), 'James Wilson', 'james.wilson@test.com', 'talent_escort', 'active', NOW(), NOW()),
(gen_random_uuid(), 'Maria Garcia', 'maria.garcia@test.com', 'supervisor', 'active', NOW(), NOW()),
(gen_random_uuid(), 'Robert Brown', 'robert.brown@test.com', 'coordinator', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create a test project if needed
INSERT INTO projects (
  id,
  name,
  status,
  created_by,
  created_at,
  updated_at
) VALUES
(gen_random_uuid(), 'Test Production 2024', 'active', (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Show what was created
SELECT 'Created Staff:' as info;
SELECT full_name, role, status, created_at::date
FROM profiles 
WHERE role IN ('talent_escort', 'supervisor', 'coordinator')
AND created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

SELECT 'Available Projects:' as info;
SELECT name, status, created_at::date
FROM projects 
WHERE status = 'active'
ORDER BY created_at DESC;