CREATE INDEX IF NOT EXISTS idx_project_setup_checklist_project_id ON project_setup_checklist(project_id);
CREATE INDEX IF NOT EXISTS idx_project_setup_checklist_completed ON project_setup_checklist(roles_and_pay_completed, talent_roster_completed, team_assignments_completed, locations_completed);
CREATE INDEX IF NOT EXISTS idx_project_locations_project_id ON project_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_locations_project_default ON project_locations(project_id, is_default);
CREATE INDEX IF NOT EXISTS idx_project_locations_sort_order ON project_locations(project_id, sort_order);