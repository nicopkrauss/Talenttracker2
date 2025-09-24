-- Migration: Rename supervisor_comments to edit_comments
-- This makes the field name more neutral and accurate since any authorized user can edit timecards

-- Rename the column
ALTER TABLE timecards RENAME COLUMN supervisor_comments TO edit_comments;

-- Update any existing comments to reflect the new naming
COMMENT ON COLUMN timecards.edit_comments IS 'Comments added when timecard is edited by authorized personnel';