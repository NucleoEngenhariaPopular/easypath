-- Migration 004: Add extracted_variables table for variable persistence
-- Date: 2025-01-11
-- Description: Store extracted variables from conversations for analytics and data collection

-- Table to store extracted variables per conversation
CREATE TABLE IF NOT EXISTS extracted_variables (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    node_id VARCHAR(255) NOT NULL,
    flow_id INTEGER,
    variable_name VARCHAR(255) NOT NULL,
    variable_value JSONB NOT NULL,
    variable_type VARCHAR(50),
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES platform_conversations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_flow
        FOREIGN KEY (flow_id)
        REFERENCES flows(id)
        ON DELETE SET NULL
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_extracted_vars_conversation
    ON extracted_variables(conversation_id);

CREATE INDEX IF NOT EXISTS idx_extracted_vars_flow
    ON extracted_variables(flow_id);

CREATE INDEX IF NOT EXISTS idx_extracted_vars_name
    ON extracted_variables(variable_name);

CREATE INDEX IF NOT EXISTS idx_extracted_vars_extracted_at
    ON extracted_variables(extracted_at DESC);

-- Composite index for filtering by bot (via conversation -> bot_config)
CREATE INDEX IF NOT EXISTS idx_platform_conversations_bot
    ON platform_conversations(bot_config_id, created_at DESC);

-- Index for searching by platform user
CREATE INDEX IF NOT EXISTS idx_platform_conversations_platform_user
    ON platform_conversations(platform_user_id, bot_config_id);

-- Comments for documentation
COMMENT ON TABLE extracted_variables IS 'Stores variables extracted from user messages during conversations';
COMMENT ON COLUMN extracted_variables.variable_value IS 'JSONB column allows flexible storage of any variable type';
COMMENT ON COLUMN extracted_variables.node_id IS 'References the flow node that extracted this variable';
COMMENT ON COLUMN extracted_variables.flow_id IS 'References the flow that was active when variable was extracted';
