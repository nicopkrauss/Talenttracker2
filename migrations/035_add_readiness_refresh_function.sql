-- Migration: Add Readiness Refresh Function
-- This migration adds a standalone function to refresh the materialized view for API use

-- Create function to manually refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_readiness_materialized_view()
RETURNS VOID AS $
BEGIN
  -- Use concurrent refresh to avoid locking
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_readiness_summary;
END;
$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_readiness_materialized_view() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION refresh_readiness_materialized_view() IS 'Manually refresh the project readiness materialized view for API invalidation requests';