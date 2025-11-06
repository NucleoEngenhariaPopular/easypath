-- Migration: Add session status tracking
-- Date: 2025-10-16
-- Description: Adds session status field to track active/closed conversations
-- Updated: 2025-11-06 - Convert to use enum type

-- Create enum type if it doesn't exist (in case migration 001 hasn't run)
DO $$ BEGIN
    CREATE TYPE platformconversationstatus AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check if status column exists and what type it is
DO $$
DECLARE
    col_exists boolean;
    col_type text;
    is_enum boolean;
BEGIN
    -- Check if status column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'platform_conversations' 
        AND column_name = 'status'
    ) INTO col_exists;
    
    IF col_exists THEN
        -- Get the column type
        SELECT data_type INTO col_type
        FROM information_schema.columns
        WHERE table_name = 'platform_conversations' 
        AND column_name = 'status';
        
        -- Check if it's already our enum type
        SELECT EXISTS (
            SELECT 1 FROM pg_type t
            JOIN information_schema.columns c ON c.udt_name = t.typname
            WHERE c.table_name = 'platform_conversations'
            AND c.column_name = 'status'
            AND t.typname = 'platformconversationstatus'
        ) INTO is_enum;
        
        -- If it's already an enum type, we're done (migration 001 already handled it)
        IF is_enum THEN
            RETURN;
        END IF;
        
        -- If it's VARCHAR, we need to convert it
        IF col_type = 'character varying' OR col_type = 'varchar' THEN
            -- Add temp column
            ALTER TABLE platform_conversations
            ADD COLUMN IF NOT EXISTS status_temp VARCHAR(20);
            
            -- Copy existing data to temp column (uppercase)
            UPDATE platform_conversations 
            SET status_temp = UPPER(COALESCE(status::text, 'ACTIVE'))
            WHERE status_temp IS NULL;
            
            -- Drop old status column
            ALTER TABLE platform_conversations DROP COLUMN status;
            
            -- Add new status column as enum
            ALTER TABLE platform_conversations
            ADD COLUMN status platformconversationstatus DEFAULT 'ACTIVE';
            
            -- Migrate data from temp column
            UPDATE platform_conversations 
            SET status = CASE 
                WHEN status_temp IN ('ACTIVE', 'active') THEN 'ACTIVE'::platformconversationstatus
                WHEN status_temp IN ('INACTIVE', 'inactive', 'closed') THEN 'INACTIVE'::platformconversationstatus
                WHEN status_temp IN ('ARCHIVED', 'archived') THEN 'ARCHIVED'::platformconversationstatus
                ELSE 'ACTIVE'::platformconversationstatus
            END
            WHERE status_temp IS NOT NULL;
            
            -- Drop temp column
            ALTER TABLE platform_conversations DROP COLUMN status_temp;
        END IF;
    ELSE
        -- Column doesn't exist, add it as enum type
        ALTER TABLE platform_conversations
        ADD COLUMN status platformconversationstatus DEFAULT 'ACTIVE';
    END IF;
END $$;

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_platform_conversations_status ON platform_conversations(status);

-- Add comment
COMMENT ON COLUMN platform_conversations.status IS 'Session status: ACTIVE, INACTIVE, ARCHIVED';
