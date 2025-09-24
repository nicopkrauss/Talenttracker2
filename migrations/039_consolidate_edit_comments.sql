-- Migration: Consolidate edit comments fields
-- Move all admin_edit_reason data to edit_comments and prepare to drop admin_edit_reason

-- First, copy admin_edit_reason to edit_comments where edit_comments is null
UPDATE timecards 
SET edit_comments = admin_edit_reason,
    updated_at = NOW()
WHERE admin_edit_reason IS NOT NULL 
  AND (edit_comments IS NULL OR edit_comments = '');

-- Verify the migration worked
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM timecards 
    WHERE admin_edit_reason IS NOT NULL 
      AND (edit_comments IS NULL OR edit_comments = '');
    
    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % records still have admin_edit_reason without edit_comments', orphaned_count;
    END IF;
    
    RAISE NOTICE 'Migration successful: All admin_edit_reason data consolidated into edit_comments';
END $$;

-- Add comment for documentation
COMMENT ON COLUMN timecards.edit_comments IS 'Consolidated field for all edit reasons (user and admin edits)';
COMMENT ON COLUMN timecards.admin_edit_reason IS 'DEPRECATED: Use edit_comments instead. Will be removed in future migration.';