#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Color Audit System for Theme Color Overhaul
 * Scans all component files for hardcoded color classes and generates a comprehensive report
 */

// Regex patterns for detecting hardcoded colors
const COLOR_PATTERNS = {
  // Text colors
  text: /text-(gray|slate|zinc|neutral|stone|white|black)-(50|100|200|300|400|500|600|700|800|900)\b/g,
  
  // Background colors
  background: /bg-(gray|slate|zinc|neutral|stone|white|black)-(50|100|200|300|400|500|600|700|800|900)\b/g,
  
  // Border colors
  border: /border-(gray|slate|zinc|neutral|stone|white|black)-(50|100|200|300|400|500|600|700|800|900)\b/g,
  
  // Semantic colors without dark variants (problematic)
  semanticWithoutDark: /(text|bg|border)-(red|green|blue|yellow|amber|orange|purple|pink)-(50|100|200|300|400|500|600|700|800|900)(?!.*dark:)/g,
  
  // Absolute colors (white/black without context)
  absolute: /(text|bg|border)-(white|black)\b/g
};

// Component priority mapping based on usage and importance
const COMPONENT_PRIORITIES = {
  high: [
    'components/navigation/',
    'components/auth/',
    'components/projects/',
    'app/(app)/',
    'app/layout.tsx',
    'app/page.tsx'
  ],
  medium: [
    'components/talent/',
    'components/ui/',
    'components/team/',
    'components/timecards/',
    'app/login/',
    'app/register/',
    'app/setup/'
  ],
  low: [
    'components/admin/',
    'components/debug/',
    '__tests__/',
    '.test.',
    '.spec.'
  ]
};

// Color replacement suggestions
const COLOR_REPLACEMENTS = {
  // Text colors
  'text-gray-900': 'text-foreground',
  'text-gray-800': 'text-foreground', 
  'text-gray-700': 'text-foreground',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground',
  'text-gray-300': 'text-muted-foreground',
  'text-white': 'text-primary-foreground (on colored backgrounds)',
  'text-black': 'text-foreground',
  
  // Background colors
  'bg-white': 'bg-background or bg-card',
  'bg-gray-50': 'bg-muted',
  'bg-gray-100': 'bg-muted',
  'bg-gray-200': 'bg-border',
  'bg-gray-800': 'bg-card (dark context)',
  'bg-gray-900': 'bg-background (dark context)',
  
  // Border colors
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
  
  // Semantic colors (examples)
  'text-green-600': 'text-green-600 dark:text-green-400',
  'text-red-600': 'text-red-600 dark:text-red-400',
  'text-blue-600': 'text-blue-600 dark:text-blue-400',
  'text-amber-600': 'text-amber-600 dark:text-amber-400'
};

class ColorAuditor {
  constructor() {
    this.results = [];
    this.summary = {
      totalFiles: 0,
      filesWithIssues: 0,
      totalIssues: 0,
      priorityBreakdown: { high: 0, medium: 0, low: 0 },
      colorTypeBreakdown: { text: 0, background: 0, border: 0, semantic: 0, absolute: 0 }
    };
  }

  /**
   * Determine component priority based on file path
   */
  getComponentPriority(filePath) {
    for (const [priority, patterns] of Object.entries(COMPONENT_PRIORITIES)) {
      if (patterns.some(pattern => filePath.includes(pattern))) {
        return priority;
      }
    }
    return 'medium'; // default priority
  }

  /**
   * Estimate effort in hours based on number of issues and complexity
   */
  estimateEffort(issueCount, priority) {
    const baseEffort = issueCount * 0.1; // 6 minutes per color replacement
    const priorityMultiplier = { high: 1.5, medium: 1.0, low: 0.8 };
    return Math.max(0.25, Math.round((baseEffort * priorityMultiplier[priority]) * 4) / 4); // Round to nearest 15 minutes
  }

  /**
   * Scan a single file for hardcoded colors
   */
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const hardcodedColors = [];

      // Scan each line for color patterns
      lines.forEach((line, lineIndex) => {
        Object.entries(COLOR_PATTERNS).forEach(([colorType, pattern]) => {
          let match;
          while ((match = pattern.exec(line)) !== null) {
            const colorClass = match[0];
            const context = this.getContext(lines, lineIndex, match.index);
            
            hardcodedColors.push({
              lineNumber: lineIndex + 1,
              currentClass: colorClass,
              suggestedReplacement: COLOR_REPLACEMENTS[colorClass] || `${colorClass} (needs manual review)`,
              colorType: this.normalizeColorType(colorType),
              context: context,
              column: match.index + 1
            });

            this.summary.colorTypeBreakdown[this.normalizeColorType(colorType)]++;
          }
          // Reset regex lastIndex to avoid issues with global flag
          pattern.lastIndex = 0;
        });
      });

      if (hardcodedColors.length > 0) {
        const priority = this.getComponentPriority(filePath);
        const estimatedEffort = this.estimateEffort(hardcodedColors.length, priority);

        this.results.push({
          filePath,
          hardcodedColors,
          priority,
          estimatedEffort,
          totalIssues: hardcodedColors.length
        });

        this.summary.filesWithIssues++;
        this.summary.totalIssues += hardcodedColors.length;
        this.summary.priorityBreakdown[priority]++;
      }

