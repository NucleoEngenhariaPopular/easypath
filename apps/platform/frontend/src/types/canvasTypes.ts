// src/types/canvasTypes.ts
export interface ModelOptions {
  modelType?: string;
  temperature?: number;
  skipUserResponse?: boolean;
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

export interface CustomNodeData {
  name: string;
  prompt?: string;
  text?: string;
  url?: string;
  method?: string;
  isStart?: boolean;
  modelOptions?: ModelOptions;
  // removed: extractVarSettings?: ExtractVarSettings;
  condition?: string;
  extractVars?: ExtractVarItem[];
  pathwayExamples?: PathwayExample[];
  [key: string]: unknown;
}

export interface GlobalCanvasConfig {
  globalPrompt: string;
  roleAndObjective?: string;
  toneAndStyle?: string;
  languageAndFormatRules?: string;
  behaviorAndFallbacks?: string;
  placeholdersAndVariables?: string;
}
