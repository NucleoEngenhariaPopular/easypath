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
import DeleteIcon from '@mui/icons-material/Delete';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { Box, Fab, Tooltip, Typography } from '@mui/material';
import EasyPathAppBar from '../components/AppBar';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import GlobalConfigSidebar, { drawerWidth } from '../components/canvas/GlobalConfigSidebar';
import { nodeTypes } from '../components/canvas/CustomNodes';
import type { GlobalCanvasConfig, CustomNodeData, ModelOptions, ExtractVarItem } from '../types/canvasTypes';
import NodeModal from '../components/canvas/NodeModal';
import EdgeModal from '../components/canvas/EdgeModal';
import VariableInspectorPanel from '../components/canvas/VariableInspectorPanel';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { convertEngineToCanvas, isEngineFormat, isCanvasFormat } from '../utils/flowConverter';
import { autoLayoutNodes } from '../utils/autoLayout';
import TestModePanel from '../components/canvas/TestModePanel';
import { useFlowWebSocket, type FlowEvent, type DecisionLog } from '../hooks/useFlowWebSocket';
import { v6 as uuidv6 } from 'uuid';

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
  const { id: flowId } = useParams<{ id: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<CustomNodeData> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false);

  const [isGlobalConfigSidebarOpen, setIsGlobalConfigSidebarOpen] = useState(false);
  const [globalConfig, setGlobalConfig] = useState<GlobalCanvasConfig>(initialGlobalConfig);
  const [flowName, setFlowName] = useState('Untitled Flow');
  const [flowDescription, setFlowDescription] = useState('');
  const [isVariableInspectorOpen, setIsVariableInspectorOpen] = useState(false);

  // Test mode state
  const [isTestMode, setIsTestMode] = useState(false);
  const [testSessionId, setTestSessionId] = useState(uuidv6());
  const [testMessages, setTestMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>>([]);
  const [testVariables, setTestVariables] = useState<Record<string, any>>({});
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [animatingEdge, setAnimatingEdge] = useState<string | null>(null);
  const [clickedEdge, setClickedEdge] = useState<string | null>(null);
  const [lastClickedEdgeId, setLastClickedEdgeId] = useState<string | null>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>([]);

  // Stats tracking
  const [lastMessageStats, setLastMessageStats] = useState<{
    responseTime: number;
    tokens: number;
    cost: number;
    pathwaySelection: {
      time: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
      model: string;
    };
    responseGeneration: {
      time: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
      model: string;
    };
    loopEvaluation: {
      time: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
      model: string;
    };
  } | null>(null);
  const [conversationStats, setConversationStats] = useState({
    totalResponseTime: 0,
    totalTokens: 0,
    totalCost: 0,
  });

  useEffect(() => {
    const fetchFlow = async () => {
      if (flowId && flowId !== 'new') {
        const response = await fetch(`/api/flows/${flowId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.name) setFlowName(data.name);
          if (data.description) setFlowDescription(data.description);
          const flowData = data.flow_data;
          if (flowData.nodes) setNodes(flowData.nodes);
          if (flowData.edges) setEdges(flowData.edges);
          if (flowData.globalConfig) setGlobalConfig(flowData.globalConfig);
        }
      }
    };

    fetchFlow();
  }, [flowId, setNodes, setEdges]);

  // Keyboard event listener for deleting selected edges
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && clickedEdge) {
        event.preventDefault();
        setEdges((eds) => eds.filter((edge) => edge.id !== clickedEdge));
        setClickedEdge(null);
        setLastClickedEdgeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clickedEdge, setEdges]);

  // WebSocket integration for test mode
  const handleWebSocketEvent = (event: FlowEvent) => {
    console.log('WebSocket event:', event);

    switch (event.event_type) {
      case 'node_entered':
        setActiveNodeId(event.node_id || null);
        break;
      case 'pathway_selected':
        if (event.from_node_id && event.to_node_id) {
          const edgeId = `${event.from_node_id}-${event.to_node_id}`;
          setAnimatingEdge(edgeId);
          setTimeout(() => setAnimatingEdge(null), 1000);
        }
        break;
      case 'variable_extracted':
        if (event.all_variables) {
          setTestVariables(event.all_variables);
        }
        break;
      case 'user_message':
        // User messages are shown immediately when sent, skip WebSocket event
        console.log('Skipping user_message WebSocket event (already shown):', event.message);
        break;
      case 'assistant_message':
        if (event.message) {
          console.log('Adding assistant message from WebSocket:', event.message);
          setTestMessages(prev => [...prev, {
            role: 'assistant',
            content: event.message!,
            timestamp: event.timestamp
          }]);
          setIsLoadingResponse(false);
        }
        break;
      case 'decision_step':
        // Handle decision step event - build decision log
        console.log('Received decision_step event:', event);
        const decisionLog: DecisionLog = {
          id: `${event.timestamp}-${event.node_id}`,
          timestamp: event.timestamp,
          stepName: event.step_name || 'Decision',
          nodeId: event.node_id || '',
          nodeName: event.node_name,
          nodePrompt: event.node_prompt,
          previousNodeId: event.previous_node_id,
          previousNodeName: event.previous_node_name,
          availablePathways: event.available_pathways || [],
          chosenPathway: event.chosen_pathway,
          pathwayConfidence: event.pathway_confidence,
          llmReasoning: event.llm_reasoning,
          variablesExtracted: event.variables_extracted,
          variablesStatus: event.variables_status,
          assistantResponse: event.assistant_response,
          timingMs: event.timing_ms,
          tokensUsed: event.tokens_used,
          costUsd: event.cost_usd,
          modelName: event.model_name,
        };
        setDecisionLogs(prev => [...prev, decisionLog]);
        break;
    }
  };

  const { isConnected } = useFlowWebSocket({
    sessionId: testSessionId,
    flowId: flowId,
    onEvent: handleWebSocketEvent,
    enabled: isTestMode
  });

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
    // Check if this is the second click on the same edge
    if (lastClickedEdgeId === edge.id) {
      // Second click - open modal and clear animation
      setSelectedEdge(edge);
      setIsEdgeModalOpen(true);
      setLastClickedEdgeId(null);
      setClickedEdge(null);
    } else {
      // First click - start looping animation
      setClickedEdge(edge.id);
      setLastClickedEdgeId(edge.id);
    }
  }, [lastClickedEdgeId]);

  const handleAddNode = (type: string) => {
    // Create appropriate name based on type
    const typeNames: Record<string, string> = {
      'message': 'Message',
      'extraction': 'Extraction',
      'validation': 'Validation',
      'recommendation': 'Recommendation',
      'summary': 'Summary',
      'request': 'Request',
      'start': 'Start',
      'end': 'End',
      'normal': 'Normal',
    };

    const newNodeData: CustomNodeData = {
      name: typeNames[type] || `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
    };

    // Initialize specific fields for new nodes if needed
    if (['message', 'normal', 'request', 'extraction', 'validation', 'recommendation', 'summary'].includes(type)) {
      newNodeData.modelOptions = { modelType: 'smart', temperature: 0.2 };
      newNodeData.prompt = '';
    }

    if (type === 'start') {
      newNodeData.isStart = true;
    }

    if (type === 'extraction') {
      newNodeData.extractVars = [];
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

  const handleEdgeUpdate = (edgeId: string, label: string, description: string) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId ? { ...edge, label, data: { ...edge.data, description } } : edge
      )
    );
  };

  const handleEdgeDelete = (edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  };

  const handleNodeDelete = (nodeId: string) => {
    // Remove the node
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    // Remove any edges connected to this node
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  };

  const handleNodeDataChange = (
    fieldWithPath: keyof CustomNodeData | `modelOptions.${keyof ModelOptions}` | `extractVars.${number}.${keyof ExtractVarItem}`,
    value: any
  ) => {
    if (selectedNode) {
      let updatedNodeData = { ...selectedNode.data };
      let updatedNodeType = selectedNode.type;

      fieldWithPath = fieldWithPath.toString()

      // Handle node ID change (requires updating edges too)
      if (fieldWithPath === 'nodeId') {
        const oldId = selectedNode.id;
        const newId = value;

        // Update node ID
        setNodes((nds) =>
          nds.map((node) =>
            node.id === oldId
              ? { ...node, id: newId }
              : node
          )
        );

        // Update edges that reference this node
        setEdges((eds) =>
          eds.map((edge) => ({
            ...edge,
            source: edge.source === oldId ? newId : edge.source,
            target: edge.target === oldId ? newId : edge.target,
          }))
        );

        // Update selected node
        setSelectedNode((prev) => (prev ? { ...prev, id: newId } : null));
        return;
      }

      // Handle node type change (updates the node's type property, not data)
      if (fieldWithPath === 'nodeType') {
        updatedNodeType = value;
      } else if (fieldWithPath.startsWith('modelOptions.')) {
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
            ? { ...node, type: updatedNodeType, data: updatedNodeData }
            : node
        )
      );
      setSelectedNode((prev) => (prev ? { ...prev, type: updatedNodeType, data: updatedNodeData } : null));
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

  const handleAutoArrange = () => {
    setNodes((currentNodes) => autoLayoutNodes(currentNodes, edges));
  };

  const handleTestModeToggle = () => {
    setIsTestMode(!isTestMode);
    if (isTestMode) {
      // Reset state when closing test mode
      setTestMessages([]);
      setTestVariables({});
      setActiveNodeId(null);
      setIsLoadingResponse(false);
      setLastMessageStats(null);
      setConversationStats({
        totalResponseTime: 0,
        totalTokens: 0,
        totalCost: 0,
      });
    }
  };

  const handleSendTestMessage = async (message: string) => {
    try {
      console.log('Sending test message:', message);

      // Immediately show user message in the chat
      console.log('Adding user message immediately:', message);
      setTestMessages(prev => [...prev, {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }]);

      // Set loading state
      setIsLoadingResponse(true);

      // Convert canvas flow to engine format
      const engineFlow = {
        first_node_id: nodes.find(n => n.data.isStart)?.id || nodes[0]?.id || 'start',
        nodes: nodes.map(n => ({
          id: n.id,
          node_type: n.type || 'normal',
          prompt: {
            context: n.data.prompt?.context || '',
            objective: n.data.prompt?.objective || '',
            notes: n.data.prompt?.notes || '',
            examples: n.data.prompt?.examples || '',
            custom_fields: n.data.prompt?.custom_fields || {}
          },
          is_start: n.data.isStart || false,
          is_end: n.type === 'end',
          use_llm: true,
          is_global: n.data.isGlobal || false,
          node_description: n.data.nodeDescription || '',
          auto_return_to_previous: n.data.autoReturnToPrevious || false,
          extract_vars: n.data.extractVars?.map(v => ({
            name: v.name,
            description: v.description,
            required: v.required,
            var_type: v.varType || 'string'
          })) || [],
          temperature: n.data.modelOptions?.temperature || 0.2,
          skip_user_response: n.data.modelOptions?.skipUserResponse || false,
          loop_enabled: n.data.loopEnabled || false,
          loop_condition: n.data.condition || ''
        })),
        connections: edges.map((e, idx) => ({
          id: e.id || `conn-${idx}`,
          label: e.label?.toString() || '',
          description: (e.data?.description as string) || e.label?.toString() || '',
          else_option: false,
          source: e.source,
          target: e.target
        })),
        global_objective: globalConfig.roleAndObjective || '',
        global_tone: globalConfig.toneAndStyle || '',
        global_language: globalConfig.languageAndFormatRules || '',
        global_behaviour: globalConfig.behaviorAndFallbacks || '',
        global_values: globalConfig.placeholdersAndVariables || ''
      };

      console.log('Engine flow:', engineFlow);
      console.log('Number of nodes:', engineFlow.nodes.length);
      console.log('Number of connections:', engineFlow.connections.length);
      console.log('First node ID:', engineFlow.first_node_id);

      const requestBody = {
        session_id: testSessionId,
        user_message: message,
        flow: engineFlow
      };

      console.log('Sending request to engine:', requestBody);

      const response = await fetch('http://localhost:8081/chat/message-with-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Engine response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to send message:', response.statusText, errorText);
        setIsLoadingResponse(false);
        alert(`Error: ${response.status} - ${errorText}`);
      } else {
        const responseData = await response.json();
        console.log('Engine response:', responseData);

        // Extract timing and cost information
        if (responseData.timing && responseData.timing.step_details) {
          const stepDetails = responseData.timing.step_details;

          // Include loop_evaluation_tokens (may be 0 if no loop occurred)
          const loopTokens = stepDetails.loop_evaluation_tokens || { total: 0, cost_usd: 0 };

          const totalTokens =
            stepDetails.choose_next_tokens.total +
            stepDetails.generate_response_tokens.total +
            loopTokens.total;
          const totalCost =
            stepDetails.choose_next_tokens.cost_usd +
            stepDetails.generate_response_tokens.cost_usd +
            loopTokens.cost_usd;
          const responseTime = responseData.timing.total;

          // Update last message stats with detailed breakdown
          setLastMessageStats({
            responseTime,
            tokens: totalTokens,
            cost: totalCost,
            pathwaySelection: {
              time: stepDetails.choose_next,
              inputTokens: stepDetails.choose_next_tokens.input,
              outputTokens: stepDetails.choose_next_tokens.output,
              totalTokens: stepDetails.choose_next_tokens.total,
              cost: stepDetails.choose_next_tokens.cost_usd,
              model: stepDetails.choose_next_model,
            },
            responseGeneration: {
              time: stepDetails.generate_response,
              inputTokens: stepDetails.generate_response_tokens.input,
              outputTokens: stepDetails.generate_response_tokens.output,
              totalTokens: stepDetails.generate_response_tokens.total,
              cost: stepDetails.generate_response_tokens.cost_usd,
              model: stepDetails.generate_response_model,
            },
            loopEvaluation: {
              time: stepDetails.loop_evaluation || 0,
              inputTokens: loopTokens.input || 0,
              outputTokens: loopTokens.output || 0,
              totalTokens: loopTokens.total || 0,
              cost: loopTokens.cost_usd || 0,
              model: stepDetails.loop_evaluation_model || 'none',
            },
          });

          // Update conversation totals
          setConversationStats(prev => ({
            totalResponseTime: prev.totalResponseTime + responseTime,
            totalTokens: prev.totalTokens + totalTokens,
            totalCost: prev.totalCost + totalCost,
          }));
        }
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      setIsLoadingResponse(false);
      alert(`Error sending message: ${error}`);
    }
  };

  const handleResetTestSession = () => {
    // Generate new session ID for fresh conversation
    setTestSessionId(uuidv6());
    setTestMessages([]);
    setTestVariables({});
    setActiveNodeId(null);
    setIsLoadingResponse(false);
    setLastMessageStats(null);
    setDecisionLogs([]);
    setConversationStats({
      totalResponseTime: 0,
      totalTokens: 0,
      totalCost: 0,
    });
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
              // Auto-layout imported nodes to prevent overlaps
              const layoutedNodes = autoLayoutNodes(converted.nodes, converted.edges);
              setNodes(layoutedNodes);
              setEdges(converted.edges);
              setGlobalConfig(converted.globalConfig);
            }
            // Check if it's canvas format
            else if (isCanvasFormat(importedData)) {
              console.log('Detected canvas format, loading...');
              if (importedData.nodes && importedData.edges) {
                // Auto-layout imported nodes to prevent overlaps
                const layoutedNodes = autoLayoutNodes(importedData.nodes, importedData.edges);
                setNodes(layoutedNodes);
                setEdges(importedData.edges);
              }
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
      name: flowName,
      description: flowDescription,
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

  const handleDeleteFlow = async () => {
    if (flowId === 'new') {
      alert(t('canvasPage.cannotDeleteUnsaved'));
      return;
    }

    if (!window.confirm(t('canvasPage.confirmDelete'))) {
      return;
    }

    const response = await fetch(`/api/flows/${flowId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      console.log("Flow deleted successfully");
      window.location.href = '/dashboard';
    } else {
      console.error("Failed to delete flow");
      alert(t('canvasPage.deleteFailed'));
    }
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'background.default' }}>
      <EasyPathAppBar
        appBarHeight="small"
        title={flowName}
        onTitleChange={setFlowName}
        titlePlaceholder="Untitled Flow"
      />
      <GlobalConfigSidebar
        open={isGlobalConfigSidebarOpen}
        onClose={() => setIsGlobalConfigSidebarOpen(false)}
        config={globalConfig}
        onConfigChange={handleGlobalConfigChange}
        flowName={flowName}
        flowDescription={flowDescription}
        onFlowNameChange={setFlowName}
        onFlowDescriptionChange={setFlowDescription}
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
          nodes={nodes.map(node => ({
            ...node,
            className: node.id === activeNodeId ? 'active-node' : ''
          }))}
          edges={edges.map(edge => {
            let className = '';
            if (edge.id === animatingEdge) className = 'animating-edge';
            else if (edge.id === clickedEdge) className = 'clicked-edge';

            // Preserve edge style and type from original edge
            return {
              ...edge,
              className,
              animated: edge.id === animatingEdge,
              // Keep existing style and type (for loop-back edges)
              style: edge.style,
              type: edge.type || 'smoothstep',
            };
          })}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          edgesReconnectable={true}
          fitView
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: '#c0c9e0',
              strokeWidth: 2,
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
              if (node.type === 'extraction') return '#f093fb';
              if (node.type === 'validation') return '#4facfe';
              if (node.type === 'recommendation') return '#fccb90';
              if (node.type === 'summary') return '#e0c3fc';
              if (node.type === 'message') return '#667eea';
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
            onAutoArrange={handleAutoArrange}
            onTestModeToggle={handleTestModeToggle}
            isTestMode={isTestMode}
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
          {/* Variable Inspector Button */}
          <Tooltip title={t('canvasPage.variableInspectorTooltip')}>
            <Fab
              color="success"
              size="small"
              sx={{ position: 'absolute', top: 72, left: 16, zIndex: 10 }}
              onClick={() => setIsVariableInspectorOpen(!isVariableInspectorOpen)}
            >
              <DataObjectIcon />
            </Fab>
          </Tooltip>
          {/* Delete Button */}
          {flowId !== 'new' && (
            <Tooltip title={t('canvasPage.deleteTooltip')}>
              <Fab
                color="error"
                size="small"
                sx={{ position: 'absolute', top: 16, right: 80, zIndex: 10 }}
                onClick={handleDeleteFlow}
              >
                <DeleteIcon />
              </Fab>
            </Tooltip>
          )}
          {/* Save Button */}
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
          onNodeDelete={handleNodeDelete}
          allNodes={nodes}
          allEdges={edges}
        />
      )}

      <EdgeModal
        isOpen={isEdgeModalOpen}
        onClose={handleEdgeModalClose}
        selectedEdge={selectedEdge}
        onEdgeUpdate={handleEdgeUpdate}
        onEdgeDelete={handleEdgeDelete}
      />

      <TestModePanel
        open={isTestMode}
        onClose={() => setIsTestMode(false)}
        sessionId={testSessionId}
        isConnected={isConnected}
        messages={testMessages}
        variables={testVariables}
        currentNodeId={activeNodeId}
        onSendMessage={handleSendTestMessage}
        onReset={handleResetTestSession}
        isLoading={isLoadingResponse}
        lastMessageStats={lastMessageStats}
        conversationStats={conversationStats}
        decisionLogs={decisionLogs}
      />

      <VariableInspectorPanel
        open={isVariableInspectorOpen}
        onClose={() => setIsVariableInspectorOpen(false)}
        nodes={nodes}
        edges={edges}
        currentNodeId={activeNodeId || undefined}
        runtimeVariables={testVariables}
      />
    </Box>
  );
};

export default CanvasPage;
