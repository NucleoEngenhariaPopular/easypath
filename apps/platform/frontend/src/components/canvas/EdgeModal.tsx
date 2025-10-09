import React, { useState, useEffect } from 'react';
import {
  Dialog,
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
  onEdgeUpdate: (edgeId: string, label: string, description: string) => void;
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
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (selectedEdge) {
      setLabel(selectedEdge.label as string || '');
      setDescription((selectedEdge.data?.description as string) || '');
    }
  }, [selectedEdge]);

  const handleSave = () => {
    if (selectedEdge) {
      onEdgeUpdate(selectedEdge.id, label, description);
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
          borderRadius: 4,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        p: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Box>
          <Typography variant="h5" component="div" fontWeight={700} sx={{ mb: 0.5 }}>
            Edit Connection
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Configure connection properties
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 4 }}>
        <Box sx={{
          p: 2.5,
          mb: 3,
          bgcolor: 'action.hover',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {selectedEdge.source}
            </Box>
            <Box component="span" sx={{ color: 'text.disabled' }}>→</Box>
            <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {selectedEdge.target}
            </Box>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{
            width: 4,
            height: 24,
            bgcolor: 'primary.main',
            borderRadius: 1,
            mr: 1.5
          }} />
          <Typography variant="h6" fontWeight="600" color="text.primary">
            Connection Label
          </Typography>
        </Box>

        <TextField
          label="Label"
          fullWidth
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Enter a label for this connection..."
          variant="outlined"
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
          helperText="This label will be displayed on the connection arrow"
        />

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{
            width: 4,
            height: 24,
            bgcolor: 'primary.main',
            borderRadius: 1,
            mr: 1.5
          }} />
          <Typography variant="h6" fontWeight="600" color="text.primary">
            Connection Description
          </Typography>
        </Box>

        <TextField
          label="Description"
          fullWidth
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe when to choose this path..."
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              resize: 'vertical',
              overflow: 'auto',
            }
          }}
          helperText="This description helps the LLM decide when to follow this path"
        />
      </DialogContent>

      <DialogActions sx={{
        px: 4,
        pb: 3,
        pt: 2,
        borderTop: '2px solid',
        borderColor: 'divider',
        justifyContent: 'space-between'
      }}>
        <Button
          onClick={handleDelete}
          color="error"
          variant="outlined"
          startIcon={<DeleteIcon />}
          sx={{
            borderRadius: 2,
            '&:hover': {
              bgcolor: 'error.lighter',
            }
          }}
        >
          Delete
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            sx={{
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            }}
          >
            Save Changes
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EdgeModal;
