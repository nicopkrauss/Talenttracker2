# Fake Timecards Setup Guide

This guide explains how to populate your database with fake timecards to test the enhanced approval interface.

## 📋 What Will Be Created

The fake timecards will include:

### Status Variety
- **DRAFT**: Timecards not yet submitted (~30%)
- **SUBMITTED**: Timecards pending approval (~30%) 
- **APPROVED**: Already approved timecards (~25%)
- **REJECTED**: Rejected timecards with comments (~15%)

### Special Conditions
- **Manually Edited**: Some timecards flagged as manually edited (~25%)
- **Comments**: Supervisor comments for rejected and edited timecards
- **Various Pay Rates**: Different hourly rates based on roles
  - Talent Escort: $25/hr
  - Supervisor: $35/hr
  - Coordinator: $30/hr
- **Realistic Schedules**: Work hours with breaks over the past 7 days

## 🚀 Method 1: SQL Database Insert (Recommended)

### Step 1: Use the Generated SQL Script
The script `temp_timecards.sql` has been created with comprehensive fake timecard data.

### Step 2: Run in Supabase SQL Editor
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `temp_timecards.sql`
4. Click \"Run\" to execute

### Step 3: Verify Creation
The script will show a summary of created timecards by status.

## 🖥️ Method 2: Node.js Script (Alternative)

### Option A: Using Supabase Client
```bash
# Requires SUPABASE_SERVICE_ROLE_KEY environment variable
node scripts/create-fake-timecards.js
```

### Option B: Using Prisma
```bash
# Uses Prisma client with raw SQL
node scripts/create-fake-timecards-prisma.js
```

## 🧪 Testing the Enhanced Features

Once you have fake timecards, you can test:

### ✅ Role-Based Permissions
- Log in with different roles (admin, supervisor, talent_escort)
- Verify appropriate access levels
- Test permission error messages

### ✅ Required Rejection Comments
- Try to reject a timecard without comments
- Verify validation error appears
- Add comments and successfully reject

### ✅ Bulk Approval with Validation
- Select multiple timecards
- Click \"Approve X Timecards\"
- Verify confirmation dialog shows:
  - Total count
  - Manually edited warnings
  - Invalid status warnings

### ✅ Two-Way Confirmation for Edits
- As an admin, click \"Edit\" on a timecard
- Make changes and add required admin note
- Verify timecard returns to \"submitted\" status

### ✅ Manual Edit Flagging
- Look for \"Manually Edited\" badges on timecards
- Verify warnings appear in bulk operations
- Check that comments explain the edits

## 📊 Expected Test Data

### Timecard Distribution
```
STATUS BREAKDOWN:
- DRAFT: ~7-8 timecards
- SUBMITTED: ~7-8 timecards (perfect for testing approvals)
- APPROVED: ~6-7 timecards
- REJECTED: ~3-4 timecards
- MANUALLY EDITED: ~6-7 timecards (flagged for attention)
```

### Realistic Data Features
- **Work Hours**: 8-10 AM start times, 4-7 PM end times
- **Break Times**: 12-2 PM start, 30-60 minute durations
- **Pay Calculations**: Accurate total hours and pay calculations
- **Comments**: Contextual supervisor comments
- **Timestamps**: Proper submitted_at, approved_at dates

## 🔍 Verification Steps

### 1. Check Timecard List
- Navigate to `/timecards`
- Verify you see timecards in different statuses
- Look for \"Manually Edited\" badges

### 2. Test Approval Queue
- Click \"Approvals\" tab
- Should see submitted timecards
- Verify manually edited warnings appear

### 3. Test Permission System
- Log in as different roles
- Verify appropriate access levels
- Test permission error messages

### 4. Test Bulk Operations
- Select multiple timecards
- Test bulk approval confirmation
- Verify validation warnings

## 🚨 Troubleshooting

### No Timecards Appear
- Check if users exist with roles: talent_escort, supervisor, coordinator
- Verify at least one project exists with status 'active'
- Check database permissions and RLS policies
- Look for console errors in browser

### Permission Errors
- Verify user roles are set correctly in profiles table
- Check that users have status = 'active'
- Ensure system_settings table has approval permissions configured

### SQL Script Errors
- Ensure the timecards table exists with all required columns
- Check that profiles and projects tables have data
- Verify foreign key constraints are properly set up

## 🎯 Success Criteria

You'll know the setup is successful when:

1. ✅ Timecards appear in the list with various statuses
2. ✅ \"Approvals\" tab shows submitted timecards
3. ✅ Manually edited flags are visible with warning badges
4. ✅ Permission system works for different roles
5. ✅ Bulk approval shows confirmation dialog with warnings
6. ✅ Rejection requires comments and shows validation
7. ✅ Edit functionality works for admins with proper workflow

## 📝 Next Steps

After setting up fake timecards:

1. **Test All Features**: Go through each requirement systematically
2. **User Acceptance Testing**: Have different users test the interface
3. **Performance Testing**: Test with larger datasets if needed
4. **Integration Testing**: Verify with notification system
5. **Documentation**: Update user guides based on testing feedback

The enhanced approval interface is now ready for comprehensive testing! 🎉

## 🔧 Additional Scripts

### Clear All Timecards
```sql
DELETE FROM timecards;
```

### Check Current Timecard Count
```sql
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE manually_edited) as manually_edited_count
FROM timecards 
GROUP BY status;
```

### View Sample Timecards
```sql
SELECT 
  t.*,
  p.full_name as user_name,
  pr.name as project_name
FROM timecards t
JOIN profiles p ON t.user_id = p.id
JOIN projects pr ON t.project_id = pr.id
ORDER BY t.created_at DESC
LIMIT 10;
```"