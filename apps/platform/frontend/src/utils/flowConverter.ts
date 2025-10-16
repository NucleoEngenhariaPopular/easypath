import type { Node, Edge } from '@xyflow/react';
import type { CustomNodeData, GlobalCanvasConfig, ExtractVarItem } from '../types/canvasTypes';
import { autoLayoutNodes } from './autoLayout';

// Engine flow format (from apps/engine)
interface EnginePrompt {
  context: string;
  objective: string;
  notes: string;
  examples: string;
  custom_fields?: Record<string, string>;
}

interface EngineVariableExtraction {
  name: string;
  description: string;
  required: boolean;
  var_type?: string;
}

interface EngineNode {
  id: string;
  node_type: string;
  prompt: EnginePrompt;
  is_start: boolean;
  is_end: boolean;
  use_llm: boolean;
  is_global: boolean;
  node_description?: string;
  auto_return_to_previous?: boolean;
  extract_vars: EngineVariableExtraction[];
  temperature: number;
  skip_user_response: boolean;
  loop_enabled?: boolean;
  overrides_global_pathway?: boolean;
  loop_condition: string;
}

interface EngineConnection {
  id: string;
  label: string;
  description: string;
  else_option: boolean;
  source: string;
  target: string;
}

interface EngineFlow {
  first_node_id: string;
  nodes: EngineNode[];
  connections: EngineConnection[];
  global_objective: string;
  global_tone: string;
  global_language: string;
  global_behaviour: string;
  global_values: string;
}

// Canvas format (current frontend format)
interface CanvasFlow {
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  globalConfig: GlobalCanvasConfig;
}

/**
 * Convert engine flow format to canvas format
 */
export function convertEngineToCanvas(engineFlow: EngineFlow): CanvasFlow {
  // Convert nodes
  const nodes: Node<CustomNodeData>[] = engineFlow.nodes.map((engineNode, index) => {
    // Create display name from engine node
    let displayName = '';

    // For start/end nodes, use simple names
    if (engineNode.is_start) {
      displayName = 'Start';
    } else if (engineNode.is_end) {
      displayName = 'End';
    } else {
      // For other nodes, use objective or context as display name
      if (engineNode.prompt.objective) {
        displayName = engineNode.prompt.objective;
      } else if (engineNode.prompt.context) {
        displayName = engineNode.prompt.context;
      } else {
        displayName = engineNode.id; // Fallback to ID
      }

      // Truncate long names for display
      if (displayName.length > 50) {
        displayName = displayName.substring(0, 47) + '...';
      }
    }

    // Convert extract_vars format
    const extractVars: ExtractVarItem[] = engineNode.extract_vars.map(v => ({
      name: v.name,
      varType: (v.var_type || 'string') as any, // Use var_type from engine, default to string
      description: v.description,
      required: v.required,
    }));

    // Map node_type to canvas type
    // Keep the node_type as-is since we now support: start, end, normal, message, extraction, validation, recommendation, summary, request, global
    let nodeType = engineNode.node_type;

    // Only map 'normal' if it doesn't match any of our known types
    const validTypes = ['start', 'end', 'message', 'extraction', 'validation', 'recommendation', 'summary', 'request', 'global'];
    if (!validTypes.includes(nodeType)) {
      nodeType = 'normal';
    }

    const nodeData: CustomNodeData = {
      name: displayName,
      prompt: {
        context: engineNode.prompt.context || '',
        objective: engineNode.prompt.objective || '',
        notes: engineNode.prompt.notes || '',
        examples: engineNode.prompt.examples || '',
        custom_fields: engineNode.prompt.custom_fields || {},
      },
      isStart: engineNode.is_start,
      isGlobal: engineNode.is_global,
      nodeDescription: engineNode.node_description || '',
      autoReturnToPrevious: engineNode.auto_return_to_previous || false,
      modelOptions: {
        temperature: engineNode.temperature,
        skipUserResponse: engineNode.skip_user_response,
      },
      extractVars: extractVars,
      loopEnabled: engineNode.loop_enabled || false,
      condition: engineNode.loop_condition,
    };

    return {
      id: engineNode.id,
      type: nodeType,
      position: { x: 0, y: 0 }, // Temporary position, will be calculated by auto-layout
      data: nodeData,
    };
  });

  // Convert connections to edges with smart edge type selection
  const edges: Edge[] = engineFlow.connections.map(conn => {
    // Use default (bezier) for loop-back edges (better for cycles)
    const isLoopBack = conn.else_option ||
                       conn.label?.toLowerCase().includes('missing') ||
                       conn.description?.toLowerCase().includes('missing');

    return {
      id: conn.id,
      source: conn.source,
      target: conn.target,
      label: conn.label,
      data: {
        description: conn.description,
        else_option: conn.else_option
      },
      type: isLoopBack ? 'default' : 'smoothstep', // Use default (bezier) for loops
      style: isLoopBack ? {
        stroke: '#ff9800',
        strokeWidth: 2,
        strokeDasharray: '5,5', // Dashed line for loop-backs
      } : undefined,
    };
  });

  // Convert global config
  const globalConfig: GlobalCanvasConfig = {
    globalPrompt: '', // Not in engine format
    roleAndObjective: engineFlow.global_objective,
    toneAndStyle: engineFlow.global_tone,
    languageAndFormatRules: engineFlow.global_language,
    behaviorAndFallbacks: engineFlow.global_behaviour,
    placeholdersAndVariables: engineFlow.global_values,
  };

  // Apply auto-layout to position nodes intelligently
  const positionedNodes = autoLayoutNodes(nodes, edges);

  console.log('Converted engine flow to canvas format:', {
    nodeCount: positionedNodes.length,
    edgeCount: edges.length,
    nodes: positionedNodes.map(n => ({ id: n.id, type: n.type, name: n.data.name, position: n.position })),
  });

  return {
    nodes: positionedNodes,
    edges,
    globalConfig,
  };
}

