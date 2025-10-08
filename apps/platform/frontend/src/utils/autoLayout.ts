import type { Node, Edge } from '@xyflow/react';
import type { CustomNodeData } from '../types/canvasTypes';

interface NodeLevel {
  nodeId: string;
  level: number;
}

/**
 * Auto-layout nodes in a hierarchical tree structure
 * Arranges nodes based on their connections, placing them in levels
 */
export function autoLayoutNodes(
  nodes: Node<CustomNodeData>[],
  edges: Edge[]
): Node<CustomNodeData>[] {
  if (nodes.length === 0) return nodes;

  // Build adjacency list for graph traversal
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build graph
  edges.forEach(edge => {
    const sources = adjacencyList.get(edge.source) || [];
    sources.push(edge.target);
    adjacencyList.set(edge.source, sources);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Find start nodes (nodes with no incoming edges or marked as start)
  const startNodes = nodes.filter(
    node => node.data.isStart || (inDegree.get(node.id) || 0) === 0
  );

  // If no start nodes found, use first node
  if (startNodes.length === 0) {
    startNodes.push(nodes[0]);
  }

  // BFS to assign levels
  const nodeLevels = new Map<string, number>();
  const queue: NodeLevel[] = startNodes.map(node => ({ nodeId: node.id, level: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    nodeLevels.set(nodeId, level);

    const children = adjacencyList.get(nodeId) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ nodeId: childId, level: level + 1 });
      }
    });
  }

  // Handle unvisited nodes (disconnected components)
  nodes.forEach(node => {
    if (!nodeLevels.has(node.id)) {
      nodeLevels.set(node.id, 0);
    }
  });

  // Group nodes by level
  const levels = new Map<number, string[]>();
  nodeLevels.forEach((level, nodeId) => {
    if (!levels.has(level)) {
      levels.set(level, []);
    }
    levels.get(level)!.push(nodeId);
  });

  // Calculate positions
  const HORIZONTAL_SPACING = 300;
  const VERTICAL_SPACING = 200;
  const START_Y = 100;

  const positionedNodes = nodes.map(node => {
    const level = nodeLevels.get(node.id) || 0;
    const nodesInLevel = levels.get(level) || [];
    const indexInLevel = nodesInLevel.indexOf(node.id);
    const levelWidth = nodesInLevel.length * HORIZONTAL_SPACING;

    // Center the level horizontally
    const startX = -levelWidth / 2 + HORIZONTAL_SPACING / 2;
    const x = startX + indexInLevel * HORIZONTAL_SPACING;
    const y = START_Y + level * VERTICAL_SPACING;

    return {
      ...node,
      position: { x, y },
    };
  });

  return positionedNodes;
}

/**
 * Arrange nodes in a simple grid layout
 * Useful for disconnected nodes or simple layouts
 */
export function gridLayout(nodes: Node<CustomNodeData>[]): Node<CustomNodeData>[] {
  const GRID_SPACING = 250;
  const COLUMNS = 4;

  return nodes.map((node, index) => {
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;

    return {
      ...node,
      position: {
        x: col * GRID_SPACING,
        y: row * GRID_SPACING,
      },
    };
  });
}
