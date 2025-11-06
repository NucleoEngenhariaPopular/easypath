-- Migration: Create bot configuration and conversation tracking tables
-- Date: 2025-01-12
-- Description: Adds tables for messaging platform bot configurations (Telegram, WhatsApp) and conversation history

-- Create enum types
DO $$ BEGIN
    CREATE TYPE messagingplatform AS ENUM ('TELEGRAM', 'WHATSAPP', 'SMS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE botstatus AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE platformconversationstatus AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE conversationmessageroles AS ENUM ('USER', 'ASSISTANT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Bot configurations table
CREATE TABLE IF NOT EXISTS bot_configs (
    id SERIAL PRIMARY KEY,
    platform messagingplatform NOT NULL,
    bot_name VARCHAR(255),
    bot_token_encrypted TEXT NOT NULL,  -- Encrypted bot token/credentials
    flow_id INTEGER NOT NULL,  -- References flows.id
    owner_id VARCHAR(255) NOT NULL,  -- References users.id
    is_active botstatus DEFAULT 'ACTIVE',
    webhook_url VARCHAR(512),
    webhook_secret VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_flow FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
    CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bot_configs_owner ON bot_configs(owner_id);
CREATE INDEX IF NOT EXISTS idx_bot_configs_platform ON bot_configs(platform);
CREATE INDEX IF NOT EXISTS idx_bot_configs_active ON bot_configs(is_active);

-- Platform conversations table
CREATE TABLE IF NOT EXISTS platform_conversations (
    id SERIAL PRIMARY KEY,
    bot_config_id INTEGER NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,  -- Telegram user ID, WhatsApp number, etc.
    platform_user_name VARCHAR(255),
    session_id VARCHAR(255) NOT NULL UNIQUE,  -- EasyPath engine session ID
    status platformconversationstatus DEFAULT 'ACTIVE',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bot_config FOREIGN KEY (bot_config_id) REFERENCES bot_configs(id) ON DELETE CASCADE
);

-- Indexes for fast conversation lookups
CREATE INDEX IF NOT EXISTS idx_platform_conversations_bot ON platform_conversations(bot_config_id);
CREATE INDEX IF NOT EXISTS idx_platform_conversations_user ON platform_conversations(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_conversations_session ON platform_conversations(session_id);
-- Changed from UNIQUE to regular INDEX - allows multiple conversations per user (e.g., after session reset)
CREATE INDEX IF NOT EXISTS idx_platform_conversations_bot_user ON platform_conversations(bot_config_id, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_conversations_status ON platform_conversations(status);

-- Conversation messages table (for history/debugging)
CREATE TABLE IF NOT EXISTS conversation_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    role conversationmessageroles NOT NULL,
    content TEXT NOT NULL,
    platform_message_id VARCHAR(255),  -- Original platform message ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES platform_conversations(id) ON DELETE CASCADE
);

-- Index for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created ON conversation_messages(created_at DESC);

-- Trigger to update updated_at on bot_configs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bot_configs_updated_at
    BEFORE UPDATE ON bot_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE bot_configs IS 'Configuration for messaging platform bots (Telegram, WhatsApp, etc.)';
COMMENT ON TABLE platform_conversations IS 'Tracks conversations between platform users and bots';
COMMENT ON TABLE conversation_messages IS 'Individual messages in conversations for history and debugging';
COMMENT ON COLUMN bot_configs.bot_token_encrypted IS 'Encrypted bot token using Fernet encryption';
COMMENT ON COLUMN platform_conversations.session_id IS 'Maps to EasyPath engine session for flow execution';
