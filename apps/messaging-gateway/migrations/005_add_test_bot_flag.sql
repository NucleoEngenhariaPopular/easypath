-- Migration 005: Add test bot support
-- This enables test personas to use the same bot infrastructure with a flag for separation

-- Add is_test_bot flag to bot_configs
ALTER TABLE bot_configs
ADD COLUMN IF NOT EXISTS is_test_bot BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for efficient filtering of test vs production bots
CREATE INDEX IF NOT EXISTS idx_bot_configs_is_test_bot
ON bot_configs(is_test_bot);

-- Add comment for documentation
COMMENT ON COLUMN bot_configs.is_test_bot IS
'Flag to identify test personas (created via Test Mode) vs real production bots';
