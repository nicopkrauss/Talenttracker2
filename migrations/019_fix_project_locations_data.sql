-- Migration: Fix project locations data
-- Description: Fix sort orders and add abbreviations/colors to existing default locations
-- Date: 2025-08-31

-- First, let's fix the sort orders for the first project (they're all 0)
UPDATE project_locations 
SET sort_order = CASE 
  WHEN name = 'House' THEN 1
  WHEN name = 'Holding' THEN 2  
  WHEN name = 'Stage' THEN 3
  ELSE sort_order
END
WHERE project_id = '9e093154-1952-499d-a033-19e3718b1b63' 
  AND is_default = true;

-- Now add abbreviations and colors to all existing default locations
UPDATE project_locations 
SET 
  abbreviation = CASE 
    WHEN name = 'House' THEN 'HOU'
    WHEN name = 'Holding' THEN 'HLD'
    WHEN name = 'Stage' THEN 'STG'
    ELSE abbreviation
  END,
  color = CASE 
    WHEN name = 'House' THEN '#10b981'     -- Green (emerald-500)
    WHEN name = 'Holding' THEN '#f59e0b'   -- Amber (amber-500) 
    WHEN name = 'Stage' THEN '#ef4444'     -- Red (red-500)
    ELSE color
  END
WHERE is_default = true 
  AND name IN ('House', 'Holding', 'Stage');