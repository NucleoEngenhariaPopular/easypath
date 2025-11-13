export type MessagingPlatform = "telegram" | "whatsapp" | string;

export type BotStatus = "active" | "inactive" | "disabled" | string;

export interface BotConfig {
  id: number;
  platform: MessagingPlatform;
  bot_name: string;
  flow_id: number;
  owner_id: string;
  is_active: BotStatus | boolean;
  webhook_url: string | null;
  created_at: string;
  updated_at: string | null;
  is_test_bot?: boolean;
}

export interface BotSummary {
  bot_id: number;
  bot_name?: string;
  total_conversations: number;
  conversations_with_data: number;
  total_variables_collected: number;
  unique_variable_names: string[];
}

export interface BotConversation {
  id: number;
  bot_config_id: number;
  platform_user_id: string;
  platform_user_name: string | null;
  session_id: string;
  last_message_at: string;
  message_count: number;
}

export interface ConversationMessage {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

export interface ConversationVariablesRow {
  conversation_id: number;
  platform_user_id: string;
  platform_user_name?: string;
  variables: Record<string, unknown>;
  last_extracted_at: string;
  bot_id?: number;
  bot_name?: string;
}

