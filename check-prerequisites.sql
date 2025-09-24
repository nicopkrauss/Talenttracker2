
-- Check available staff members
SELECT 'Staff Members' as category, role, COUNT(*) as count
FROM profiles 
WHERE role IN ('talent_escort', 'supervisor', 'coordinator') 
AND status = 'active'
GROUP BY role
UNION ALL
-- Check available projects
SELECT 'Projects' as category, status, COUNT(*) as count
FROM projects 
WHERE status = 'active'
GROUP BY status
UNION ALL
-- Check existing timecards
SELECT 'Existing Timecards' as category, status::text, COUNT(*) as count
FROM timecards 
GROUP BY status
ORDER BY category, count DESC;

-- Show sample staff and projects
SELECT 'Available Staff:' as info;
SELECT full_name, role, status 
FROM profiles 
WHERE role IN ('talent_escort', 'supervisor', 'coordinator') 
AND status = 'active'
LIMIT 10;

SELECT 'Available Projects:' as info;
SELECT name, status, created_at::date
FROM projects 
WHERE status = 'active'
LIMIT 5;
