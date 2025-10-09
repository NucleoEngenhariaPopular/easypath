// src/types/canvasTypes.ts
export interface ModelOptions {
  temperature?: number;
  skipUserResponse?: boolean;
}

export interface ExtractVarItem {
  name: string;
  varType: 'string' | 'int' | 'float' | 'boolean' | 'datetime' | 'array' | 'object';
  description: string;
  required: boolean;
}

export interface ConversationHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface PathwayExample {
  'Chosen Pathway': string;
  'Conversation History': ConversationHistoryItem[];
}

export interface PromptData {
  context: string;
  objective: string;
  notes: string;
  examples: string;
  custom_fields?: Record<string, string>;
}

export interface CustomNodeData {
  name: string;
  nodeType?: string;
  prompt?: PromptData;
  text?: string;
  url?: string;
  method?: string;
  isStart?: boolean;
  isGlobal?: boolean;
  nodeDescription?: string;  // For global nodes: when to trigger this node
  autoReturnToPrevious?: boolean;  // For global nodes: auto-return after responding
  modelOptions?: ModelOptions;
  condition?: string;
  loopEnabled?: boolean;
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
