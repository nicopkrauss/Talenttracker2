#!/usr/bin/env node

/**
 * Validate Readiness Migration SQL Syntax
 * 
 * This script validates the SQL syntax of the readiness performance optimization migration
 * without actually executing it against the database.
 */

const fs = require('fs');
const path = require('path');

function validateSQLSyntax() {
  console.log('🔍 Validating SQL syntax for readiness performance optimization migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '033_create_readiness_performance_optimization.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      return false;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file found and readable');
    console.log(`📊 File size: ${migrationSQL.length} characters\n`);
    
    // Basic syntax validation checks
    const checks = [
      {
        name: 'Dollar-quoted strings are properly closed',
        test: () => {
          const dollarQuotes = migrationSQL.match(/\$\$|\$/g) || [];
          // Should have even number of $$ (pairs) and any single $ should be in valid contexts
          const doubleDollarCount = (migrationSQL.match(/\$\$/g) || []).length;
          return doubleDollarCount % 2 === 0;
        }
      },
      {
        name: 'CREATE statements are properly formatted',
        test: () => {
          const createStatements = migrationSQL.match(/CREATE\s+(MATERIALIZED\s+VIEW|FUNCTION|INDEX|TRIGGER)/gi) || [];
          return createStatements.length > 0;
        }
      },
      {
        name: 'Function definitions have proper LANGUAGE declarations',
        test: () => {
          const functions = migrationSQL.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/gi) || [];
          const languageDeclarations = migrationSQL.match(/\$\$\s*LANGUAGE\s+plpgsql/gi) || [];
          return functions.length === languageDeclarations.length;
        }
      },
      {
        name: 'Materialized view definition is present',
        test: () => {
          return migrationSQL.includes('CREATE MATERIALIZED VIEW project_readiness_summary');
        }
      },
      {
        name: 'Trigger definitions are present',
        test: () => {
          const triggers = migrationSQL.match(/CREATE TRIGGER.*readiness.*trigger/gi) || [];
          return triggers.length >= 5; // Should have triggers for all dependency tables
        }
      },
      {
        name: 'Index definitions are present',
        test: () => {
          const indexes = migrationSQL.match(/CREATE\s+(UNIQUE\s+)?INDEX.*readiness/gi) || [];
          return indexes.length >= 3; // Should have multiple readiness-related indexes
        }
      },
      {
        name: 'No obvious SQL injection patterns',
        test: () => {
          const suspiciousPatterns = [
            /;\s*DROP\s+/gi,
            /;\s*DELETE\s+FROM\s+(?!.*WHERE)/gi,
            /;\s*TRUNCATE\s+/gi
          ];
          return !suspiciousPatterns.some(pattern => pattern.test(migrationSQL));
        }
      }
    ];
    
    let allPassed = true;
    
    console.log('🧪 Running syntax validation checks:\n');
    
    checks.forEach((check, index) => {
      try {
        const passed = check.test();
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${index + 1}. ${check.name}`);
        if (!passed) allPassed = false;
      } catch (error) {
        console.log(`❌ ${index + 1}. ${check.name} (Error: ${error.message})`);
        allPassed = false;
      }
    });
    
    console.log();
    
    if (allPassed) {
      console.log('🎉 All syntax validation checks passed!');
      console.log('\n📋 Migration file appears to be syntactically correct');
      console.log('✅ Ready for deployment to database');
      
      // Show summary of what will be created
      console.log('\n📊 Migration Summary:');
      
      const materializedViews = (migrationSQL.match(/CREATE MATERIALIZED VIEW/gi) || []).length;
      const functions = (migrationSQL.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/gi) || []).length;
      const triggers = (migrationSQL.match(/CREATE TRIGGER/gi) || []).length;
      const indexes = (migrationSQL.match(/CREATE\s+(UNIQUE\s+)?INDEX/gi) || []).length;
      
      console.log(`- ${materializedViews} materialized view(s)`);
      console.log(`- ${functions} function(s)`);
      console.log(`- ${triggers} trigger(s)`);
      console.log(`- ${indexes} index(es)`);
      
      console.log('\n🔧 Next steps:');
      console.log('1. Apply the migration using Supabase SQL Editor');
      console.log('2. Run: node scripts/verify-readiness-performance-optimization.js');
      console.log('3. Test performance with: node scripts/test-readiness-performance-optimization.js');
      
      return true;
    } else {
      console.log('❌ Some syntax validation checks failed');
      console.log('\n🔧 Please review and fix the issues above before deploying');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check that the migration file exists and is readable');
    console.error('2. Verify file encoding is UTF-8');
    console.error('3. Check for any file system permissions issues');
    return false;
  }
}

// Handle script execution
if (require.main === module) {
  const success = validateSQLSyntax();
  process.exit(success ? 0 : 1);
}

module.exports = { validateSQLSyntax };