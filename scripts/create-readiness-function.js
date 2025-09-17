#!/usr/bin/env node

/**
 * Create the calculate_project_readiness function manually
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createFunction() {
  console.log('🔧 Creating calculate_project_readiness function...\n')

  const functionSQL = `
CREATE OR REPLACE FUNCTION calculate_project_readiness(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
  v_custom_locations INTEGER;
  v_custom_roles INTEGER;
  v_total_staff INTEGER;
  v_supervisor_count INTEGER;
  v_escort_count INTEGER;
  v_coordinator_count INTEGER;
  v_total_talent INTEGER;
  v_locations_status VARCHAR(20);
  v_roles_status VARCHAR(20);
  v_team_status VARCHAR(20);
  v_talent_status VARCHAR(20);
  v_overall_status VARCHAR(20);
  v_locations_finalized BOOLEAN;
  v_roles_finalized BOOLEAN;
  v_team_finalized BOOLEAN;
  v_talent_finalized BOOLEAN;
BEGIN
  -- Calculate location metrics
  SELECT COUNT(*) INTO v_custom_locations
  FROM project_locations 
  WHERE project_id = p_project_id AND is_default = FALSE;
  
  -- Calculate role metrics (custom role templates beyond defaults)
  SELECT COUNT(*) INTO v_custom_roles
  FROM project_role_templates 
  WHERE project_id = p_project_id AND is_default = FALSE;
  
  -- Calculate team metrics
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN role = 'supervisor' THEN 1 END),
    COUNT(CASE WHEN role = 'talent_escort' THEN 1 END),
    COUNT(CASE WHEN role = 'coordinator' THEN 1 END)
  INTO v_total_staff, v_supervisor_count, v_escort_count, v_coordinator_count
  FROM team_assignments 
  WHERE project_id = p_project_id;
  
  -- Calculate talent metrics
  SELECT COUNT(*) INTO v_total_talent
  FROM talent_project_assignments 
  WHERE project_id = p_project_id;
  
  -- Get current finalization status
  SELECT 
    locations_finalized,
    roles_finalized,
    team_finalized,
    talent_finalized
  INTO v_locations_finalized, v_roles_finalized, v_team_finalized, v_talent_finalized
  FROM project_readiness 
  WHERE project_id = p_project_id;
  
  -- Determine status levels
  v_locations_status := CASE 
    WHEN v_locations_finalized THEN 'finalized'
    WHEN v_custom_locations > 0 THEN 'configured'
    ELSE 'default-only'
  END;
  
  v_roles_status := CASE 
    WHEN v_roles_finalized THEN 'finalized'
    WHEN v_custom_roles > 0 THEN 'configured'
    ELSE 'default-only'
  END;
  
  v_team_status := CASE 
    WHEN v_team_finalized THEN 'finalized'
    WHEN v_total_staff > 0 THEN 'partial'
    ELSE 'none'
  END;
  
  v_talent_status := CASE 
    WHEN v_talent_finalized THEN 'finalized'
    WHEN v_total_talent > 0 THEN 'partial'
    ELSE 'none'
  END;
  
  -- Determine overall status
  IF v_total_staff > 0 AND v_total_talent > 0 AND v_escort_count > 0 THEN
    v_overall_status := 'operational';
    IF v_locations_status = 'finalized' AND v_roles_status = 'finalized' AND 
       v_team_status = 'finalized' AND v_talent_status = 'finalized' THEN
      v_overall_status := 'production-ready';
    END IF;
  ELSE
    v_overall_status := 'getting-started';
  END IF;
  
  -- Update the readiness record
  UPDATE project_readiness SET
    custom_location_count = v_custom_locations,
    custom_role_count = v_custom_roles,
    total_staff_assigned = v_total_staff,
    supervisor_count = v_supervisor_count,
    escort_count = v_escort_count,
    coordinator_count = v_coordinator_count,
    total_talent = v_total_talent,
    locations_status = v_locations_status,
    roles_status = v_roles_status,
    team_status = v_team_status,
    talent_status = v_talent_status,
    overall_status = v_overall_status,
    last_updated = NOW(),
    updated_at = NOW()
  WHERE project_id = p_project_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO project_readiness (
      project_id,
      custom_location_count,
      custom_role_count,
      total_staff_assigned,
      supervisor_count,
      escort_count,
      coordinator_count,
      total_talent,
      locations_status,
      roles_status,
      team_status,
      talent_status,
      overall_status
    ) VALUES (
      p_project_id,
      v_custom_locations,
      v_custom_roles,
      v_total_staff,
      v_supervisor_count,
      v_escort_count,
      v_coordinator_count,
      v_total_talent,
      v_locations_status,
      v_roles_status,
      v_team_status,
      v_talent_status,
      v_overall_status
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
  `

  try {
    // Use a direct SQL query since rpc might not work for DDL
    const { error } = await supabase
      .from('_temp_function_creation')
      .select('1')
      .limit(0)

    // Since we can't execute DDL directly, let's try a different approach
    console.log('⚠️  Cannot create function directly via Supabase client')
    console.log('📋 Please execute the following SQL in your Supabase SQL editor:')
    console.log('\n' + '='.repeat(80))
    console.log(functionSQL)
    console.log('='.repeat(80) + '\n')
    
    console.log('✅ Function SQL prepared. Please run it manually in Supabase dashboard.')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the function creation
createFunction()