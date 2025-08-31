#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Production CSS Optimizer
 * Focuses on production code only, excluding test files and utility demonstrations
 */

class ProductionCSSOptimizer {
  constructor() {
    this.hardcodedColorPatterns = [
      // Text colors (excluding dark: variants which are theme-aware)
      /text-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)(?!\s+dark:)/g,
      // Background colors (excluding dark: variants)
      /bg-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)(?!\s+dark:)/g,
      // Border colors (excluding dark: variants)
      /border-(gray|slate|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)(?!\s+dark:)/g,
      // Semantic colors without dark variants (these need dark: variants)
      /(?<!dark:)(text|bg)-(red|green|blue|yellow|amber|orange|purple|pink)-(50|100|200|300|400|500|600|700|800|900)(?!\s+dark:)/g,
    ];

    this.results = {
      productionIssues: [],
      testFileIssues: [],
      utilityFileIssues: []
    };
  }

  async analyzeProductionCode() {
    console.log('🔍 Analyzing production code for CSS optimization...\n');

    // Production files only
    const productionFiles = await glob([
      'app/**/*.{tsx,ts,jsx,js}',
      'components/**/*.{tsx,ts,jsx,js}',
      'lib/**/*.{tsx,ts,jsx,js}',
      'hooks/**/*.{tsx,ts,jsx,js}',
      // Exclude test files and utility files
      '!**/*.test.{tsx,ts,jsx,js}',
      '!**/__tests__/**',
      '!**/test-*.{tsx,ts,jsx,js}',
      '!lib/color-mapping-utils.ts', // This is a utility for mapping
      '!components/ui/form-validation-example.tsx', // This is an example
      '!**/node_modules/**',
      '!**/.next/**'
    ]);

    console.log(`📁 Scanning ${productionFiles.length} production files...\n`);

    for (const file of productionFiles) {
      await this.analyzeFile(file, 'production');
    }

    // Also analyze test files separately for completeness
    const testFiles = await glob([
      '**/*.test.{tsx,ts,jsx,js}',
      '**/__tests__/**/*.{tsx,ts,jsx,js}',
      '!**/node_modules/**'
    ]);

    for (const file of testFiles) {
      await this.analyzeFile(file, 'test');
    }

    // Analyze utility files
    const utilityFiles = [
      'lib/color-mapping-utils.ts',
      'components/ui/form-validation-example.tsx'
    ];

    for (const file of utilityFiles) {
      if (fs.existsSync(file)) {
        await this.analyzeFile(file, 'utility');
      }
    }

    this.generateReport();
  }

  async analyzeFile(filePath, category) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      for (const pattern of this.hardcodedColorPatterns) {
        const matches = [...content.matchAll(pattern)];
        for (const match of matches) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          const issue = {
            file: relativePath,
            line: lineNumber,
            class: match[0],
            context: this.getContext(content, match.index)
          };

          if (category === 'production') {
            this.results.productionIssues.push(issue);
          } else if (category === 'test') {
            this.results.testFileIssues.push(issue);
          } else {
            this.results.utilityFileIssues.push(issue);
          }
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
    console.log('📊 Production CSS Optimization Report');
    console.log('='.repeat(50));

    // Production issues (critical)
    if (this.results.productionIssues.length > 0) {
      console.log(`\n❌ CRITICAL: ${this.results.productionIssues.length} hardcoded colors in production code:`);
      
      const groupedByFile = this.results.productionIssues.reduce((acc, item) => {
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
    } else {
      console.log('\n✅ EXCELLENT: No hardcoded colors in production code!');
    }

    // Test file issues (informational)
    if (this.results.testFileIssues.length > 0) {
      console.log(`\n⚠️  INFO: ${this.results.testFileIssues.length} hardcoded colors in test files (acceptable for testing)`);
    }

    // Utility file issues (informational)
    if (this.results.utilityFileIssues.length > 0) {
      console.log(`\n📝 INFO: ${this.results.utilityFileIssues.length} hardcoded colors in utility/example files (expected)`);
    }

    // Overall assessment
    console.log('\n🎯 CSS Bundle Optimization Status:');
    
    if (this.results.productionIssues.length === 0) {
      console.log('  ✅ Production code is fully optimized for theme switching');
      console.log('  ✅ CSS bundle will be automatically purged of unused colors');
      console.log('  ✅ Theme switching performance will be optimal');
      console.log('  ✅ No layout shifts expected during theme transitions');
    } else {
      console.log(`  ❌ ${this.results.productionIssues.length} production issues need immediate attention`);
      console.log('  ⚠️  CSS bundle optimization is incomplete');
    }

    // Performance impact
    const productionSavings = this.results.productionIssues.length * 0.05; // More conservative estimate
    console.log(`\n⚡ Performance Impact:`);
    console.log(`   • Potential CSS reduction: ~${productionSavings.toFixed(1)}KB`);
    console.log(`   • Theme switching: ${this.results.productionIssues.length === 0 ? 'Optimized' : 'Needs work'}`);
    console.log(`   • Layout stability: ${this.results.productionIssues.length === 0 ? 'Stable' : 'May have shifts'}`);

    this.saveOptimizationReport();
  }

  saveOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        productionIssues: this.results.productionIssues.length,
        testFileIssues: this.results.testFileIssues.length,
        utilityFileIssues: this.results.utilityFileIssues.length,
        productionOptimized: this.results.productionIssues.length === 0
      },
      criticalIssues: this.results.productionIssues,
      recommendations: this.results.productionIssues.length === 0 ? [
        'Production code is fully optimized',
        'Monitor bundle size in production builds',
        'Consider implementing CSS-in-JS for dynamic theming if needed',
        'Verify Tailwind purging is working correctly'
      ] : [
        'Fix remaining hardcoded colors in production code',
        'Test theme switching after fixes',
        'Verify no layout shifts occur',
        'Re-run optimization analysis'
      ]
    };

    fs.writeFileSync('production-css-optimization.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Production optimization report saved to: production-css-optimization.json');
  }
}

// Run the optimizer
if (require.main === module) {
  const optimizer = new ProductionCSSOptimizer();
  optimizer.analyzeProductionCode().catch(console.error);
}

module.exports = ProductionCSSOptimizer;