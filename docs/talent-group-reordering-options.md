# Talent Group Drag-to-Reorder Implementation Options

## Current Database Structure Analysis

### Individual Talent (talent_project_assignments)
- ✅ Has `display_order` column (Int, default 0)
- ✅ Has proper indexing: `idx_talent_project_assignments_display_order`
- ✅ Already supports drag-to-reorder

### Talent Groups (talent_groups)
- ❌ No `display_order` column
- ❌ No ordering mechanism
- Currently ordered by creation time or name

## Option 1: No Database Changes (Simpler)

### Implementation Approach
Use separate ordering for talent and groups, then merge for display:

```typescript
// Frontend logic
const displayItems = [
  ...individualTalent.sort((a, b) => a.assignment.display_order - b.assignment.display_order),
  ...talentGroups.sort((a, b) => a.group_name.localeCompare(b.group_name))
]
```

### Pros
- ✅ No database migration required
- ✅ Faster implementation (1-2 hours)
- ✅ No risk of data corruption
- ✅ Maintains existing functionality

### Cons
- ❌ Groups always appear after individual talent
- ❌ Less flexible ordering
- ❌ Cannot intermix talent and groups freely

### Implementation Steps
1. Update frontend to handle mixed ordering
2. Add group reordering within group section
3. Store group order in localStorage or session state

---

## Option 2: Database Schema Enhancement (Recommended)

### Implementation Approach
Add unified ordering system that supports both talent and groups:

```sql
-- Add display_order to talent_groups
ALTER TABLE talent_groups ADD COLUMN display_order INT DEFAULT 0;
CREATE INDEX idx_talent_groups_display_order ON talent_groups(project_id, display_order);

-- Create unified ordering view
CREATE VIEW project_roster_items AS
SELECT 
  'talent' as item_type,
  tpa.talent_id as item_id,
  tpa.display_order,
  tpa.project_id,
  t.first_name || ' ' || t.last_name as display_name
FROM talent_project_assignments tpa
JOIN talent t ON tpa.talent_id = t.id
UNION ALL
SELECT 
  'group' as item_type,
  tg.id as item_id,
  tg.display_order,
  tg.project_id,
  tg.group_name as display_name
FROM talent_groups tg
ORDER BY project_id, display_order;
```

### Pros
- ✅ Full flexibility - intermix talent and groups
- ✅ Consistent ordering system
- ✅ Better user experience
- ✅ Scalable for future features
- ✅ Proper database normalization

### Cons
- ❌ Requires database migration
- ❌ More complex implementation (4-6 hours)
- ❌ Need to handle existing data migration

### Implementation Steps
1. Create database migration
2. Update API endpoints for unified reordering
3. Modify frontend drag-and-drop logic
4. Add data migration for existing groups

---

## Option 3: Hybrid Approach (Balanced)

### Implementation Approach
Add display_order to groups but keep separate drag contexts:

```typescript
// Two separate sortable contexts
<SortableContext items={talentIds}>
  {/* Individual talent */}
</SortableContext>
<SortableContext items={groupIds}>
  {/* Talent groups */}
</SortableContext>
```

### Pros
- ✅ Groups can be reordered among themselves
- ✅ Simpler than full unified system
- ✅ Maintains clear separation
- ✅ Moderate implementation complexity

### Cons
- ❌ Still requires database migration
- ❌ Cannot intermix talent and groups
- ❌ Two separate ordering systems

---

## Recommendation: Option 2 (Database Enhancement)

### Why This is Best
1. **Future-Proof**: Supports any ordering requirements
2. **User Experience**: Most intuitive and flexible
3. **Technical Debt**: Avoids workarounds and complexity
4. **Consistency**: Single ordering system for all items

### Migration Strategy
1. **Safe Migration**: Add column with default values
2. **Backward Compatible**: Existing queries still work
3. **Gradual Rollout**: Can implement incrementally

### Implementation Timeline
- **Database Migration**: 30 minutes
- **API Updates**: 2 hours
- **Frontend Changes**: 2-3 hours
- **Testing**: 1 hour
- **Total**: ~6 hours

Would you like me to implement Option 2 (recommended) or would you prefer to start with Option 1 for a quicker solution?