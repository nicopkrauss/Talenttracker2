-- Migration: Drop admin_edit_reason column
-- This should be run AFTER consolidation is complete and tested

-- Verify all data has been consolidated before dropping
DO $$
DECLARE
    orphaned_count INTEGER;
    total_admin_edits INTEGER;
    consolidated_count INTEGER;
BEGIN
    -- Check for any admin_edit_reason data that hasn't been consolidated
    SELECT COUNT(*) INTO orphaned_count
    FROM timecards 
    WHERE admin_edit_reason IS NOT NULL 
      AND (edit_comments IS NULL OR edit_comments = '');
    
    -- Get total admin edits for verification
    SELECT COUNT(*) INTO total_admin_edits
    FROM timecards 
    WHERE admin_edit_reason IS NOT NULL;
    
    -- Get consolidated count
    SELECT COUNT(*) INTO consolidated_count
    FROM timecards 
    WHERE admin_edit_reason IS NOT NULL 
      AND edit_comments IS NOT NULL 
      AND edit_comments != '';
    
    RAISE NOTICE 'Pre-drop verification:';
    RAISE NOTICE '  Total records with admin_edit_reason: %', total_admin_edits;
    RAISE NOTICE '  Records with consolidated edit_comments: %', consolidated_count;
    RAISE NOTICE '  Records still needing consolidation: %', orphaned_count;
    
    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Cannot drop admin_edit_reason: % records still have admin_edit_reason without edit_comments. Run consolidation migration first.', orphaned_count;
    END IF;
    
    IF total_admin_edits > 0 AND consolidated_count = 0 THEN
        RAISE EXCEPTION 'Cannot drop admin_edit_reason: No consolidated data found but % admin edits exist. Run consolidation migration first.', total_admin_edits;
    END IF;
    
    RAISE NOTICE 'Verification passed: Safe to drop admin_edit_reason column';
END $$;

-- Drop the deprecated column
ALTER TABLE timecards DROP COLUMN IF EXISTS admin_edit_reason;

-- Update comments
COMMENT ON COLUMN timecards.edit_comments IS 'Consolidated field for all edit reasons (user and admin edits)';

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully dropped admin_edit_reason column';
    RAISE NOTICE 'All edit comments now use the edit_comments field';
END $$;