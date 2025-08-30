-- Migration: Add email_notifications table for tracking email delivery
-- This table is separate from the existing 'notifications' table which handles in-app notifications
-- This new table specifically tracks email delivery status for debugging and audit purposes

-- Create email_notifications table (separate from existing notifications table)
CREATE TABLE IF NOT EXISTS email_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'approval', 'rejection', 'welcome', etc.
    channel VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email', 'sms', 'push', etc.
    recipient VARCHAR(255) NOT NULL, -- email address, phone number, etc.
    subject VARCHAR(500),
    content TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient ON email_notifications(recipient);

-- Add RLS (Row Level Security) policies
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own email notifications
CREATE POLICY "Users can view own email notifications" ON email_notifications
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Policy: Only authenticated users can insert email notifications (for system use)
CREATE POLICY "System can insert email notifications" ON email_notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only system can update email notifications
CREATE POLICY "System can update email notifications" ON email_notifications
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Add helpful comments
COMMENT ON TABLE email_notifications IS 'Tracks email notifications sent to users (separate from in-app notifications)';
COMMENT ON COLUMN email_notifications.type IS 'Type of email notification: approval, rejection, welcome, etc.';
COMMENT ON COLUMN email_notifications.channel IS 'Delivery channel: email, sms, push, etc.';
COMMENT ON COLUMN email_notifications.status IS 'Email delivery status: pending, sent, failed, bounced';
COMMENT ON COLUMN email_notifications.error_message IS 'Error details if email notification failed';
COMMENT ON COLUMN email_notifications.recipient IS 'Email address where notification was sent';

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_email_notifications_updated_at
    BEFORE UPDATE ON email_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_email_notifications_updated_at();