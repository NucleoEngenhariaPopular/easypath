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
import { Box, Fab, Tooltip, Typography } from '@mui/material';
import EasyPathAppBar from '../components/AppBar';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import GlobalConfigSidebar, { drawerWidth } from '../components/canvas/GlobalConfigSidebar';
import { nodeTypes } from '../components/canvas/CustomNodes';
import type { GlobalCanvasConfig, CustomNodeData, ModelOptions, ExtractVarItem } from '../types/canvasTypes';
import NodeModal from '../components/canvas/NodeModal';
import { useTranslation } from 'react-i18next';

const initialGlobalConfig: GlobalCanvasConfig = {
  globalPrompt: 'Default global prompt: Be helpful and concise.',
  roleAndObjective: '',
  toneAndStyle: '',
  languageAndFormatRules: '',
  behaviorAndFallbacks: '',
  placeholdersAndVariables: '',
};

const initialNodes: Node<CustomNodeData>[] = [
  {
    id: 'start-node',
    type: 'start',
    position: { x: 0, y: 0 },
    data: { name: 'Start Node', isStart: true }, // Mark as start
  },
  {
    id: 'end-node',
    type: 'end',
    position: { x: 0, y: 100 },
    data: { name: 'End Node' },
  },
];
const initialEdges: Edge[] = [];

const CanvasPage: React.FC = () => {
  const { t } = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<CustomNodeData> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isGlobalConfigSidebarOpen, setIsGlobalConfigSidebarOpen] = useState(false);
  const [globalConfig, setGlobalConfig] = useState<GlobalCanvasConfig>(initialGlobalConfig);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<CustomNodeData>) => {
    const nodeData = {
      ...node.data,
      modelOptions: node.data.modelOptions || {},
      extractVars: node.data.extractVars || [],
      pathwayExamples: node.data.pathwayExamples || [],
      extractVarSettings: node.data.extractVarSettings || {},
    };
    setSelectedNode({ ...node, data: nodeData });
    setIsModalOpen(true);
  }, []);

  const handleAddNode = (type: string) => {
    const newNodeData: CustomNodeData = {
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
    };
    // Initialize specific fields for new nodes if needed
    if (type === 'normal' || type === 'request' || type === 'EndCall') {
      newNodeData.modelOptions = { modelType: 'smart', temperature: 0.2 }; // Default modelOptions
      newNodeData.prompt = '';
    }
    if (type === 'start') {
      newNodeData.isStart = true;
    }

    const newNode: Node<CustomNodeData> = {
      id: `${type}-${Date.now()}`, // Ensure unique IDs
      position: { x: Math.random() * 300 + 150, y: Math.random() * 150 + 50 },
      data: newNodeData,
      type: type,
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedNode(null);
  };

  const handleNodeDataChange = (
    fieldWithPath: keyof CustomNodeData | `modelOptions.${keyof ModelOptions}` | `extractVars.${number}.${keyof ExtractVarItem}`,
    value: any
  ) => {
    if (selectedNode) {
      let updatedNodeData = { ...selectedNode.data };

      fieldWithPath = fieldWithPath.toString()

      if (fieldWithPath.startsWith('modelOptions.')) {
        const subField = fieldWithPath.split('.')[1] as keyof ModelOptions;
        updatedNodeData.modelOptions = {
          ...(updatedNodeData.modelOptions || {}),
          [subField]: value,
        };
      } else if (fieldWithPath.startsWith('extractVars.')) {
        // Placeholder for more complex array updates needed for extractVars
        // For now, this assumes 'value' is the entire updated array if you implement it
        // Or, if handling individual items, the path would be like 'extractVars.0.varName'
        // For simplicity, let's assume 'fieldWithPath' is just 'extractVars' and 'value' is the whole array for now
        if (fieldWithPath === 'extractVars') {
          updatedNodeData.extractVars = value as ExtractVarItem[];
        }
        // A proper implementation would parse the index and sub-field:
        // const parts = fieldWithPath.split('.');
        // const index = parseInt(parts[1]);
        // const subField = parts[2] as keyof ExtractVarItem;
        // if (updatedNodeData.extractVars && updatedNodeData.extractVars[index]) {
        //   updatedNodeData.extractVars[index] = { ...updatedNodeData.extractVars[index], [subField]: value };
        //   updatedNodeData.extractVars = [...updatedNodeData.extractVars]; // Ensure re-render
        // }
      } else {
        updatedNodeData = {
          ...updatedNodeData,
          [fieldWithPath as keyof CustomNodeData]: value,
        };
      }

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
      currentNodes.filter((node) => node.type === 'start' || node.type === 'end' || node.type === 'EndCall') // Keep all types of end nodes
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

  const handleExportToJson = () => {
    const flowData = {
      nodes: nodes.map(node => ({
        id: node.id,
        data: node.data,
        type: node.type,
        position: node.position,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        data: edge.data,
      })),
      globalConfig: {
        ...globalConfig
      }
    };
    const jsonString = JSON.stringify(flowData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('canvasPage.exportFileName');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(jsonString);
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'background.default' }}>
      <EasyPathAppBar appBarHeight="small" />
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
          <Tooltip title={t('canvasPage.globalSettingsTooltip')}>
            <Fab
              color="secondary"
              size="small"
              sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}
              onClick={handleToggleGlobalConfigSidebar}
            >
              <SettingsIcon />
            </Fab>
          </Tooltip>
          {/* Export Button */}
          <Tooltip title={t('canvasPage.exportTooltip')}>
            <Fab
              color="primary"
              size="small"
              sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
              onClick={handleExportToJson}
            >
              {/* You can use an appropriate icon like DownloadIcon */}
              <Typography sx={{ color: "common.white", fontSize: "0.7rem", p: 0.5 }}>Export</Typography>
            </Fab>
          </Tooltip>
        </ReactFlow>
      </Box>

      {selectedNode && (
        <NodeModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          selectedNode={selectedNode}
          onNodeDataChange={handleNodeDataChange}
        />
      )}
    </Box>
  );
};

export default CanvasPage;
