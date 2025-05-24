import type { Node } from "@xyflow/react";
import type { CustomNodeData } from "./CustomNodes";
import type { FC } from "react";
import { Box, Button, FormControl, InputLabel, MenuItem, Modal, Select, TextField, Typography } from "@mui/material";


interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node<CustomNodeData> | null;
  onNodeDataChange: (field: keyof CustomNodeData, value: string) => void;
}

const NodeModal: FC<NodeModalProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onNodeDataChange,
}) => {
  if (!selectedNode) {
    return null;
  }

  return (
    <Modal open={isOpen} onClose={onClose}>
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
        }}>

        <Typography variant="h6" component="h2" gutterBottom>
          Editar Nó: {selectedNode.data.name}
        </Typography>

        <TextField
          label="Nome do Nó"
          fullWidth
          margin="normal"
          value={selectedNode.data.name || ""}
          onChange={(e) => onNodeDataChange('name', e.target.value)}
        />

        {selectedNode.type === 'normal' && (
          <TextField
            label="Prompt"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            value={selectedNode.data.prompt || ''}
            onChange={(e) => onNodeDataChange('prompt', e.target.value)}
          />
        )}

        {selectedNode.type === 'request' && (
          <>
            <TextField
              label="URL do Request"
              fullWidth
              margin="normal"
              value={selectedNode.data.url || ''}
              onChange={(e) => onNodeDataChange('url', e.target.value)}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Método</InputLabel>
              <Select
                value={selectedNode.data.method || 'GET'}
                label="Método"
                onChange={(e) => onNodeDataChange('method', e.target.value)}
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </Select>
            </FormControl>,
          </>
        )}

        <Button variant="contained" color="primary" onClick={onClose} sx={{ mt: 2 }}>
          Concluído
        </Button>
      </Box>
    </Modal>
  )
}

export default NodeModal;
