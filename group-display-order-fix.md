# Group Display Order Fix

## 🔧 **Issue Identified & Fixed:**

### **Problem**: Talent Groups Created with display_order = 0
- Newly created talent groups were appearing at the top of the list (before individual talent)
- This happened because groups were being created with `display_order: 0` (or NULL)
- Individual talent were being assigned proper display orders, but groups were not

### **Root Cause**: Missing Display Order Logic in Group Creation API

The group creation API (`/api/projects/[id]/talent-groups`) was missing the display order calculation that exists in the talent assignment API.

**Before (Broken)**:
```tsx
// Group creation was missing display_order entirely
const { data: newGroup, error: createError } = await supabase
  .from('talent_groups')
  .insert({
    project_id: projectId,
    group_name: groupName,
    members: members,
    // ❌ No display_order field
    point_of_contact_name: pointOfContactName || null,
    point_of_contact_phone: pointOfContactPhone || null
  })

// Assignment entry was also missing display_order
const { error: assignmentError } = await supabase
  .from('talent_project_assignments')
  .insert({
    talent_id: newGroup.id,
    project_id: projectId,
    // ❌ No display_order field
    status: 'active'
  })
```

## ✅ **Solution**: Added Same Display Order Logic as Talent Assignment

**After (Fixed)**:
```tsx
// 1. Calculate next display order by checking both tables
const [talentMaxResult, groupMaxResult] = await Promise.all([
  supabase
    .from('talent_project_assignments')
    .select('display_order')
    .eq('project_id', projectId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle(),
  
  supabase
    .from('talent_groups')
    .select('display_order')
    .eq('project_id', projectId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()
])

const maxTalentOrder = talentMaxResult.data?.display_order || 0
const maxGroupOrder = groupMaxResult.data?.display_order || 0
const nextDisplayOrder = Math.max(maxTalentOrder, maxGroupOrder) + 1

// 2. Create group with proper display_order
const { data: newGroup, error: createError } = await supabase
  .from('talent_groups')
  .insert({
    project_id: projectId,
    group_name: groupName,
    members: members,
    display_order: nextDisplayOrder,  // ✅ Added display_order
    point_of_contact_name: pointOfContactName || null,
    point_of_contact_phone: pointOfContactPhone || null
  })

// 3. Create assignment entry with same display_order
const { error: assignmentError } = await supabase
  .from('talent_project_assignments')
  .insert({
    talent_id: newGroup.id,
    project_id: projectId,
    display_order: nextDisplayOrder,  // ✅ Added display_order
    status: 'active'
  })
```

## 🔄 **Consistency Achieved:**

Now both talent assignment and group creation use the **exact same logic**:

1. **Check Both Tables**: Query both `talent_project_assignments` and `talent_groups` for max display_order
2. **Calculate Next Order**: Use `Math.max(maxTalentOrder, maxGroupOrder) + 1`
3. **Apply to Both Records**: Set the same display_order in both the main table and assignment table

## 📊 **Expected Results:**

### **Before Fix:**
- ❌ Groups appeared at top (display_order = 0)
- ❌ New talent appeared under existing groups
- ❌ Inconsistent ordering

### **After Fix:**
- ✅ Groups appear at end of list (proper display_order)
- ✅ New talent appear after existing groups
- ✅ Consistent chronological ordering
- ✅ Both individual talent and groups follow same ordering rules

## 🔍 **Files Modified:**

**`app/api/projects/[id]/talent-groups/route.ts`**
- Added display order calculation logic (same as talent assignment)
- Added `display_order` field to group creation
- Added `display_order` field to assignment entry creation

This ensures that newly created groups will appear at the end of the talent roster list, maintaining proper chronological order with both individual talent and other groups.