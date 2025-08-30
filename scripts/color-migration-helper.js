#!/usr/bin/env node

/**
 * Color Migration Helper Script
 * 
 * This script helps developers identify hardcoded colors in their components
 * and provides specific suggestions for theme-aware replacements.
 * 
 * Usage:
 *   node scripts/color-migration-helper.js [file-path]
 *   node scripts/color-migration-helper.js components/auth/login-form.tsx
 */

const fs = require('fs');
const path = require('path');

// Color mapping data (simplified version for Node.js)
const COLOR_MAPPINGS = [
  // Text Colors
  { hardcoded: 'text-gray-900', replacement: 'text-foreground', type: 'text', description: 'Primary text color' },
  { hardcoded: 'text-gray-800', replacement: 'text-foreground', type: 'text', description: 'Primary text color' },
  { hardcoded: 'text-gray-700', replacement: 'text-foreground', type: 'text', description: 'Primary text color' },
  { hardcoded: 'text-gray-600', replacement: 'text-muted-foreground', type: 'text', description: 'Secondary text color' },
  { hardcoded: 'text-gray-500', replacement: 'text-muted-foreground', type: 'text', description: 'Secondary text color' },
  { hardcoded: 'text-gray-400', replacement: 'text-muted-foreground', type: 'text', description: 'Tertiary text color' },
  { hardcoded: 'text-white', replacement: 'text-primary-foreground', type: 'text', description: 'Text on colored backgrounds' },
  { hardcoded: 'text-black', replacement: 'text-foreground', type: 'text', description: 'Primary text color' },
  
  // Background Colors
  { hardcoded: 'bg-white', replacement: 'bg-background', type: 'background', description: 'Main background color' },
  { hardcoded: 'bg-gray-50', replacement: 'bg-muted', type: 'background', description: 'Light background for sections' },
  { hardcoded: 'bg-gray-100', replacement: 'bg-muted', type: 'background', description: 'Light background for cards' },
  { hardcoded: 'bg-gray-200', replacement: 'bg-border', type: 'background', description: 'Subtle background for dividers' },
  { hardcoded: 'bg-gray-800', replacement: 'bg-card', type: 'background', description: 'Dark background for cards' },
  { hardcoded: 'bg-gray-900', replacement: 'bg-background', type: 'background', description: 'Dark background' },
  
  // Border Colors
  { hardcoded: 'border-gray-200', replacement: 'border-border', type: 'border', description: 'Standard border color' },
  { hardcoded: 'border-gray-300', replacement: 'border-border', type: 'border', description: 'Standard border color' },
  { hardcoded: 'border-gray-400', replacement: 'border-input', type: 'border', description: 'Input border color' }
];

const SEMANTIC_PATTERNS = [
  { pattern: /text-green-(\d+)(?!\s+dark:)/g, replacement: (match, shade) => `text-green-${shade} dark:text-green-${shade >= 600 ? 400 : 300}`, type: 'success' },
  { pattern: /text-red-(\d+)(?!\s+dark:)/g, replacement: (match, shade) => `text-red-${shade} dark:text-red-${shade >= 600 ? 400 : 300}`, type: 'error' },
  { pattern: /text-amber-(\d+)(?!\s+dark:)/g, replacement: (match, shade) => `text-amber-${shade} dark:text-amber-${shade >= 600 ? 400 : 300}`, type: 'warning' },
  { pattern: /text-blue-(\d+)(?!\s+dark:)/g, replacement: (match, shade) => `text-blue-${shade} dark:text-blue-${shade >= 600 ? 400 : 300}`, type: 'info' },
  { pattern: /bg-green-(\d+)(?!\s+dark:)/g, replacement: (match, shade) => `bg-green-${shade} dark:bg-green-950/20`, type: 'success' },
  { pattern: /bg-red-(\d+)(?!\s+dark:)/g, replacement: (match, shade) => `bg-red-${shade} dark:bg-red-950/20`, type: 'error' },
  { pattern: /bg-amber-(\d+)(?!\s+dark:)/g, replacement: (match, shade) => `bg-amber-${shade} dark:bg-amber-950/20`, type: 'warning' },
  { pattern: /bg-blue-(\d+)(?!\s+dark:)/g, replacement: (match, shade) => `bg-blue-${shade} dark:bg-blue-950/20`, type: 'info' }
];

