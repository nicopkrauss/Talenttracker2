#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * CSS Bundle Optimizer for Theme Color Overhaul
 * 
 * This script analyzes the codebase to:
 * 1. Identify unused hardcoded color classes
 * 2. Report on CSS bundle optimization opportunities
 * 3. Validate theme-aware class usage
 */

class CSSBundleOptimizer {
  constructor() {
    this.hardcodedColorPatterns = [
      // Text colors
      /text-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)/g,
      // Background colors
      /bg-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)/g,
      // Border colors
      /border-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)/g,
      // Semantic colors without dark variants
      /text-(red|green|blue|yellow|amber|orange|purple|pink)-(50|100|200|300|400|500|600|700|800|900)(?!.*dark:)/g,
      /bg-(red|green|blue|yellow|amber|orange|purple|pink)-(50|100|200|300|400|500|600|700|800|900)(?!.*dark:)/g,
    ];

    this.themeAwarePatterns = [
      /text-(foreground|muted-foreground|primary-foreground|secondary-foreground|accent-foreground|destructive-foreground)/g,
      /bg-(background|card|muted|primary|secondary|accent|destructive)/g,
      /border-(border|input|ring)/g,
      /(text|bg)-(red|green|blue|yellow|amber|orange|purple|pink)-\d+\s+dark:(text|bg)-(red|green|blue|yellow|amber|orange|purple|pink)-\d+/g,
    ];

    this.results = {
      hardcodedColors: [],
      themeAwareClasses: [],
      unusedClasses: [],
      bundleSize: 0,
      optimizationOpportunities: []
    };
  }

  async analyzeCodebase() {
    console.log('🔍 Analyzing codebase for CSS optimization opportunities...\n');

    // Get all relevant files
    const files = await glob([
      'app/**/*.{tsx,ts,jsx,js}',
      'components/**/*.{tsx,ts,jsx,js}',
      'lib/**/*.{tsx,ts,jsx,js}',
      'hooks/**/*.{tsx,ts,jsx,js}',
      '!**/*.test.{tsx,ts,jsx,js}',
      '!**/node_modules/**',
      '!**/.next/**'
    ]);

    console.log(`📁 Scanning ${files.length} files...\n`);

    for (const file of files) {
      await this.analyzeFile(file);
    }

    this.generateReport();
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      // Check for hardcoded colors
      for (const pattern of this.hardcodedColorPatterns) {
        const matches = [...content.matchAll(pattern)];
        for (const match of matches) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          this.results.hardcodedColors.push({
            file: relativePath,
            line: lineNumber,
            class: match[0],
            context: this.getContext(content, match.index)
          });
        }
      }

      // Check for theme-aware classes
      for (const pattern of this.themeAwarePatterns) {
        const matches = [...content.matchAll(pattern)];
        for (const match of matches) {
          this.results.themeAwareClasses.push({
            file: relativePath,
            class: match[0]
          });
        }
      }

    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error.message);
    }
  }

  getContext(content, index) {
    const lines = content.split('\n');
    const lineIndex = content.substring(0, index).split('\n').length - 1;
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length, lineIndex + 2);
    return lines.slice(start, end).join('\n');
  }

  generateReport() {
    console.log('📊 CSS Bundle Optimization Report');
    console.log('='.repeat(50));

    // Hardcoded colors that should be migrated
    if (this.results.hardcodedColors.length > 0) {
      console.log(`\n❌ Found ${this.results.hardcodedColors.length} hardcoded color classes:`);
      
      const groupedByFile = this.results.hardcodedColors.reduce((acc, item) => {
        if (!acc[item.file]) acc[item.file] = [];
        acc[item.file].push(item);
        return acc;
      }, {});

      Object.entries(groupedByFile).forEach(([file, colors]) => {
        console.log(`\n  📄 ${file}:`);
        colors.forEach(color => {
          console.log(`    Line ${color.line}: ${color.class}`);
        });
      });

      console.log(`\n⚠️  These classes should be replaced with theme-aware alternatives.`);
    } else {
      console.log('\n✅ No hardcoded color classes found! Theme migration is complete.');
    }

    // Theme-aware classes usage
    const uniqueThemeClasses = [...new Set(this.results.themeAwareClasses.map(c => c.class))];
    console.log(`\n✅ Found ${uniqueThemeClasses.length} unique theme-aware classes in use:`);
    uniqueThemeClasses.forEach(className => {
      console.log(`  • ${className}`);
    });

    // Optimization recommendations
    console.log('\n🚀 Optimization Recommendations:');
    
    if (this.results.hardcodedColors.length === 0) {
      console.log('  ✅ All hardcoded colors have been migrated to theme-aware classes');
      console.log('  ✅ CSS bundle is optimized for theme switching');
      console.log('  ✅ Tailwind CSS purging will remove unused color classes automatically');
    } else {
      console.log(`  ⚠️  ${this.results.hardcodedColors.length} hardcoded colors need migration`);
      console.log('  📝 Complete the migration to enable full CSS optimization');
    }

    // Bundle size estimation
    const estimatedSavings = this.results.hardcodedColors.length * 0.1; // Rough estimate
    console.log(`\n📦 Estimated CSS bundle size reduction: ~${estimatedSavings.toFixed(1)}KB`);
    console.log('   (Actual savings depend on Tailwind CSS purging and compression)');

    // Save detailed report
    this.saveDetailedReport();
  }

  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        hardcodedColorsFound: this.results.hardcodedColors.length,
        themeAwareClassesFound: this.results.themeAwareClasses.length,
        migrationComplete: this.results.hardcodedColors.length === 0
      },
      hardcodedColors: this.results.hardcodedColors,
      themeAwareClasses: this.results.themeAwareClasses,
      recommendations: [
        'Complete migration of any remaining hardcoded colors',
        'Verify Tailwind CSS purging is enabled in production builds',
        'Monitor bundle size after deployment',
        'Consider using CSS custom properties for complex color logic'
      ]
    };

    fs.writeFileSync('css-bundle-optimization-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Detailed report saved to: css-bundle-optimization-report.json');
  }
}

// Run the optimizer
if (require.main === module) {
  const optimizer = new CSSBundleOptimizer();
  optimizer.analyzeCodebase().catch(console.error);
}

module.exports = CSSBundleOptimizer;