// Script to check if we have the necessary data to create fake timecards
const fs = require('fs')

console.log('🔍 Checking Prerequisites for Fake Timecards')
console.log('=============================================')

const diagnosticSQL = `
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
`

// Write the diagnostic SQL to a file
fs.writeFileSync('check-prerequisites.sql', diagnosticSQL)

console.log('📄 Created diagnostic SQL file: check-prerequisites.sql')
console.log('')
console.log('🔧 To check your database prerequisites:')
console.log('1. Copy the contents of check-prerequisites.sql')
console.log('2. Run it in your Supabase SQL editor')
console.log('3. Review the results to ensure you have:')
console.log('   • At least 3-5 active staff members')
console.log('   • At least 1 active project')
console.log('   • Verify existing timecard counts')
console.log('')
console.log('📊 Expected minimum requirements:')
console.log('   • Staff Members: 3+ (any combination of roles)')
console.log('   • Projects: 1+ (with status = "active")')
console.log('   • If these are missing, create them first!')
console.log('')
console.log('💡 If you need to create test data:')
console.log('   • Staff: Use the registration system or insert directly')
console.log('   • Projects: Create via /projects/new or insert directly')
console.log('')
console.log('✅ Once prerequisites are met, run FIXED-TIMECARDS.sql')