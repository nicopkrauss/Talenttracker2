# Timecards Table Deprecation Plan

## Overview

With the new normalized structure (`timecard_headers` + `timecard_daily_entries`), the old `timecards` table is no longer needed. This document outlines the deprecation strategy.

## Current State

### Old Structure (Deprecated)
```sql
timecards (
  id, user_id, project_id, date,
  total_hours, total_pay, status,
  check_in_time, check_out_time,
  -- Single record per timecard with aggregated data
)
```

### New Structure (Active)
```sql
timecard_headers (
  id, user_id, project_id,
  period_start_date, period_end_date,
  total_hours, total_pay, status
  -- Overall timecard information
)

timecard_daily_entries (
  id, timecard_header_id, work_date,
  check_in_time, check_out_time,
  hours_worked, daily_pay
  -- Individual day details
)
```

## Deprecation Strategy

### Phase 1: Parallel Operation ✅ (Current)
- ✅ New tables created
- ✅ Data migrated from old to new structure
- ✅ New API routes created (`/api/timecards-v2`)
- ✅ New components created (`NormalizedTimecardDisplay`)
- 🔄 Old system still functional

### Phase 2: System Migration (Next Steps)
- [ ] Update existing API routes to use new structure
- [ ] Update existing components to use new structure
- [ ] Update all timecard-related pages
- [ ] Test all functionality with new structure

### Phase 3: Deprecation (Future)
- [ ] Mark old `timecards` table as deprecated
- [ ] Add deprecation warnings to old API routes
- [ ] Monitor usage of old vs new system

### Phase 4: Removal (Final)
- [ ] Drop old `timecards` table
- [ ] Remove old API routes
- [ ] Remove old components
- [ ] Clean up Prisma schema

## Files That Need Updates

### API Routes (Old → New)
```
app/api/timecards/route.ts → Use timecard_headers
app/api/timecards/[id]/route.ts → Use timecard_headers + daily_entries
app/api/timecards/approve/route.ts → Update to new structure
app/api/timecards/reject/route.ts → Update to new structure
app/api/timecards/edit/route.ts → Update to new structure
```

### Components (Old → New)
```
components/timecards/multi-day-timecard-detail.tsx → NormalizedTimecardDisplay
components/timecards/enhanced-timecard-list.tsx → Update for new structure
All timecard components → Update queries and data handling
```

### Pages (Old → New)
```
app/(app)/timecards/page.tsx → Use /api/timecards-v2
app/(app)/timecards/[id]/page.tsx → Use new structure
app/(app)/timecards/[id]/edit/page.tsx → Use new structure
```

## Benefits of Deprecation

### ✅ Simplified Codebase
- Single source of truth for timecard data
- No duplicate logic between old and new systems
- Cleaner API surface

### ✅ Better Performance
- Optimized queries for normalized structure
- No need to maintain two data models
- Reduced database complexity

### ✅ Enhanced Features
- True multi-day support with individual day variations
- Better data integrity with foreign key constraints
- Easier to add new features

## Migration Checklist

### Immediate (Phase 2)
- [ ] Update main timecard list page to use new API
- [ ] Update timecard detail pages to use new structure
- [ ] Update approval/rejection workflows
- [ ] Update timecard editing functionality
- [ ] Test all existing timecard features

### Short Term (Phase 3)
- [ ] Add deprecation warnings to old API routes
- [ ] Monitor usage analytics (old vs new)
- [ ] Update documentation to reference new structure
- [ ] Train users on any UI changes

### Long Term (Phase 4)
- [ ] Remove old `timecards` table from database
- [ ] Remove old API routes and components
- [ ] Update Prisma schema to remove old model
- [ ] Clean up any remaining references

## Rollback Plan

If issues arise during migration:

1. **Keep Old Table**: Don't drop until fully confident
2. **Feature Flags**: Use flags to switch between old/new systems
3. **Data Sync**: Ensure data stays in sync during transition
4. **Quick Revert**: Ability to quickly revert to old system

## Timeline Estimate

- **Phase 2 (Migration)**: 1-2 weeks
- **Phase 3 (Deprecation)**: 2-4 weeks monitoring
- **Phase 4 (Removal)**: 1 week cleanup

## Conclusion

Yes, the old `timecards` table will eventually be removed, but we'll do it gradually to ensure a smooth transition. The new normalized structure provides much better support for multi-day timecards with individual day variations.

**Recommendation**: Proceed with Phase 2 (updating existing routes and components) while keeping the old table as a safety net until we're confident the new system works perfectly.