export interface ModelOptions {
  modelType?: string;
  temperature?: number;
  newTemperature?: number;
  isSMSReturnNode?: boolean;
  skipUserResponse?: boolean;
  disableEndCallTool?: boolean;
  block_interruptions?: boolean;
  disableSilenceRepeat?: boolean;
  conditionOverridesGlobalPathway?: boolean;
}

export interface ExtractVarItem {
  varName: string;
  varType: 'string' | 'boolean' | 'number';
  description: string;
  defaultValue?: any;
}

export interface ConversationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface PathwayExample {
  'Chosen Pathway': string;
  'Conversation History': ConversationHistoryItem[];
}

export interface ExtractVarSettings {
  // Define structure if it can contain data, for now, an empty object or specific fields
  [key: string]: any; // Placeholder
}

export interface CustomNodeData {
  name: string;
  prompt?: string;
  text?: string;
  url?: string;
  method?: string;
  isStart?: boolean;
  modelOptions?: ModelOptions;
  extractVarSettings?: ExtractVarSettings;
  condition?: string;
  extractVars?: ExtractVarItem[];
  pathwayExamples?: PathwayExample[];
  // Allow other properties not strictly defined, as in your original CustomNodeData
  [key: string]: unknown;
}

export interface GlobalCanvasConfig {
  globalPrompt: string;
  roleAndObjective?: string;
  toneAndStyle?: string;
  languageAndFormatRules?: string;
  behaviorAndFallbacks?: string;
  placeholdersAndVariables?: string;

  // You might want to break these down further into structured objects if needed
  // For example:
  // placeholders?: { facilityName?: string; oldAddress?: string; to?: string; };
}
