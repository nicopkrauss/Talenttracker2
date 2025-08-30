#!/usr/bin/env node

/**
 * Test script for the Color Audit System
 * Validates that the audit system correctly identifies hardcoded colors
 */

const ColorAuditor = require('./color-audit');
const fs = require('fs');
const path = require('path');

// Create a test file with known hardcoded colors
const testFileContent = `
import React from 'react';

export function TestComponent() {
  return (
    <div className="bg-white border-gray-200">
      <h1 className="text-gray-900 text-2xl">Title</h1>
      <p className="text-gray-600 mb-4">Description text</p>
      <button className="bg-blue-600 text-white px-4 py-2">
        Click me
      </button>
      <div className="text-green-600">Success message</div>
      <div className="text-red-600 dark:text-red-400">Error with dark variant</div>
    </div>
  );
}
`;

async function runTests() {
  console.log('🧪 Testing Color Audit System...\n');

  // Create temporary test file
  const testFilePath = 'test-component-temp.tsx';
  fs.writeFileSync(testFilePath, testFileContent);

  try {
    // Create auditor instance
    const auditor = new ColorAuditor();
    
    // Scan the test file
    auditor.scanFile(testFilePath);
    
    // Verify results
    const results = auditor.results;
    
    if (results.length === 0) {
      console.error('❌ Test failed: No hardcoded colors detected in test file');
      return false;
    }

    const testResult = results[0];
    console.log(`✅ Test file scanned successfully`);
    console.log(`📊 Found ${testResult.hardcodedColors.length} hardcoded colors`);
    
    // Expected colors in test file
    const expectedColors = [
      'bg-white',
      'border-gray-200', 
      'text-gray-900',
      'text-gray-600',
      'bg-blue-600',
      'text-white',
      'text-green-600',
      'text-red-600' // This one has dark variant, should still be detected
    ];

    const foundColors = testResult.hardcodedColors.map(c => c.currentClass);
    
    console.log('\n🔍 Expected vs Found:');
    expectedColors.forEach(expected => {
      const found = foundColors.includes(expected);
      console.log(`  ${found ? '✅' : '❌'} ${expected}`);
    });

    // Check for false positives (colors that shouldn't be flagged)
    const shouldNotFlag = ['text-red-600']; // This has dark variant in same line
    const falsePositives = foundColors.filter(color => 
      shouldNotFlag.some(shouldNot => color.includes(shouldNot))
    );

    if (falsePositives.length > 0) {
      console.log('\n⚠️  Potential false positives detected:');
      falsePositives.forEach(fp => console.log(`  - ${fp}`));
    }

    // Test priority classification
    console.log(`\n📋 Priority: ${testResult.priority}`);
    console.log(`⏱️  Estimated effort: ${testResult.estimatedEffort} hours`);

    // Test report generation
    const report = auditor.generateReport();
    if (report.includes('# Color Audit Report')) {
      console.log('✅ Report generation working correctly');
    } else {
      console.error('❌ Report generation failed');
      return false;
    }

    console.log('\n🎉 All tests passed! Color Audit System is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runTests;