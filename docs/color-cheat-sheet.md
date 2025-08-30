# Theme Color Cheat Sheet

Quick reference for migrating hardcoded colors to theme-aware alternatives.

## 🎨 Basic Color Replacements

### Text Colors
```css
/* ❌ Hardcoded → ✅ Theme-aware */
text-gray-900    → text-foreground
text-gray-800    → text-foreground  
text-gray-700    → text-foreground
text-gray-600    → text-muted-foreground
text-gray-500    → text-muted-foreground
text-gray-400    → text-muted-foreground
text-white       → text-primary-foreground (on colored backgrounds)
text-black       → text-foreground
```

### Background Colors
```css
/* ❌ Hardcoded → ✅ Theme-aware */
bg-white         → bg-background
bg-gray-50       → bg-muted
bg-gray-100      → bg-muted
bg-gray-200      → bg-border
bg-gray-800      → bg-card
bg-gray-900      → bg-background
```

### Border Colors
```css
/* ❌ Hardcoded → ✅ Theme-aware */
border-gray-200  → border-border
border-gray-300  → border-border
border-gray-400  → border-input
```

## 🌈 Semantic Colors (with Dark Mode)

### Success (Green)
```css
/* ❌ Missing dark variant → ✅ With dark variant */
text-green-600   → text-green-600 dark:text-green-400
text-green-700   → text-green-700 dark:text-green-300
bg-green-50      → bg-green-50 dark:bg-green-950/20
border-green-200 → border-green-200 dark:border-green-800
```

### Warning (Amber)
```css
/* ❌ Missing dark variant → ✅ With dark variant */
text-amber-600   → text-amber-600 dark:text-amber-400
text-amber-700   → text-amber-700 dark:text-amber-300
bg-amber-50      → bg-amber-50 dark:bg-amber-950/20
border-amber-200 → border-amber-200 dark:border-amber-800
```

### Error (Red)
```css
/* ❌ Missing dark variant → ✅ With dark variant */
text-red-600     → text-red-600 dark:text-red-400
text-red-700     → text-red-700 dark:text-red-300
bg-red-50        → bg-red-50 dark:bg-red-950/20
border-red-200   → border-red-200 dark:border-red-800
```

### Info (Blue)
```css
/* ❌ Missing dark variant → ✅ With dark variant */
text-blue-600    → text-blue-600 dark:text-blue-400
text-blue-700    → text-blue-700 dark:text-blue-300
bg-blue-50       → bg-blue-50 dark:bg-blue-950/20
border-blue-200  → border-blue-200 dark:border-blue-800
```

## 🔧 Quick Commands

### Analyze a file
```bash
node scripts/color-migration-helper.js components/auth/login-form.tsx
```

### Analyze a directory
```bash
node scripts/color-migration-helper.js components/navigation/
```

### Find and replace (example)
```bash
# Replace text-gray-600 with text-muted-foreground
sed -i 's/text-gray-600/text-muted-foreground/g' your-file.tsx
```

## 📋 Common Patterns

### Form Input
```tsx
<input className="border border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-ring" />
```

### Button Primary
```tsx
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Button
</button>
```

### Card
```tsx
<div className="bg-card text-card-foreground border border-border rounded-lg p-4">
  Card content
</div>
```

### Success Alert
```tsx
<div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 p-4 rounded">
  Success message
</div>
```

### Navigation Link
```tsx
<a className="text-muted-foreground hover:text-foreground transition-colors">
  Link
</a>
```

## ✅ Validation Checklist

- [ ] No hardcoded gray colors (`text-gray-*`, `bg-gray-*`, `border-gray-*`)
- [ ] Semantic colors have dark variants (`dark:text-*`, `dark:bg-*`)
- [ ] Interactive elements have proper focus states
- [ ] Text maintains proper contrast ratios
- [ ] Component tested in both light and dark themes

## 🚀 Quick Start

1. **Scan your component**: `node scripts/color-migration-helper.js your-component.tsx`
2. **Apply replacements**: Use the suggestions from the script
3. **Test both themes**: Verify light and dark mode appearance
4. **Check accessibility**: Ensure proper contrast ratios
5. **Commit changes**: Your component is now theme-aware!

## 📚 Resources

- [Complete Color Mapping Guide](./color-mapping-guide.md)
- [Usage Examples](./color-usage-examples.tsx)
- [Color Mapping Utils](../lib/color-mapping-utils.ts)
- [Migration Helper Script](../scripts/color-migration-helper.js)