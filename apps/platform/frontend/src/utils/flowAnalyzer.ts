import type { Node, Edge } from '@xyflow/react';
import type { CustomNodeData, VariableInfo } from '../types/canvasTypes';

/**
 * Get all variables defined in the flow
 */
export function getAllFlowVariables(nodes: Node<CustomNodeData>[]): VariableInfo[] {
  const variables: VariableInfo[] = [];

  for (const node of nodes) {
    if (node.data && node.data.extractVars && node.data.extractVars.length > 0) {
      for (const varConfig of node.data.extractVars) {
        variables.push({
          name: varConfig.name,
          type: varConfig.varType,
          description: varConfig.description,
          required: varConfig.required,
          sourceNodeId: node.id,
          sourceNodeName: node.data.name || node.id,
        });
      }
    }
  }

  return variables;
}

/**
 * Find which node defines a specific variable
 */
export function getVariableSourceNode(
  variableName: string,
  nodes: Node<CustomNodeData>[]
): Node<CustomNodeData> | null {
  for (const node of nodes) {
    if (node.data && node.data.extractVars && node.data.extractVars.length > 0) {
      const hasVariable = node.data.extractVars.some(v => v.name === variableName);
      if (hasVariable) {
        return node;
      }
    }
  }
  return null;
}

/**
 * Get all variables that are available at a specific node
 * This uses BFS to traverse from start node to target node,
 * collecting all variables from nodes along possible paths
 */
export function getAvailableVariablesAtNode(
  targetNodeId: string,
  nodes: Node<CustomNodeData>[],
  edges: Edge[]
): VariableInfo[] {
  // Find the start node
  const startNode = nodes.find(n => (n.data && n.data.isStart) || n.type === 'start');
  if (!startNode) {
    console.warn('No start node found in flow');
    return [];
  }

  // If target is the start node, no variables are available yet
  if (targetNodeId === startNode.id) {
    return [];
  }

  // Build adjacency list for efficient traversal
  const adjacencyList = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge.target);
  }

  // BFS to find all paths from start to target
  const visited = new Set<string>();
  const queue: string[] = [startNode.id];
  const reachableNodes = new Set<string>();
  const variablesMap = new Map<string, VariableInfo>();

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    
    // Don't process beyond target node
    if (currentNodeId === targetNodeId) {
      reachableNodes.add(currentNodeId);
      continue;
    }

    if (visited.has(currentNodeId)) {
      continue;
    }

    visited.add(currentNodeId);
    reachableNodes.add(currentNodeId);

    // Add neighbors to queue
    const neighbors = adjacencyList.get(currentNodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  // Now collect variables from all reachable nodes (excluding target)
  for (const nodeId of reachableNodes) {
    if (nodeId === targetNodeId) {
      continue; // Don't include target node's variables
    }

    const node = nodes.find(n => n.id === nodeId);
    if (node && node.data && node.data.extractVars && node.data.extractVars.length > 0) {
      for (const varConfig of node.data.extractVars) {
        // Use map to avoid duplicates (same variable from multiple paths)
        if (!variablesMap.has(varConfig.name)) {
          variablesMap.set(varConfig.name, {
            name: varConfig.name,
            type: varConfig.varType,
            description: varConfig.description,
            required: varConfig.required,
            sourceNodeId: node.id,
            sourceNodeName: node.data.name || node.id,
          });
        }
      }
    }
  }

  return Array.from(variablesMap.values());
}

/**
 * Find all variable references ({{variable_name}}) in text
 */
export function findVariableReferences(text: string): string[] {
  const pattern = /\{\{(\w+)\}\}/g;
  const matches = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

/**
 * Check if a variable reference exists in the flow
 */
export function isVariableDefined(
  variableName: string,
  nodes: Node<CustomNodeData>[]
): boolean {
  return getVariableSourceNode(variableName, nodes) !== null;
}

/**
 * Get undefined variable references in a node's prompts
 */
export function getUndefinedVariableReferences(
  node: Node<CustomNodeData>,
  nodes: Node<CustomNodeData>[],
  edges: Edge[]
): string[] {
  const availableVariables = getAvailableVariablesAtNode(node.id, nodes, edges);
  const availableVarNames = new Set(availableVariables.map(v => v.name));
  const undefinedRefs: string[] = [];

  // Check all text fields in the node
  const textsToCheck: string[] = [];

  if (node.data && node.data.prompt) {
    textsToCheck.push(
      node.data.prompt.context || '',
      node.data.prompt.objective || '',
      node.data.prompt.notes || '',
      node.data.prompt.examples || ''
    );
  }

  if (node.data && node.data.condition) {
    textsToCheck.push(node.data.condition);
  }

  for (const text of textsToCheck) {
    const refs = findVariableReferences(text);
    for (const ref of refs) {
      if (!availableVarNames.has(ref) && !undefinedRefs.includes(ref)) {
        undefinedRefs.push(ref);
      }
    }
  }

  return undefinedRefs;
}