/**
 * Detect if imported JSON is in engine format or canvas format
 */
export function isEngineFormat(data: any): data is EngineFlow {
  return (
    data.nodes &&
    data.connections &&
    data.first_node_id !== undefined &&
    data.global_objective !== undefined
  );
}

/**
 * Detect if imported JSON is in canvas format
 */
export function isCanvasFormat(data: any): data is CanvasFlow {
  return (
    data.nodes &&
    data.edges !== undefined &&
    data.globalConfig !== undefined
  );
}

/**
 * Convert canvas flow format to engine format
 * This is used when sending flows to the engine for execution
 */
export function convertCanvasToEngine(canvasFlow: CanvasFlow): EngineFlow {
  // Find the start node
  const startNode = canvasFlow.nodes.find(n => n.data.isStart);
  const firstNodeId = startNode?.id || (canvasFlow.nodes.length > 0 ? canvasFlow.nodes[0].id : '');

  // Convert nodes
  const engineNodes: EngineNode[] = canvasFlow.nodes.map(node => {
    const data = node.data;

    // Convert extract_vars format
    const extractVars: EngineVariableExtraction[] = (data.extractVars || []).map(v => ({
      name: v.name,
      description: v.description,
      required: v.required,
      var_type: v.varType,
    }));

    // Determine if it's an end node based on type or data
    const isEnd = node.type === 'end' || data.name === 'End';

    return {
      id: node.id,
      node_type: node.type || 'normal',
      prompt: {
        context: data.prompt?.context || '',
        objective: data.prompt?.objective || '',
        notes: data.prompt?.notes || '',
        examples: data.prompt?.examples || '',
        custom_fields: data.prompt?.custom_fields || {},
      },
      is_start: data.isStart || false,
      is_end: isEnd,
      use_llm: node.type !== 'start' && node.type !== 'end', // Start/End nodes don't use LLM
      is_global: data.isGlobal || false,
      node_description: data.nodeDescription || '',
      auto_return_to_previous: data.autoReturnToPrevious || false,
      extract_vars: extractVars,
      temperature: data.modelOptions?.temperature || 0.2,
      skip_user_response: data.modelOptions?.skipUserResponse || false,
      loop_enabled: data.loopEnabled || false,
      overrides_global_pathway: false, // Not used in current canvas
      loop_condition: data.condition || '',
    };
  });

  // Convert edges to connections
  const engineConnections: EngineConnection[] = canvasFlow.edges.map(edge => ({
    id: edge.id,
    label: edge.label || '',
    description: edge.data?.description || '',
    else_option: edge.data?.else_option || false,
    source: edge.source,
    target: edge.target,
  }));

  // Convert global config
  const engineFlow: EngineFlow = {
    first_node_id: firstNodeId,
    nodes: engineNodes,
    connections: engineConnections,
    global_objective: canvasFlow.globalConfig?.roleAndObjective || '',
    global_tone: canvasFlow.globalConfig?.toneAndStyle || '',
    global_language: canvasFlow.globalConfig?.languageAndFormatRules || '',
    global_behaviour: canvasFlow.globalConfig?.behaviorAndFallbacks || '',
    global_values: canvasFlow.globalConfig?.placeholdersAndVariables || '',
  };

  return engineFlow;
}
