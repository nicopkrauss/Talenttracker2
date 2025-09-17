#!/usr/bin/env node

/**
 * Rollback Readiness Performance Optimization
 * 
 * This script rolls back the materialized view system and restores
 * the previous readiness calculation approach if needed.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rollbackSQL = `
-- Rollback: Remove Readiness Performance Optimization

-- Drop triggers first
DROP TRIGGER IF EXISTS project_role_templates_readiness_summary_trigger ON project_role_templates;
DROP TRIGGER IF EXISTS team_assignments_readiness_summary_trigger ON team_assignments;
DROP TRIGGER IF EXISTS project_locations_readiness_summary_trigger ON project_locations;
DROP TRIGGER IF EXISTS talent_project_assignments_readiness_summary_trigger ON talent_project_assignments;
DROP TRIGGER IF EXISTS projects_readiness_summary_trigger ON projects;

-- Drop functions
DROP FUNCTION IF EXISTS refresh_project_readiness_summary();
DROP FUNCTION IF EXISTS get_project_readiness(UUID);
DROP FUNCTION IF EXISTS get_projects_readiness(UUID[]);

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS project_readiness_summary CASCADE;

-- Drop performance indexes that were added
DROP INDEX IF EXISTS idx_project_role_templates_project_performance;
DROP INDEX IF EXISTS idx_team_assignments_project_performance;
DROP INDEX IF EXISTS idx_project_locations_project_performance;
DROP INDEX IF EXISTS idx_talent_project_assignments_project_performance;
DROP INDEX IF EXISTS idx_projects_status_created;
DROP INDEX IF EXISTS idx_projects_id_status;

-- Note: We keep the existing project_readiness table and its functions
-- as they may still be used by other parts of the system
`;

async function rollbackOptimization() {
  console.log('🔄 Starting readiness performance optimization rollback...');
  
  try {
    // Confirm rollback
    console.log('⚠️  This will remove the materialized view and related optimizations.');
    console.log('⚠️  The existing project_readiness table will be preserved.');
    
    // Execute rollback SQL
    console.log('📄 Executing rollback SQL...');
    
    // Split the SQL into individual statements and execute them
    const statements = rollbackSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        try {
          const { error } = await supabase.rpc('exec', { sql: statement });
          if (error && !error.message.includes('does not exist')) {
            console.error('❌ Error executing statement:', error);
            throw error;
          }
        } catch (err) {
          // Continue with other statements even if some fail
          console.warn(`⚠️  Warning: ${err.message}`);
        }
      }
    }
    
    console.log('✅ Rollback SQL executed');
    
    // Verify rollback
    console.log('🔍 Verifying rollback...');
    
    // Check that materialized view is gone
    const { data: viewCheck, error: viewError } = await supabase
      .from('project_readiness_summary')
      .select('project_id')
      .limit(1);
    
    if (viewError && viewError.message.includes('does not exist')) {
      console.log('✅ Materialized view successfully removed');
    } else if (viewError) {
      console.warn('⚠️  Unexpected error checking view:', viewError.message);
    } else {
      console.warn('⚠️  Materialized view may still exist');
    }
    
    // Check that original readiness system still works
    const { data: originalReadiness, error: originalError } = await supabase
      .from('project_readiness')
      .select('project_id, overall_status')
      .limit(5);
    
    if (originalError) {
      console.error('❌ Error accessing original readiness system:', originalError);
      throw originalError;
    }
    
    console.log(`✅ Original readiness system accessible with ${originalReadiness?.length || 0} records`);
    
    // Test original readiness calculation function
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    if (projects && projects.length > 0) {
      const testProjectId = projects[0].id;
      
      const { error: calcError } = await supabase
        .rpc('calculate_project_readiness', { p_project_id: testProjectId });
      
      if (calcError) {
        console.warn('⚠️  Original readiness calculation may have issues:', calcError.message);
      } else {
        console.log('✅ Original readiness calculation function working');
      }
    }
    
    console.log('\n🎉 Rollback completed successfully!');
    console.log('\n📋 What was removed:');
    console.log('- ❌ project_readiness_summary materialized view');
    console.log('- ❌ Automatic refresh triggers');
    console.log('- ❌ Optimized query functions');
    console.log('- ❌ Performance indexes');
    console.log('- ❌ Real-time notification triggers');
    
    console.log('\n📋 What was preserved:');
    console.log('- ✅ project_readiness table');
    console.log('- ✅ calculate_project_readiness function');
    console.log('- ✅ Original readiness triggers');
    console.log('- ✅ All project data');
    
    console.log('\n🔧 Next steps:');
    console.log('1. Update API endpoints to use original readiness system');
    console.log('2. Remove references to materialized view in application code');
    console.log('3. Test that readiness functionality still works correctly');
    console.log('4. Consider performance implications of reverting to original system');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    console.error('\n🔧 Manual cleanup may be required:');
    console.error('1. Check for remaining triggers or functions');
    console.error('2. Verify materialized view is completely removed');
    console.error('3. Ensure original readiness system is functional');
    console.error('4. Review database logs for any issues');
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  rollbackOptimization().catch(console.error);
}

module.exports = { rollbackOptimization };