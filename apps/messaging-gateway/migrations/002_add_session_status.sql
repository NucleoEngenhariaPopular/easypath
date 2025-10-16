-- Migration: Add session status tracking
-- Date: 2025-10-16
-- Description: Adds session status field to track active/closed conversations

-- Add status column to platform_conversations
ALTER TABLE platform_conversations
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_platform_conversations_status ON platform_conversations(status);

-- Add comment
COMMENT ON COLUMN platform_conversations.status IS 'Session status: active, closed, archived';

-- Update existing records to be 'active'
UPDATE platform_conversations SET status = 'active' WHERE status IS NULL;
