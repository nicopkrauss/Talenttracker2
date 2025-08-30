INSERT INTO project_setup_checklist (project_id)
SELECT id FROM projects 
WHERE id NOT IN (SELECT project_id FROM project_setup_checklist);