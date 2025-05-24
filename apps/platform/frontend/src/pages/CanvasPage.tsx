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
  type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useCallback, useState } from 'react';

import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  TextField,
  Typography
} from '@mui/material';
import EasyPathAppBar from '../components/AppBar';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import type { CustomNodeData } from '../components/canvas/CustomNodes';
import { nodeTypes } from '../components/canvas/CustomNodes';

const initialNodes: Node<CustomNodeData>[] = [
  {
    id: 'start-node', // id único para o nó de inicio
    type: 'start',
    position: { x: 0, y: 0 },
    data: { name: 'Start Node' },
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
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<CustomNodeData> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<CustomNodeData>) => {
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

          <CanvasToolbar onAddNode={handleAddNode} />

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
