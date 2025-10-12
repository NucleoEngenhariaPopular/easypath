import type { Node, Edge } from '@xyflow/react';
import type { CustomNodeData } from '../types/canvasTypes';
import dagre from 'dagre';

/**
 * Auto-layout nodes using Dagre graph layout library
 * Handles complex flows with cycles, branches, and loop-backs
 * Falls back to simple hierarchical layout if Dagre fails
 */
export function autoLayoutNodes(
  nodes: Node<CustomNodeData>[],
  edges: Edge[]
): Node<CustomNodeData>[] {
  if (nodes.length === 0) return nodes;

  try {
    // Create a new directed graph
    const g = new dagre.graphlib.Graph({ compound: false, multigraph: false });

    // Set graph layout options - use undefined acyclicer to skip cycle detection
    // We'll handle cycles ourselves by treating them as part of the normal graph
    g.setGraph({
      rankdir: 'TB', // Top to bottom layout
      align: 'UL', // Align nodes to upper-left
      nodesep: 150, // Horizontal spacing between nodes in same rank (increased from 100)
      edgesep: 80, // Spacing between edges (increased from 50)
      ranksep: 250, // Vertical spacing between ranks (increased from 180)
      marginx: 100,
      marginy: 100,
      ranker: 'network-simplex', // Better ranking algorithm
    });

    // Default to graph edges unless specified
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to graph with their dimensions
    nodes.forEach(node => {
      // Estimate node dimensions based on type
      let width = 180;
      let height = 60;

      // Adjust dimensions for different node types
      if (node.type === 'start' || node.type === 'end') {
        width = 140;
        height = 50;
      } else if (node.type === 'extraction') {
        width = 200;
        height = 70;
      }

      g.setNode(node.id, { width, height });
    });

    // Separate forward edges from backward edges
    const forwardEdges: Edge[] = [];
    const backwardEdges: Edge[] = [];

    edges.forEach(edge => {
      const isLoopBack = edge.data?.else_option ||
                         edge.label?.toString().toLowerCase().includes('missing');

      if (isLoopBack) {
        backwardEdges.push(edge);
      } else {
        forwardEdges.push(edge);
      }
    });

    // Add only forward edges to dagre (to avoid cycle issues)
    forwardEdges.forEach(edge => {
      g.setEdge(edge.source, edge.target, {
        minlen: 1,
        weight: 1,
      });
    });

    // Run the layout algorithm
    dagre.layout(g);

    // Get the positioned nodes from Dagre
    const positionedNodes = nodes.map(node => {
      const nodeWithPosition = g.node(node.id);

      return {
        ...node,
        position: {
          // Dagre centers nodes, ReactFlow uses top-left corner
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });

    console.log('Dagre layout applied successfully:', {
      nodeCount: positionedNodes.length,
      forwardEdges: forwardEdges.length,
      backwardEdges: backwardEdges.length,
      graphWidth: g.graph().width,
      graphHeight: g.graph().height,
    });

    return positionedNodes;

  } catch (error) {
    console.warn('Dagre layout failed, falling back to simple hierarchical layout:', error);
    return simpleHierarchicalLayout(nodes, edges);
  }
}

/**
 * Simple hierarchical layout as fallback
 * Uses BFS to assign levels and positions nodes accordingly
 */
function simpleHierarchicalLayout(
  nodes: Node<CustomNodeData>[],
  edges: Edge[]
): Node<CustomNodeData>[] {
  if (nodes.length === 0) return nodes;

  // Build adjacency list for graph traversal (forward edges only)
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  nodes.forEach(node => {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build graph (skip backward/loop edges)
  edges.forEach(edge => {
    const isLoopBack = edge.data?.else_option ||
                       edge.label?.toString().toLowerCase().includes('missing');

    if (!isLoopBack) {
      const sources = adjacencyList.get(edge.source) || [];
      sources.push(edge.target);
      adjacencyList.set(edge.source, sources);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
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
  const queue: Array<{ nodeId: string; level: number }> = startNodes.map(node => ({
    nodeId: node.id,
    level: 0
  }));
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
  const HORIZONTAL_SPACING = 350; // Increased from 300
  const VERTICAL_SPACING = 250; // Increased from 200
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

  console.log('Simple hierarchical layout applied (fallback)');
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
