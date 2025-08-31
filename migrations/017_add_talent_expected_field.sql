ALTER TABLE projects ADD COLUMN talent_expected INTEGER;
COMMENT ON COLUMN projects.talent_expected IS 'Expected number of talent for this project';