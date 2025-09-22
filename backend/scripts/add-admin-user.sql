-- Add admin user to the database
INSERT INTO user_credentials (email, password, is_active, session_limit, sessions_used, created_at, updated_at)
VALUES (
  'sarwjeetfreelancer@gmail.com',
  'P@ssw0rd',
  true,
  999999, -- Very high session limit for admin
  0,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  is_active = EXCLUDED.is_active,
  session_limit = EXCLUDED.session_limit,
  updated_at = NOW();