function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`\n🔍 Analyzing: ${filePath}`);
  console.log('=' .repeat(60));
  
  const issues = [];
  let totalIssues = 0;

  // Check for hardcoded colors
  lines.forEach((line, index) => {
    COLOR_MAPPINGS.forEach(mapping => {
      if (line.includes(mapping.hardcoded)) {
        issues.push({
          line: index + 1,
          type: 'hardcoded',
          original: mapping.hardcoded,
          replacement: mapping.replacement,
          description: mapping.description,
          context: line.trim(),
          colorType: mapping.type
        });
        totalIssues++;
      }
    });

    // Check for semantic colors without dark variants
    SEMANTIC_PATTERNS.forEach(pattern => {
      const matches = [...line.matchAll(pattern.pattern)];
      matches.forEach(match => {
        // Only flag if the line doesn't already contain a dark variant
        if (!line.includes('dark:')) {
          issues.push({
            line: index + 1,
            type: 'semantic',
            original: match[0],
            replacement: pattern.replacement(match[0], match[1]),
            description: `${pattern.type} color needs dark mode variant`,
            context: line.trim(),
            colorType: pattern.type
          });
          totalIssues++;
        }
      });
    });
  });

  if (totalIssues === 0) {
    console.log('✅ No hardcoded colors found! This component is theme-aware.');
    return;
  }

  console.log(`\n📊 Found ${totalIssues} color issues:\n`);

  // Group issues by type
  const hardcodedIssues = issues.filter(issue => issue.type === 'hardcoded');
  const semanticIssues = issues.filter(issue => issue.type === 'semantic');

  if (hardcodedIssues.length > 0) {
    console.log('🎨 HARDCODED COLORS TO REPLACE:');
    console.log('-'.repeat(40));
    
    hardcodedIssues.forEach(issue => {
      console.log(`Line ${issue.line}: ${issue.colorType.toUpperCase()}`);
      console.log(`  ❌ ${issue.original}`);
      console.log(`  ✅ ${issue.replacement}`);
      console.log(`  💡 ${issue.description}`);
      console.log(`  📝 Context: ${issue.context}`);
      console.log('');
    });
  }

  if (semanticIssues.length > 0) {
    console.log('🌈 SEMANTIC COLORS NEEDING DARK VARIANTS:');
    console.log('-'.repeat(40));
    
    semanticIssues.forEach(issue => {
      console.log(`Line ${issue.line}: ${issue.colorType.toUpperCase()}`);
      console.log(`  ❌ ${issue.original}`);
      console.log(`  ✅ ${issue.replacement}`);
      console.log(`  💡 ${issue.description}`);
      console.log(`  📝 Context: ${issue.context}`);
      console.log('');
    });
  }

  // Generate migration summary
  console.log('📋 MIGRATION SUMMARY:');
  console.log('-'.repeat(40));
  console.log(`Total issues: ${totalIssues}`);
  console.log(`Hardcoded colors: ${hardcodedIssues.length}`);
  console.log(`Semantic colors needing dark variants: ${semanticIssues.length}`);
  
  const priority = getFilePriority(filePath);
  console.log(`Migration priority: ${priority.toUpperCase()}`);
  
  const estimatedTime = Math.ceil(totalIssues * 2); // 2 minutes per issue
  console.log(`Estimated migration time: ${estimatedTime} minutes`);

  // Generate replacement script
  console.log('\n🔧 QUICK REPLACEMENT COMMANDS:');
  console.log('-'.repeat(40));
  
  const uniqueReplacements = [...new Set(issues.map(issue => ({ original: issue.original, replacement: issue.replacement })))];
  uniqueReplacements.forEach(({ original, replacement }) => {
    console.log(`sed -i 's/${original}/${replacement}/g' ${filePath}`);
  });

  console.log('\n💡 NEXT STEPS:');
  console.log('-'.repeat(40));
  console.log('1. Make the replacements shown above');
  console.log('2. Test the component in both light and dark themes');
  console.log('3. Verify accessibility with contrast ratio checks');
  console.log('4. Run the theme testing suite to ensure no regressions');
  console.log('\n📖 For detailed guidance, see: docs/color-mapping-guide.md');
}

