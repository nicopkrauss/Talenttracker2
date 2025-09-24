# DOM Structure Fix for Drag-and-Drop Talent List

## Issue
The application was showing DOM structure errors:
```
Error: In HTML, <div> cannot be a child of <tbody>.
Error: <tbody> cannot contain a nested <div>.
```

This was happening because the `@dnd-kit` library's `DndContext` component creates wrapper `<div>` elements, which are invalid HTML when placed directly inside a `<tbody>` element.

## Root Cause
The original structure had:
```jsx
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>
    <DraggableTalentList> {/* This created <div> wrappers inside <tbody> */}
      <DndContext>        {/* This creates <div> elements */}
        <TableRow>...</TableRow>
      </DndContext>
    </DraggableTalentList>
  </TableBody>
</Table>
```

## Solution Applied
Restructured the components so that the `DndContext` wraps the entire table, not just the rows:

### 1. Updated `DraggableTalentList` Component
- Now renders the complete `<Table>` structure including `<TableHeader>` and `<TableBody>`
- Moved `DndContext` to wrap only the sortable rows inside `<TableBody>`
- Added support for talent groups and empty states
- Added new props for group management

### 2. Updated `TalentRosterTab` Component
- Removed the outer `<Table>` structure
- Passed talent groups and related handlers to `DraggableTalentList`
- Simplified the component by moving all table rendering logic to `DraggableTalentList`

### 3. New Component Structure
```jsx
<DraggableTalentList>
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>
      <DndContext>          {/* Now properly wraps only the draggable content */}
        <SortableContext>
          <TableRow>...</TableRow>  {/* Direct children of tbody */}
        </SortableContext>
      </DndContext>
      {/* Non-draggable talent groups */}
      <TableRow>...</TableRow>
    </TableBody>
  </Table>
</DraggableTalentList>
```

## Files Modified
1. **`components/projects/draggable-talent-list.tsx`**:
   - Added complete table structure rendering
   - Added talent groups support
   - Added empty state handling
   - Updated props interface

2. **`components/projects/tabs/talent-roster-tab.tsx`**:
   - Removed outer table structure
   - Updated component usage to pass all required props
   - Removed duplicate talent group rendering code

## Benefits
- ✅ Fixes DOM structure validation errors
- ✅ Maintains drag-and-drop functionality
- ✅ Cleaner component separation
- ✅ Better code reusability
- ✅ Proper HTML semantics

## Verification
The talent roster should now display without DOM errors and maintain all functionality:
- Drag-to-reorder individual talent
- Display talent groups with expand/collapse
- Show empty states appropriately
- Maintain all existing interactions

The hydration errors should be completely resolved.