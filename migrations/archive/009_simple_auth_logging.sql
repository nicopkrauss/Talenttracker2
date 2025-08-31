-- Simple authentication logging table for internal tool
-- Much simpler than enterprise security monitoring

CREATE TABLE IF NOT EXISTS auth_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login_attempt',
        'login_success', 
        'login_failure',
        'registration',
        'approval'
    )),
    email TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple index for querying recent events
CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_type ON auth_logs(event_type, created_at DESC);

-- RLS - only admins can view logs
ALTER TABLE auth_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view auth logs" ON auth_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'in_house')
        )
    );

-- System can insert logs
CREATE POLICY "System can insert auth logs" ON auth_logs
    FOR INSERT WITH CHECK (true);

-- Function to clean up old logs (keep last 30 days for internal tool)
CREATE OR REPLACE FUNCTION cleanup_old_auth_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM auth_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;