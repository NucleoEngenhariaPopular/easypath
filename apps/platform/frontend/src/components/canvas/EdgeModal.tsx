import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Edge } from '@xyflow/react';

interface EdgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEdge: Edge | null;
  onEdgeUpdate: (edgeId: string, label: string) => void;
  onEdgeDelete: (edgeId: string) => void;
}

const EdgeModal: React.FC<EdgeModalProps> = ({
  isOpen,
  onClose,
  selectedEdge,
  onEdgeUpdate,
  onEdgeDelete,
}) => {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (selectedEdge) {
      setLabel(selectedEdge.label as string || '');
    }
  }, [selectedEdge]);

  const handleSave = () => {
    if (selectedEdge) {
      onEdgeUpdate(selectedEdge.id, label);
      onClose();
    }
  };

  const handleDelete = () => {
    if (selectedEdge && window.confirm('Are you sure you want to delete this connection?')) {
      onEdgeDelete(selectedEdge.id);
      onClose();
    }
  };

  if (!selectedEdge) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 24,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div" fontWeight={600}>
          Edit Connection
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connection from <strong>{selectedEdge.source}</strong> to{' '}
            <strong>{selectedEdge.target}</strong>
          </Typography>

          <TextField
            label="Connection Label"
            fullWidth
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Enter a label for this connection..."
            variant="outlined"
            sx={{ mb: 2 }}
            helperText="This label will be displayed on the connection arrow"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={handleDelete}
          color="error"
          variant="outlined"
          startIcon={<DeleteIcon />}
        >
          Delete
        </Button>
        <Box>
          <Button onClick={onClose} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EdgeModal;
