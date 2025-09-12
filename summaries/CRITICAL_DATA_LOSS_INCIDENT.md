# CRITICAL: Data Loss Incident - Talent Groups Feature

## 🚨 **INCIDENT SUMMARY**
**Date**: Current
**Severity**: HIGH - Data Loss
**Impact**: Complete removal of talent groups functionality and data

## **What Happened**
When implementing drag-to-reorder functionality, running `npx prisma db push` caused Prisma to:

1. **DROP the `talent_groups` table** - Complete data loss of all talent groups
2. **DROP the `scheduled_dates` column** from `talent_project_assignments` - Loss of individual talent scheduling data  
3. **DROP other related fields** that were part of the multi-day scheduling feature

## **Root Cause**
- Prisma detected schema drift between the current schema file and database
- The `talent_groups` table and related fields were not defined in the current Prisma schema
- `prisma db push` automatically dropped "unused" tables and columns
- This was an unintended side effect of adding the `display_order` field

## **Data Lost**
1. **All talent groups** (bands, dance troupes, etc.)
2. **Group member information** (names, roles)
3. **Group scheduling data** (scheduled dates)
4. **Individual talent scheduling** (scheduled_dates arrays)
5. **Group assignments to escorts**

## **Affected Features**
- ❌ Talent group creation and management
- ❌ Group-based scheduling
- ❌ Multi-day talent assignments
- ❌ Group member tracking
- ❌ Group-specific escort assignments

## **Immediate Actions Needed**

### 1. **Restore Database Schema**
```sql
-- Restore talent_groups table
CREATE TABLE talent_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  group_name VARCHAR(255) NOT NULL,
  members JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_dates DATE[] NOT NULL DEFAULT '{}',
  assigned_escort_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restore scheduled_dates to talent_project_assignments
ALTER TABLE talent_project_assignments 
ADD COLUMN scheduled_dates DATE[] NOT NULL DEFAULT '{}';
```

### 2. **Update Prisma Schema**
Add the missing models to `prisma/schema.prisma`:
```prisma
model talent_groups {
  id                  String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  project_id          String    @db.Uuid
  group_name          String    @db.VarChar(255)
  members             Json      @default("[]")
  scheduled_dates     String[]  @default([])
  assigned_escort_id  String?   @db.Uuid
  created_at          DateTime? @default(now()) @db.Timestamptz(6)
  updated_at          DateTime? @default(now()) @db.Timestamptz(6)
  
  projects            projects  @relation(fields: [project_id], references: [id], onDelete: Cascade)
  assigned_escort     profiles? @relation(fields: [assigned_escort_id], references: [id], onDelete: SetNull)
  
  @@unique([project_id, group_name])
  @@index([project_id])
  @@schema("public")
}
```

### 3. **Restore API Endpoints**
- `/api/projects/[id]/talent-groups` - Group CRUD operations
- `/api/projects/[id]/talent-groups/[groupId]` - Individual group management

### 4. **Restore Frontend Components**
- Group creation modal
- Group management UI
- Group scheduling interface
- Group badge components

## **Prevention Measures**
1. **Always backup database** before schema changes
2. **Use `prisma migrate dev`** instead of `prisma db push` for production-like changes
3. **Review schema diffs** before applying changes
4. **Test schema changes** on development database first
5. **Keep Prisma schema in sync** with actual database structure

## **Recovery Priority**
1. 🔥 **URGENT**: Restore database schema (prevent further data loss)
2. 🔥 **HIGH**: Update Prisma schema to match database
3. 🔥 **HIGH**: Restore API endpoints functionality
4. 🟡 **MEDIUM**: Restore frontend components
5. 🟡 **LOW**: Restore test coverage

## **Lessons Learned**
- Schema management requires extreme caution in production environments
- Prisma's automatic cleanup can cause unintended data loss
- Always verify schema changes before applying them
- Maintain comprehensive backups before any database operations

## **Next Steps**
1. Immediately restore the database schema
2. Update Prisma schema to prevent future drift
3. Test all talent group functionality
4. Implement better schema change procedures
5. Document the incident for future reference

---
**Status**: 🚨 ACTIVE INCIDENT - Requires immediate attention
**Assigned**: Development team
**Priority**: P0 - Critical data loss