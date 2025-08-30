ALTER TABLE talent_status DROP CONSTRAINT IF EXISTS talent_status_location_id_fkey;
ALTER TABLE talent_status ADD CONSTRAINT talent_status_location_id_fkey 
    FOREIGN KEY (location_id) REFERENCES project_locations(id) ON DELETE SET NULL;