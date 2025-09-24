-- Migration: Improve timecard edit tracking
-- Separate admin edits from user edits for better audit trail

-- Add new columns for better edit tracking
ALTER TABLE timecards 
ADD COLUMN IF NOT EXISTS admin_edited BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_edit_reason TEXT,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS edit_type VARCHAR(20) CHECK (edit_type IN ('user_correction', 'admin_adjustment', 'system_correction'));

-- Update existing data: if manually_edited is true and there are edit_comments, assume it was admin edited
UPDATE timecards 
SET admin_edited = TRUE,
    admin_edit_reason = edit_comments,
    edit_type = 'admin_adjustment'
WHERE manually_edited = TRUE AND edit_comments IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_timecards_admin_edited ON timecards(admin_edited);
CREATE INDEX IF NOT EXISTS idx_timecards_last_edited_by ON timecards(last_edited_by);
CREATE INDEX IF NOT EXISTS idx_timecards_edit_type ON timecards(edit_type);

-- Add comments for documentation
COMMENT ON COLUMN timecards.admin_edited IS 'True if timecard was edited by admin/supervisor';
COMMENT ON COLUMN timecards.admin_edit_reason IS 'Reason provided by admin for the edit';
COMMENT ON COLUMN timecards.last_edited_by IS 'User ID of person who last edited this timecard';
COMMENT ON COLUMN timecards.edit_type IS 'Type of edit: user_correction, admin_adjustment, or system_correction';