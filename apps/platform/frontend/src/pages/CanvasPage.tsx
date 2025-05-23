import {
  addEdge,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useCallback, useState } from 'react';

import HttpIcon from '@mui/icons-material/Http';
import StartIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Modal,
  Paper,
  Select,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import EasyPathAppBar from '../components/AppBar';

interface CustomNodeData {
  name: string;
  prompt?: string;
  url?: string;
  method?: string;
  [key: string]: unknown;
}

const nodeTypes = {
  start: (props: any) => (
    <div
      style={{
        backgroundColor: '#4CAF50', // Green
        color: 'white',
        borderRadius: '50%',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        border: '2px solid #388E3C',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      }}
    >
      <Typography variant="caption" sx={{ userSelect: 'none' }}>
        START
      </Typography>
      <Handle type="source" position={Position.Bottom} />
    </div>
  ),
  normal: (props: any) => (
    <div
      style={{
        backgroundColor: '#2196F3', // Blue
        color: 'white',
        borderRadius: '8px',
        padding: '10px 20px',
        border: '2px solid #1976D2',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      }}
    >
      <Typography variant="body2" sx={{ userSelect: 'none' }}>
        {props.data.name || 'Normal Node'}
      </Typography>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  ),
  end: (props: any) => (
    <div
      style={{
        backgroundColor: '#F44336', // Red
        color: 'white',
        borderRadius: '50%',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        border: '2px solid #D32F2F',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      }}
    >
      <Typography variant="caption" sx={{ userSelect: 'none' }}>
        END
      </Typography>
      {/* <Handle type="target" position={Position.Top} /> */}
    </div>
  ),
  request: (props: any) => (
    <div
      style={{
        backgroundColor: '#FF9800', // Orange
        color: 'white',
        borderRadius: '8px',
        padding: '10px 20px',
        border: '2px solid #FB8C00',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      }}
    >
      <Typography variant="body2" sx={{ userSelect: 'none' }}>
        {props.data.name || 'Request Node'}
      </Typography>
      {/* <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} /> */}
    </div>
  ),
};

const initialNodes: Node<CustomNodeData>[] = [];
const initialEdges: Edge[] = [];

const CanvasPage: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<CustomNodeData> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<CustomNodeData>) => {
    setSelectedNode(node);
    setIsModalOpen(true);
  }, []);

  const handleAddNode = (type: string) => {
    const newNode: Node<CustomNodeData> = {
      id: `${Date.now()}`,
      position: { x: Math.random() * 250, y: Math.random() * 250 },
      data: { name: `${type} Node` },
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
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? { ...node, data: { ...node.data, [field]: value } }
            : node
        )
      );
      setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, [field]: value } } : null));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'background.default' }}>
      <EasyPathAppBar appBarHeight="small" />
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
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

          {/* Centered Top Toolbar */}
          <Paper
            sx={{
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              display: 'flex',
              gap: 1,
              p: 1,
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <Toolbar disableGutters>
              <Tooltip title="Add Start Node">
                <Button variant="outlined" startIcon={<StartIcon />} onClick={() => handleAddNode('start')}>
                  Start
                </Button>
              </Tooltip>
              <Tooltip title="Add Normal Node">
                <Button variant="outlined" startIcon={<TextFieldsIcon />} onClick={() => handleAddNode('normal')}>
                  Normal
                </Button>
              </Tooltip>
              <Tooltip title="Add End Node">
                <Button variant="outlined" startIcon={<StopIcon />} onClick={() => handleAddNode('end')}>
                  End
                </Button>
              </Tooltip>
              <Tooltip title="Add Request Node">
                <Button variant="outlined" startIcon={<HttpIcon />} onClick={() => handleAddNode('request')}>
                  Request
                </Button>
              </Tooltip>
            </Toolbar>
          </Paper>
        </ReactFlow>
      </Box>

      {/* Node Edit Modal */}
      <Modal open={isModalOpen} onClose={handleModalClose}>
        <Box
          sx={{
            position: 'absolute' as 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography variant="h6" component="h2" gutterBottom>
            Edit Node: {selectedNode?.data.name}
          </Typography>
          <TextField
            label="Node Name"
            fullWidth
            margin="normal"
            value={selectedNode?.data.name || ''}
            onChange={(e) => handleNodeDataChange('name', e.target.value)}
          />

          {selectedNode?.type === 'normal' && (
            <TextField
              label="Prompt"
              fullWidth
              margin="normal"
              multiline
              rows={4}
              value={selectedNode?.data.prompt || ''}
              onChange={(e) => handleNodeDataChange('prompt', e.target.value)}
            />
          )}

          {selectedNode?.type === 'request' && (
            <>
              <TextField
                label="Request URL"
                fullWidth
                margin="normal"
                value={selectedNode?.data.url || ''}
                onChange={(e) => handleNodeDataChange('url', e.target.value)}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Method</InputLabel>
                <Select
                  value={selectedNode?.data.method || 'GET'}
                  label="Method"
                  onChange={(e) => handleNodeDataChange('method', e.target.value as string)}
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                </Select>
              </FormControl>
              {/* Add more fields for headers, body, etc. as needed */}
            </>
          )}

          <Button variant="contained" color="primary" onClick={handleModalClose} sx={{ mt: 2 }}>
            Done
          </Button>
          {/* Future: Add a "Save Canvas" button here which logs the current node/edge state */}
          <Button variant="outlined" color="secondary" sx={{ mt: 2, ml: 2 }} onClick={() => console.log('Current Canvas State:', { nodes, edges })}>
            Save Canvas State (Console)
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default CanvasPage;
