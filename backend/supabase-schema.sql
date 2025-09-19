-- Supabase Schema for Voice Assistant Monthly Usage System
-- Run this in your Supabase SQL editor

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocked Users Table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Usage Table
CREATE TABLE IF NOT EXISTS monthly_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  session_count INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email, month)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON user_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_blocked_users_email ON blocked_users(email);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_until ON blocked_users(blocked_until);

CREATE INDEX IF NOT EXISTS idx_monthly_usage_email ON monthly_usage(email);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_month ON monthly_usage(month);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_email_month ON monthly_usage(email, month);

-- Row Level Security Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on user_sessions" ON user_sessions
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on blocked_users" ON blocked_users
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on monthly_usage" ON monthly_usage
  FOR ALL USING (true);

-- Functions for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_sessions 
  SET is_active = false 
  WHERE start_time < NOW() - INTERVAL '5 minutes' 
  AND is_active = true;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_blocks()
RETURNS void AS $$
BEGIN
  DELETE FROM blocked_users 
  WHERE blocked_until < NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_monthly_usage()
RETURNS void AS $$
BEGIN
  DELETE FROM monthly_usage 
  WHERE month < TO_CHAR(NOW() - INTERVAL '3 months', 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- Create a function to get current month
CREATE OR REPLACE FUNCTION get_current_month()
RETURNS VARCHAR(7) AS $$
BEGIN
  RETURN TO_CHAR(NOW(), 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- Create a function to get next month
CREATE OR REPLACE FUNCTION get_next_month()
RETURNS VARCHAR(7) AS $$
BEGIN
  RETURN TO_CHAR(NOW() + INTERVAL '1 month', 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- Insert admin user with unlimited access (optional)
INSERT INTO monthly_usage (email, month, session_count, total_messages, last_used)
VALUES ('sarwjeetfreelancer@gmail.com', get_current_month(), 0, 0, NOW())
ON CONFLICT (email, month) DO NOTHING;

-- Create views for easy monitoring
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  email,
  start_time,
  last_activity,
  message_count,
  EXTRACT(EPOCH FROM (NOW() - start_time)) as session_duration_seconds
FROM user_sessions 
WHERE is_active = true;

CREATE OR REPLACE VIEW current_month_usage AS
SELECT 
  email,
  session_count,
  total_messages,
  last_used,
  CASE 
    WHEN email = 'sarwjeetfreelancer@gmail.com' THEN 'Admin - No restrictions'
    ELSE '1 session per month (5 minutes, 20 messages)'
  END as restrictions
FROM monthly_usage 
WHERE month = get_current_month();

CREATE OR REPLACE VIEW blocked_users_current AS
SELECT 
  email,
  blocked_until,
  reason,
  EXTRACT(EPOCH FROM (blocked_until - NOW())) as time_remaining_seconds
FROM blocked_users 
WHERE blocked_until > NOW();

-- Grant permissions (adjust as needed)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;