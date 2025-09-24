# Breakdown Layout Improvements

## Changes Made

### 1. Improved Dividing Lines
- **Before**: Dividing lines appeared under each day header
- **After**: Dividing lines now appear between days, creating better visual separation
- **Implementation**: Moved the `border-b` class from day headers and added `border-t` between days

### 2. Repositioned "Show Less" Button
- **Before**: "Show Less" button appeared at the top with the expand button
- **After**: "Show Less" button now appears at the bottom of the expanded area
- **Implementation**: 
  - Split the expand/collapse logic into separate conditions
  - Show "Show All X Days" button only when collapsed
  - Show "Show Less" button at the bottom of the expanded content

### 3. Technical Improvements
- **Fixed TypeScript Issues**: Added null checks for timecard time fields to prevent runtime errors
- **Cleaned Up Imports**: Removed unused imports (CardTitle, Clock, DollarSign) to eliminate warnings
- **Removed Unused Variables**: Eliminated the unused `avgHoursPerDay` variable

## Visual Flow Improvements

### Multi-Day Timecard Flow:
1. **Collapsed State**: Shows Day 1 with "Show All X Days" button below
2. **Expanded State**: 
   - Shows Day 1 (no bottom border)
   - Dividing line between days
   - Shows Day 2, 3, etc. with proper headers
   - "Show Less" button at the very bottom

### Single-Day Timecard:
- Maintains consistent height with reserved space
- Clean day header without unnecessary borders
- Consistent styling with multi-day cards

## Benefits

1. **Better Visual Hierarchy**: Dividing lines between days create clearer separation
2. **Improved UX**: "Show Less" button at bottom feels more natural after viewing all content
3. **Consistent Styling**: All timecard cards maintain uniform appearance and height
4. **Error Prevention**: Added null checks prevent crashes with incomplete timecard data

The layout now provides a more intuitive and visually appealing experience for users reviewing timecard information in the breakdown tab.