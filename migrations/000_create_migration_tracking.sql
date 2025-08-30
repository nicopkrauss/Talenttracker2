-- Create migration tracking table
-- This should be run before any other migrations to track migration history

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rollback_sql TEXT,
  notes TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON schema_migrations(applied_at);

-- Insert initial migration record
INSERT INTO schema_migrations (migration_name, notes) 
VALUES ('000_create_migration_tracking', 'Initial migration tracking table creation')
ON CONFLICT (migration_name) DO NOTHING;