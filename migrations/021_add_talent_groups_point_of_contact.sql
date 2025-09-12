-- Migration: Add Point of Contact fields to talent_groups table
-- Date: 2025-01-09
-- Description: Add optional point of contact name and phone number fields for talent groups

-- Add point of contact fields to talent_groups table
ALTER TABLE talent_groups 
ADD COLUMN point_of_contact_name VARCHAR(255),
ADD COLUMN point_of_contact_phone VARCHAR(20);

-- Add index for point of contact phone for potential lookups
CREATE INDEX idx_talent_groups_poc_phone ON talent_groups(point_of_contact_phone) WHERE point_of_contact_phone IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN talent_groups.point_of_contact_name IS 'Optional point of contact name for the talent group';
COMMENT ON COLUMN talent_groups.point_of_contact_phone IS 'Optional point of contact phone number for the talent group';