      this.summary.totalFiles++;
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Get surrounding context for a color match
   */
  getContext(lines, lineIndex, columnIndex) {
    const line = lines[lineIndex];
    const start = Math.max(0, columnIndex - 20);
    const end = Math.min(line.length, columnIndex + 50);
    return line.substring(start, end).trim();
  }

  /**
   * Normalize color type names for consistency
   */
  normalizeColorType(colorType) {
    const typeMap = {
      'text': 'text',
      'background': 'background', 
      'border': 'border',
      'semanticWithoutDark': 'semantic',
      'absolute': 'absolute'
    };
    return typeMap[colorType] || colorType;
  }

  /**
   * Generate comprehensive audit report
   */
  generateReport() {
    const timestamp = new Date().toISOString();
    
    let report = `# Color Audit Report\n\n`;
    report += `**Generated:** ${timestamp}\n\n`;
    
    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `- **Total Files Scanned:** ${this.summary.totalFiles}\n`;
    report += `- **Files with Issues:** ${this.summary.filesWithIssues}\n`;
    report += `- **Total Hardcoded Colors:** ${this.summary.totalIssues}\n`;
    report += `- **Estimated Total Effort:** ${this.results.reduce((sum, r) => sum + r.estimatedEffort, 0)} hours\n\n`;

    // Priority Breakdown
    report += `## Priority Breakdown\n\n`;
    Object.entries(this.summary.priorityBreakdown).forEach(([priority, count]) => {
      const percentage = this.summary.filesWithIssues > 0 ? ((count / this.summary.filesWithIssues) * 100).toFixed(1) : 0;
      report += `- **${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority:** ${count} files (${percentage}%)\n`;
    });
    report += `\n`;

    // Color Type Breakdown
    report += `## Color Type Breakdown\n\n`;
    Object.entries(this.summary.colorTypeBreakdown).forEach(([type, count]) => {
      const percentage = this.summary.totalIssues > 0 ? ((count / this.summary.totalIssues) * 100).toFixed(1) : 0;
      report += `- **${type.charAt(0).toUpperCase() + type.slice(1)} Colors:** ${count} instances (${percentage}%)\n`;
    });
    report += `\n`;

    // Detailed Results by Priority
    ['high', 'medium', 'low'].forEach(priority => {
      const priorityResults = this.results.filter(r => r.priority === priority);
      if (priorityResults.length === 0) return;

      report += `## ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority Components\n\n`;
      
      priorityResults
        .sort((a, b) => b.totalIssues - a.totalIssues) // Sort by issue count descending
        .forEach(result => {
          report += `### ${result.filePath}\n\n`;
          report += `- **Issues:** ${result.totalIssues}\n`;
          report += `- **Estimated Effort:** ${result.estimatedEffort} hours\n\n`;
          
          result.hardcodedColors.forEach(color => {
            report += `**Line ${color.lineNumber}:** \`${color.currentClass}\`\n`;
            report += `- **Suggested:** \`${color.suggestedReplacement}\`\n`;
            report += `- **Type:** ${color.colorType}\n`;
            report += `- **Context:** \`${color.context}\`\n\n`;
          });
        });
    });

    // Migration Checklist
    report += `## Migration Checklist\n\n`;
    this.results
      .sort((a, b) => {
        // Sort by priority first, then by issue count
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.totalIssues - a.totalIssues;
      })
      .forEach(result => {
        report += `- [ ] **${result.filePath}** (${result.priority} priority, ${result.totalIssues} issues, ~${result.estimatedEffort}h)\n`;
      });

    return report;
  }

  /**
   * Run the complete audit process
   */
  async run() {
    console.log('🎨 Starting Color Audit System...\n');

    // Define file patterns to scan
    const patterns = [
      'app/**/*.{tsx,jsx,ts,js}',
      'components/**/*.{tsx,jsx,ts,js}',
      'lib/**/*.{tsx,jsx,ts,js}',
      'hooks/**/*.{tsx,jsx,ts,js}'
    ];

    // Collect all files to scan
    const allFiles = [];
    for (const pattern of patterns) {
      const files = glob.sync(pattern, { 
        ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/*.d.ts'] 
      });
      allFiles.push(...files);
    }

    console.log(`📁 Found ${allFiles.length} files to scan...\n`);

    // Scan each file
    allFiles.forEach((file, index) => {
      if (index % 10 === 0) {
        console.log(`📊 Progress: ${index}/${allFiles.length} files scanned...`);
      }
      this.scanFile(file);
    });

    console.log(`✅ Scan complete! Found ${this.summary.totalIssues} hardcoded colors in ${this.summary.filesWithIssues} files.\n`);

    // Generate and save report
    const report = this.generateReport();
    const reportPath = 'color-audit-report.md';
    fs.writeFileSync(reportPath, report);

    console.log(`📋 Detailed report saved to: ${reportPath}`);
    console.log(`⏱️  Estimated total effort: ${this.results.reduce((sum, r) => sum + r.estimatedEffort, 0)} hours`);

    // Generate JSON report for programmatic use
    const jsonReport = {
      timestamp: new Date().toISOString(),
      summary: this.summary,
      results: this.results
    };
    fs.writeFileSync('color-audit-report.json', JSON.stringify(jsonReport, null, 2));
    console.log(`📊 JSON report saved to: color-audit-report.json\n`);

    return this.results;
  }
}

// Run the audit if this script is executed directly
if (require.main === module) {
  const auditor = new ColorAuditor();
  auditor.run().catch(console.error);
}

module.exports = ColorAuditor;