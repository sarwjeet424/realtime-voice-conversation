-- Add conversation tracking fields to user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN conversation_active BOOLEAN DEFAULT FALSE,
ADD COLUMN conversation_start_time BIGINT;

-- Update existing sessions to have default values
UPDATE user_sessions 
SET conversation_active = FALSE 
WHERE conversation_active IS NULL;
