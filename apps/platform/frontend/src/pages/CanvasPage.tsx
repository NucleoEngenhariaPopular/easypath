import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useCallback, useState } from 'react';

import SettingsIcon from '@mui/icons-material/Settings';
import { Box, Fab, Tooltip } from '@mui/material';
import EasyPathAppBar from '../components/AppBar';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import GlobalConfigSidebar, { drawerWidth } from '../components/canvas/GlobalConfigSidebar';
import { nodeTypes, type CustomNodeData } from '../components/canvas/CustomNodes';
import type { GlobalCanvasConfig } from '../types/canvasTypes';
import NodeModal from '../components/canvas/NodeModal';

// Default initial global configuration
const initialGlobalConfig: GlobalCanvasConfig = {
  globalPrompt: 'Default global prompt: Be helpful and concise.',
  // Initialize other global settings here
};

const initialNodes: Node<CustomNodeData>[] = [
  {
    id: 'start-node',
    type: 'start',
    position: { x: 100, y: 100 },
    data: { name: 'Start Node' },
  },
  {
    id: 'end-node',
    type: 'end',
    position: { x: 400, y: 100 },
    data: { name: 'End Node' },
  },
];
const initialEdges: Edge[] = [];

const CanvasPage: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<CustomNodeData> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for Global Config Sidebar
  const [isGlobalConfigSidebarOpen, setIsGlobalConfigSidebarOpen] = useState(false);
  const [globalConfig, setGlobalConfig] = useState<GlobalCanvasConfig>(initialGlobalConfig);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<CustomNodeData>) => {
    setSelectedNode(node);
    setIsModalOpen(true);
  }, []);

  const handleAddNode = (type: string) => {
    const newNode: Node<CustomNodeData> = {
      id: `${Date.now()}`,
      position: { x: Math.random() * 300 + 150, y: Math.random() * 150 + 50 },
      data: { name: `${type.charAt(0).toUpperCase() + type.slice(1)} Node` },
      type: type,
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedNode(null);
  };

  const handleNodeDataChange = (field: keyof CustomNodeData, value: string) => {
    if (selectedNode) {
      const updatedNodeData = { ...selectedNode.data, [field]: value };
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? { ...node, data: updatedNodeData }
            : node
        )
      );
      setSelectedNode((prev) => (prev ? { ...prev, data: updatedNodeData } : null));
    }
  };

  const handleClearIntermediateNodes = () => {
    setNodes((currentNodes) =>
      currentNodes.filter((node) => node.id === 'start-node' || node.id === 'end-node')
    );
    setEdges([]);
    setSelectedNode(null);
    setIsModalOpen(false);
  };

  const handleToggleGlobalConfigSidebar = () => {
    setIsGlobalConfigSidebarOpen(!isGlobalConfigSidebarOpen);
  };

  const handleGlobalConfigChange = (
    fieldName: keyof GlobalCanvasConfig,
    value: string
  ) => {
    setGlobalConfig((prevConfig) => ({
      ...prevConfig,
      [fieldName]: value,
    }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'background.default' }}>
      <EasyPathAppBar appBarHeight="small" /> {/* CanvasPage.tsx already has AppBar */}
      <GlobalConfigSidebar
        open={isGlobalConfigSidebarOpen}
        onClose={() => setIsGlobalConfigSidebarOpen(false)}
        config={globalConfig}
        onConfigChange={handleGlobalConfigChange}
      />
      <Box
        sx={{
          flexGrow: 1,
          position: 'relative',
          // Optional: Add transition for main content when sidebar opens/closes
          transition: (theme) => theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: isGlobalConfigSidebarOpen ? `${drawerWidth}px` : 0,
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background color="#aaa" gap={16} />
          <CanvasToolbar
            onAddNode={handleAddNode}
            onClearIntermediateNodes={handleClearIntermediateNodes}
          />
          <Tooltip title="Global Settings">
            <Fab
              color="secondary"
              size="small"
              sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}
              onClick={handleToggleGlobalConfigSidebar}
            >
              <SettingsIcon />
            </Fab>
          </Tooltip>
        </ReactFlow>
      </Box>

      <NodeModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        selectedNode={selectedNode}
        onNodeDataChange={handleNodeDataChange}
      />
    </Box>
  );
};

export default CanvasPage;
