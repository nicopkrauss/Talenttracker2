-- Grant permissions for global_settings table
-- Migration: 033_grant_global_settings_permissions.sql

-- Grant SELECT and UPDATE permissions to authenticated users
-- (API will handle admin-only authorization)
GRANT SELECT, UPDATE ON global_settings TO authenticated;

-- Also grant to anon role for service role operations
GRANT SELECT, UPDATE ON global_settings TO anon;

-- Grant usage on the sequence if it exists (for any auto-generated fields)
-- Note: global_settings uses UUID, but this is for completeness
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'global_settings_id_seq') THEN
        GRANT USAGE ON SEQUENCE global_settings_id_seq TO authenticated;
        GRANT USAGE ON SEQUENCE global_settings_id_seq TO anon;
    END IF;
END $$;