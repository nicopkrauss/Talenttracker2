-- Add color field to project_locations table
ALTER TABLE project_locations 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(3);

-- Update existing default locations with colors and abbreviations
UPDATE project_locations 
SET 
  color = CASE 
    WHEN name = 'House' THEN '#10b981'
    WHEN name = 'Holding' THEN '#f59e0b'
    WHEN name = 'Stage' THEN '#ef4444'
    ELSE '#3b82f6'
  END,
  abbreviation = CASE 
    WHEN name = 'House' THEN 'H'
    WHEN name = 'Holding' THEN 'HD'
    WHEN name = 'Stage' THEN 'ST'
    ELSE UPPER(LEFT(name, 2))
  END
WHERE color IS NULL OR abbreviation IS NULL;