function getFilePriority(filePath) {
  const highPriorityPaths = ['components/navigation/', 'components/auth/', 'components/projects/', 'app/(app)/'];
  const mediumPriorityPaths = ['components/talent/', 'components/ui/', 'app/'];

  if (highPriorityPaths.some(path => filePath.includes(path))) {
    return 'high';
  }
  if (mediumPriorityPaths.some(path => filePath.includes(path))) {
    return 'medium';
  }
  return 'low';
}

function analyzeDirectory(dirPath) {
  console.log(`\n🔍 Analyzing directory: ${dirPath}`);
  console.log('=' .repeat(60));

  const files = getAllFiles(dirPath, ['.tsx', '.ts', '.jsx', '.js']);
  const summary = {
    totalFiles: files.length,
    filesWithIssues: 0,
    totalIssues: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0
  };

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let fileIssues = 0;

    lines.forEach(line => {
      COLOR_MAPPINGS.forEach(mapping => {
        if (line.includes(mapping.hardcoded)) {
          fileIssues++;
        }
      });

      SEMANTIC_PATTERNS.forEach(pattern => {
        const matches = [...line.matchAll(pattern.pattern)];
        fileIssues += matches.length;
      });
    });

    if (fileIssues > 0) {
      summary.filesWithIssues++;
      summary.totalIssues += fileIssues;
      
      const priority = getFilePriority(file);
      summary[`${priority}Priority`]++;
      
      console.log(`${file}: ${fileIssues} issues (${priority} priority)`);
    }
  });

  console.log('\n📊 DIRECTORY SUMMARY:');
  console.log('-'.repeat(40));
  console.log(`Total files scanned: ${summary.totalFiles}`);
  console.log(`Files with color issues: ${summary.filesWithIssues}`);
  console.log(`Total color issues: ${summary.totalIssues}`);
  console.log(`High priority files: ${summary.highPriority}`);
  console.log(`Medium priority files: ${summary.mediumPriority}`);
  console.log(`Low priority files: ${summary.lowPriority}`);
  
  const estimatedHours = Math.ceil(summary.totalIssues * 2 / 60); // 2 minutes per issue
  console.log(`Estimated total migration time: ${estimatedHours} hours`);
}

function getAllFiles(dirPath, extensions) {
  let files = [];
  
  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files = files.concat(getAllFiles(fullPath, extensions));
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      files.push(fullPath);
    }
  });
  
  return files;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('🎨 Color Migration Helper');
  console.log('========================');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/color-migration-helper.js <file-path>     # Analyze single file');
  console.log('  node scripts/color-migration-helper.js <directory>     # Analyze directory');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/color-migration-helper.js components/auth/login-form.tsx');
  console.log('  node scripts/color-migration-helper.js components/navigation/');
  console.log('  node scripts/color-migration-helper.js components/');
  process.exit(1);
}

const targetPath = args[0];

if (fs.existsSync(targetPath)) {
  const stat = fs.statSync(targetPath);
  
  if (stat.isFile()) {
    analyzeFile(targetPath);
  } else if (stat.isDirectory()) {
    analyzeDirectory(targetPath);
  }
} else {
  console.error(`❌ Path not found: ${targetPath}`);
  process.exit(1);
}