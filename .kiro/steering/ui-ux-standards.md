---
inclusion: always
---

# UI/UX Standards & Design Guidelines

## Mobile-First Navigation System

### Mobile Navigation (Bottom Dock)
- **Admin/In-House**: Projects | Team | Talent | Timecards | Profile
- **Supervisor/TLC**: Talent | Team | Timecards | Profile  
- **Talent Escort**: Talent | Timecards | Profile
- Icons: Use SF Symbols style (folder.fill, person.3.fill, star.fill, list.bullet.clipboard.fill, person.crop.circle.fill)

### Desktop Navigation (Top Bar)
- Horizontal navigation with same sections based on role
- User menu (far right): Profile picture/name with dropdown to Profile & Settings

## Key UI Patterns

### Persistent Action Bar
- Static bar for time tracking (top/bottom of operational tabs)
- Shows "[Project Name]" and single stateful action button
- Button states: "Check In" → "Start My Break" → "End My Break" → "Check Out"
- Break timer with 30/60 min default duration enforcement

### State Management Indicators
- **Time Tracking**: Yellow (approaching limits) / Red (over limits) indicators
- **Project Status**: Prep → Active lifecycle with visual checklist
- **User Status**: Pending Approval → Active with clear messaging

### Modal Patterns
- **Confirmation Modals**: Always show counts and warnings
- **Time Correction**: Modal-based entry only for missed breaks
- **Bulk Actions**: Multi-select with persistent footer showing selection count

## Responsive Design Requirements
- Seamless adaptation between mobile and desktop
- Touch-friendly targets (minimum 44px)
- Readable typography at all screen sizes
- Consistent spacing and visual hierarchy

## Accessibility Standards
- WCAG 2.1 AA compliance
- Proper color contrast ratios
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators for all interactive elements