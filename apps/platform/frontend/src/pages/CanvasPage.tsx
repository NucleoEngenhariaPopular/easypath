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
import '../components/canvas/canvas-styles.css';
import React, { useCallback, useState } from 'react';

import SettingsIcon from '@mui/icons-material/Settings';
import { Box, Fab, Tooltip, Typography } from '@mui/material';
import EasyPathAppBar from '../components/AppBar';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import GlobalConfigSidebar, { drawerWidth } from '../components/canvas/GlobalConfigSidebar';
import { nodeTypes } from '../components/canvas/CustomNodes';
import type { GlobalCanvasConfig, CustomNodeData, ModelOptions, ExtractVarItem } from '../types/canvasTypes';
import NodeModal from '../components/canvas/NodeModal';
import EdgeModal from '../components/canvas/EdgeModal';
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

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { convertEngineToCanvas, isEngineFormat, isCanvasFormat } from '../utils/flowConverter';

const CanvasPage: React.FC = () => {
  const { t } = useTranslation();
  const { id: flowId } = useParams<{ id: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<CustomNodeData> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false);

  const [isGlobalConfigSidebarOpen, setIsGlobalConfigSidebarOpen] = useState(false);
  const [globalConfig, setGlobalConfig] = useState<GlobalCanvasConfig>(initialGlobalConfig);

  useEffect(() => {
    const fetchFlow = async () => {
      if (flowId && flowId !== 'new') {
        const response = await fetch(`/api/flows/${flowId}`);
        if (response.ok) {
          const data = await response.json();
          const flowData = data.flow_data;
          if (flowData.nodes) setNodes(flowData.nodes);
          if (flowData.edges) setEdges(flowData.edges);
          if (flowData.globalConfig) setGlobalConfig(flowData.globalConfig);
        }
      }
    };

    fetchFlow();
  }, [flowId, setNodes, setEdges]);

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

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setIsEdgeModalOpen(true);
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

  const handleEdgeModalClose = () => {
    setIsEdgeModalOpen(false);
    setSelectedEdge(null);
  };

  const handleEdgeUpdate = (edgeId: string, label: string) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId ? { ...edge, label } : edge
      )
    );
  };

  const handleEdgeDelete = (edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
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

  const handleImportFromJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target?.result as string);

            // Check if it's engine format (from apps/engine fixtures)
            if (isEngineFormat(importedData)) {
              console.log('Detected engine format, converting...');
              const converted = convertEngineToCanvas(importedData);
              setNodes(converted.nodes);
              setEdges(converted.edges);
              setGlobalConfig(converted.globalConfig);
            }
            // Check if it's canvas format
            else if (isCanvasFormat(importedData)) {
              console.log('Detected canvas format, loading...');
              if (importedData.nodes) setNodes(importedData.nodes);
              if (importedData.edges) setEdges(importedData.edges);
              if (importedData.globalConfig) setGlobalConfig(importedData.globalConfig);
            }
            else {
              console.error('Unknown flow format');
              alert('Error: Unknown flow format. Please import a valid flow JSON.');
            }
          } catch (error) {
            console.error("Error parsing JSON file:", error);
            alert('Error parsing JSON file. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleSaveFlow = async () => {
    const flowData = {
      name: "My Flow", // You might want to get this from a user input
      description: "A description of my flow", // You might want to get this from a user input
      flow_data: { nodes, edges, globalConfig },
    };

    const url = flowId === 'new' ? '/api/flows/' : `/api/flows/${flowId}`;
    const method = flowId === 'new' ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flowData),
    });

    if (response.ok) {
      const data = await response.json();
      if (flowId === 'new') {
        // redirect to the new flow's page
        window.history.replaceState(null, '', `/canvas/${data.id}`)
      }
      console.log("Flow saved successfully");
    } else {
      console.error("Failed to save flow");
    }
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
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: {
              stroke: '#667eea',
              strokeWidth: 2.5,
            },
            labelStyle: {
              fontSize: 12,
              fontWeight: 600,
              fill: '#555',
            },
            labelBgStyle: {
              fill: '#fff',
              fillOpacity: 0.9,
            },
            markerEnd: {
              type: 'arrowclosed',
              color: '#667eea',
              width: 20,
              height: 20,
            },
          }}
        >
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              if (node.type === 'start') return '#43e97b';
              if (node.type === 'end') return '#f5576c';
              if (node.type === 'request') return '#fa709a';
              return '#667eea';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          <Controls />
          <Background
            color="#d0d0d0"
            gap={20}
            size={1.5}
            style={{ backgroundColor: '#f8f9fa' }}
          />
          <CanvasToolbar
            onAddNode={handleAddNode}
            onClearIntermediateNodes={handleClearIntermediateNodes}
            onImport={handleImportFromJson}
            onExport={handleExportToJson}
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
          <Tooltip title={t('canvasPage.saveTooltip')}>
            <Fab
              color="primary"
              size="small"
              sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
              onClick={handleSaveFlow}
            >
              {/* You can use an appropriate icon like SaveIcon */}
              <Typography sx={{ color: "common.white", fontSize: "0.7rem", p: 0.5 }}>Save</Typography>
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

      <EdgeModal
        isOpen={isEdgeModalOpen}
        onClose={handleEdgeModalClose}
        selectedEdge={selectedEdge}
        onEdgeUpdate={handleEdgeUpdate}
        onEdgeDelete={handleEdgeDelete}
      />
    </Box>
  );
};

export default CanvasPage;
