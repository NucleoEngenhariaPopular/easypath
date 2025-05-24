import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  IconButton,
  Toolbar,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { GlobalCanvasConfig } from '../../types/canvasTypes';

interface GlobalConfigSidebarProps {
  open: boolean;
  onClose: () => void;
  config: GlobalCanvasConfig;
  onConfigChange: (fieldName: keyof GlobalCanvasConfig, value: string) => void;
}

export const drawerWidth = 400;

const GlobalConfigSidebar: React.FC<GlobalConfigSidebarProps> = ({
  open,
  onClose,
  config,
  onConfigChange,
}) => {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    onConfigChange(name as keyof GlobalCanvasConfig, value);
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" noWrap component="div">
          Configurações Globais
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <Box sx={{ p: 2, overflowY: 'auto' }}>
        <TextField
          label="Global Prompt"
          name="globalPrompt"
          multiline
          rows={6}
          fullWidth
          variant="outlined"
          value={config.globalPrompt || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText="This prompt will be applied globally."
        />
        <TextField
          label="Role & Objective"
          name="roleAndObjective"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.roleAndObjective || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText="Define the AI's role and primary goal."
        />
        <TextField
          label="Tone & Style"
          name="toneAndStyle"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.toneAndStyle || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText="Describe the desired tone and communication style."
        />
        <TextField
          label="Language & Format Rules"
          name="languageAndFormatRules"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.languageAndFormatRules || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText="Specify language rules and formatting."
        />
        <TextField
          label="Behavior & Fallbacks"
          name="behaviorAndFallbacks"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.behaviorAndFallbacks || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText="Outline AI behavior in different scenarios and fallback responses."
        />
        <TextField
          label="Placeholders & Variables"
          name="placeholdersAndVariables"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.placeholdersAndVariables || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText="List available placeholders and variables."
        />
      </Box>
    </Drawer>
  );
};

export default GlobalConfigSidebar;
