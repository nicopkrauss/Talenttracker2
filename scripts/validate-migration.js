#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function validateMigration() {
  console.log('🔍 Validating migration SQL...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '006_create_location_tracking_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('✅ Migration file readable');
    
    // Basic SQL syntax checks
    const checks = [
      {
        name: 'Has BEGIN/COMMIT transaction',
        test: () => migrationSQL.includes('BEGIN;') && migrationSQL.includes('COMMIT;')
      },
      {
        name: 'Uses IF NOT EXISTS for safety',
        test: () => migrationSQL.includes('IF NOT EXISTS')
      },
      {
        name: 'References existing talent_locations table',
        test: () => migrationSQL.includes('ALTER TABLE talent_locations')
      },
      {
        name: 'References existing talent_status table', 
        test: () => migrationSQL.includes('ALTER TABLE talent_status')
      },
      {
        name: 'Creates talent_location_updates table',
        test: () => migrationSQL.includes('CREATE TABLE IF NOT EXISTS talent_location_updates')
      },
      {
        name: 'Has proper foreign key references',
        test: () => migrationSQL.includes('REFERENCES talent(id)') && 
                   migrationSQL.includes('REFERENCES projects(id)') &&
                   migrationSQL.includes('REFERENCES profiles(id)')
      },
      {
        name: 'Creates indexes for performance',
        test: () => migrationSQL.includes('CREATE INDEX IF NOT EXISTS')
      },
      {
        name: 'Has RLS policies (optional)',
        test: () => migrationSQL.includes('CREATE POLICY') || migrationSQL.includes('RLS removed')
      },
      {
        name: 'Records migration in schema_migrations',
        test: () => migrationSQL.includes('INSERT INTO schema_migrations')
      }
    ];
    
    let passed = 0;
    let failed = 0;
    
    checks.forEach(check => {
      if (check.test()) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}`);
        failed++;
      }
    });
    
    console.log(`\n📊 Validation Summary: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('🎉 Migration validation passed! Ready to apply to database.');
    } else {
      console.log('⚠️  Migration has issues that should be addressed.');
    }
    
    // Check for potential issues
    console.log('\n🔍 Checking for potential issues...');
    
    const issues = [];
    
    // Check for table name consistency
    if (migrationSQL.includes('project_locations')) {
      issues.push('References non-existent project_locations table (should be talent_locations)');
    }
    
    if (migrationSQL.includes('talent_current_status')) {
      issues.push('References non-existent talent_current_status table (should be talent_status)');
    }
    
    // Check for proper column additions
    if (!migrationSQL.includes('ADD COLUMN IF NOT EXISTS')) {
      issues.push('Should use ADD COLUMN IF NOT EXISTS for safety');
    }
    
    if (issues.length === 0) {
      console.log('✅ No issues found');
    } else {
      issues.forEach(issue => console.log(`⚠️  ${issue}`));
    }
    
  } catch (error) {
    console.log('❌ Validation failed:', error.message);
  }
}

validateMigration();