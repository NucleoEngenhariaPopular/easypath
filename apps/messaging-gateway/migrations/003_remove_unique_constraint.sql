-- Migration: Remove UNIQUE constraint from platform_conversations
-- Date: 2025-01-12
-- Description: Removes UNIQUE constraint on (bot_config_id, platform_user_id) to allow session resets

-- Drop the UNIQUE index
DROP INDEX IF EXISTS idx_platform_conversations_bot_user;

-- Recreate as regular INDEX (non-unique)
CREATE INDEX IF NOT EXISTS idx_platform_conversations_bot_user ON platform_conversations(bot_config_id, platform_user_id);

-- Add comment explaining the change
COMMENT ON INDEX idx_platform_conversations_bot_user IS 'Non-unique index for fast lookup - allows multiple conversations per user (e.g., after session reset)';
