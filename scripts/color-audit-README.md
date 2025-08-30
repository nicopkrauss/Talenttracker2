# Color Audit System

This automated system scans the entire codebase for hardcoded color classes and generates comprehensive reports to support the theme color overhaul project.

## Features

- **Comprehensive Scanning**: Detects hardcoded colors in all React/TypeScript files
- **Priority Categorization**: Classifies components by importance (high/medium/low priority)
- **Effort Estimation**: Provides time estimates for migration work
- **Detailed Reporting**: Generates both human-readable and machine-readable reports
- **Smart Suggestions**: Recommends appropriate theme-aware replacements

## Usage

### Quick Start
```bash
# Run the color audit
npm run color-audit

# Or run directly
node scripts/color-audit.js
```

### Output Files
- `color-audit-report.md` - Human-readable detailed report
- `color-audit-report.json` - Machine-readable structured data

## What It Detects

### Hardcoded Color Patterns
- **Text Colors**: `text-gray-600`, `text-white`, `text-black`, etc.
- **Background Colors**: `bg-gray-50`, `bg-white`, `bg-gray-900`, etc.
- **Border Colors**: `border-gray-200`, `border-gray-300`, etc.
- **Semantic Colors Without Dark Variants**: `text-red-600` (without `dark:text-red-400`)
- **Absolute Colors**: `text-white`, `bg-black` without proper context

### Priority Classification

#### High Priority Components
- Navigation system (`components/navigation/`)
- Authentication components (`components/auth/`)
- Project management (`components/projects/`)
- Main application pages (`app/(app)/`)

#### Medium Priority Components
- Talent management (`components/talent/`)
- UI components (`components/ui/`)
- Team components (`components/team/`)
- Timecard components (`components/timecards/`)

#### Low Priority Components
- Admin utilities (`components/admin/`)
- Debug components (`components/debug/`)
- Test files (`__tests__/`, `.test.`, `.spec.`)

## Report Structure

### Executive Summary
- Total files scanned
- Files with hardcoded colors
- Total color issues found
- Estimated effort in hours

### Priority Breakdown
- Distribution of issues by component priority
- Percentage breakdown for planning

### Color Type Analysis
- Breakdown by color type (text, background, border, semantic, absolute)
- Helps identify most common issues

### Detailed Results
- File-by-file breakdown
- Line numbers and context
- Suggested replacements
- Individual effort estimates

### Migration Checklist
- Prioritized task list
- Ready for project management tools
- Effort estimates for planning

## Color Replacement Guidelines

### Theme-Aware Replacements
```css
/* Text Colors */
text-gray-900 → text-foreground
text-gray-600 → text-muted-foreground
text-white → text-primary-foreground (on colored backgrounds)

/* Background Colors */
bg-white → bg-background or bg-card
bg-gray-50 → bg-muted
bg-gray-100 → bg-muted

/* Semantic Colors (add dark variants) */
text-green-600 → text-green-600 dark:text-green-400
text-red-600 → text-red-600 dark:text-red-400
text-blue-600 → text-blue-600 dark:text-blue-400
```

## Integration with Development Workflow

### Pre-commit Hook (Future Enhancement)
The audit system can be integrated into pre-commit hooks to prevent new hardcoded colors:

```bash
# Add to .husky/pre-commit or similar
npm run color-audit --silent --exit-on-issues
```

### CI/CD Integration (Future Enhancement)
Add to GitHub Actions or similar CI/CD pipeline:

```yaml
- name: Color Audit Check
  run: npm run color-audit --ci-mode
```

## Customization

### Adding New Color Patterns
Edit `COLOR_PATTERNS` in `scripts/color-audit.js`:

```javascript
const COLOR_PATTERNS = {
  // Add new patterns here
  customPattern: /your-regex-here/g
};
```

### Adjusting Priority Classifications
Modify `COMPONENT_PRIORITIES` to change how components are categorized:

```javascript
const COMPONENT_PRIORITIES = {
  high: ['your/high/priority/paths'],
  medium: ['your/medium/priority/paths'],
  low: ['your/low/priority/paths']
};
```

### Custom Replacement Suggestions
Update `COLOR_REPLACEMENTS` to provide better suggestions:

```javascript
const COLOR_REPLACEMENTS = {
  'your-color-class': 'suggested-replacement'
};
```

## Technical Details

- **Language**: Node.js
- **Dependencies**: `glob` for file pattern matching
- **File Types**: `.tsx`, `.jsx`, `.ts`, `.js`
- **Exclusions**: `node_modules`, `.next`, `dist`, type definition files
- **Performance**: Processes ~167 files in under 5 seconds

## Maintenance

### Regular Audits
Run the audit regularly during development:
- Before starting theme migration work
- After completing major component updates
- As part of code review process

### Report Analysis
Use the generated reports to:
- Track migration progress
- Identify regression in new code
- Plan development sprints
- Estimate project timelines

## Troubleshooting

### Common Issues
1. **Permission Errors**: Ensure script has read access to all directories
2. **Missing Dependencies**: Run `npm install` to ensure `glob` is available
3. **Large Codebases**: Script may take longer on very large projects

### Performance Tips
- Exclude unnecessary directories in glob patterns
- Run on specific subdirectories for faster iteration
- Use JSON output for programmatic processing