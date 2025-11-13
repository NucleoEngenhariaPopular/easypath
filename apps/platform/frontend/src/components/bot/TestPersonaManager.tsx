import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Typography,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { messagingGatewayFetch, postJson } from '../../services/apiClient';

// Emoji avatars for personas
const PERSONA_AVATARS = ['👤', '👨', '👩', '🧑', '👴', '👵', '🏢', '🎯', '💼', '🎓'];

export interface TestPersona {
  id: string;              // Frontend-generated UUID
  name: string;            // Display name
  avatar: string;          // Emoji avatar
  botConfigId?: number;    // Backend bot_config.id
  sessionId?: string;      // Current session ID
  messageCount: number;    // Number of messages sent
  createdAt: string;       // ISO timestamp
}

interface TestPersonaManagerProps {
  flowId: number;
  ownerId: string;
  activePersona: TestPersona | null;
  personas: TestPersona[];
  onPersonaChange: (persona: TestPersona) => void;
  onPersonaCreate: (persona: TestPersona) => void;
  onPersonaDelete: (personaId: string) => void;
}

const TestPersonaManager: React.FC<TestPersonaManagerProps> = ({
  flowId,
  ownerId,
  activePersona,
  personas,
  onPersonaChange,
  onPersonaCreate,
  onPersonaDelete,
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PERSONA_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreatePersona = async () => {
    if (!newPersonaName.trim()) {
      setError('Persona name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call backend to create test bot
      const result = await messagingGatewayFetch<{
        bot_config_id: number;
        bot_name: string;
      }>(
        '/api/test-bots',
        {
          ...postJson({
            persona_name: newPersonaName,
            flow_id: flowId,
            owner_id: ownerId,
          }),
        }
      );

      // Create persona object for frontend
      const newPersona: TestPersona = {
        id: crypto.randomUUID(),
        name: newPersonaName,
        avatar: selectedAvatar,
        botConfigId: result.bot_config_id,
        messageCount: 0,
        createdAt: new Date().toISOString(),
      };

      onPersonaCreate(newPersona);

      // Reset form
      setNewPersonaName('');
      setSelectedAvatar(PERSONA_AVATARS[0]);
      setCreateDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create persona');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePersona = async (persona: TestPersona) => {
    if (!persona.botConfigId) return;

    if (!confirm(`Delete "${persona.name}"? All collected data will be lost.`)) {
      return;
    }

    try {
      await messagingGatewayFetch(
        `/api/test-bots/${persona.botConfigId}`,
        {
          method: 'DELETE',
          parseJson: false,
        }
      );

      onPersonaDelete(persona.id);
    } catch (err) {
      console.error('Failed to delete persona:', err);
      alert('Failed to delete persona. Check console for details.');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Test Personas
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Create multiple test accounts to simulate different users
        </Typography>
      </Box>

      {/* Persona List */}
      <List sx={{ flexGrow: 1, overflow: 'auto', py: 0 }}>
        {personas.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No test personas yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Create one to start testing with multiple users
            </Typography>
          </Box>
        ) : (
          personas.map((persona) => (
            <ListItem
              key={persona.id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleDeletePersona(persona)}
                  disabled={activePersona?.id === persona.id}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={activePersona?.id === persona.id}
                onClick={() => onPersonaChange(persona)}
              >
                <ListItemIcon>
                  <Box
                    sx={{
                      fontSize: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {persona.avatar}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{persona.name}</Typography>
                      {activePersona?.id === persona.id && (
                        <Chip label="Active" size="small" color="primary" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {persona.messageCount === 0
                        ? 'No messages yet'
                        : `${persona.messageCount} message${persona.messageCount === 1 ? '' : 's'}`}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>

      {/* Create Button */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Persona
        </Button>
      </Box>

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => !loading && setCreateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create Test Persona</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Persona Name"
            fullWidth
            value={newPersonaName}
            onChange={(e) => setNewPersonaName(e.target.value)}
            placeholder="e.g., John Doe, Lead Quality, Support User"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleCreatePersona();
              }
            }}
          />

          <FormControl fullWidth margin="dense">
            <InputLabel>Avatar</InputLabel>
            <Select
              value={selectedAvatar}
              onChange={(e) => setSelectedAvatar(e.target.value)}
              disabled={loading}
              label="Avatar"
            >
              {PERSONA_AVATARS.map((emoji) => (
                <MenuItem key={emoji} value={emoji}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
                    <Typography variant="body2">
                      {emoji === '🏢' ? 'Company' : emoji === '🎯' ? 'Target' : 'Person'}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            This creates a test bot configuration with full variable persistence.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePersona}
            variant="contained"
            disabled={loading || !newPersonaName.trim()}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestPersonaManager;
