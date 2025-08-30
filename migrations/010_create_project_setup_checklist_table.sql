CREATE TABLE IF NOT EXISTS project_setup_checklist (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    roles_and_pay_completed BOOLEAN DEFAULT FALSE,
    talent_roster_completed BOOLEAN DEFAULT FALSE,
    team_assignments_completed BOOLEAN DEFAULT FALSE,
    locations_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);