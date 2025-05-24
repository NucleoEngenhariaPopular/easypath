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

export const drawerWidth = 360; // You can adjust the width

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
      anchor="left" // ou "right"
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
          Global Configuration
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
          rows={10}
          fullWidth
          variant="outlined"
          value={config.globalPrompt}
          onChange={handleInputChange}
          margin="normal"
          helperText="This prompt will be applied globally to the canvas operations."
        />
        {/* Add more fields here for other global settings as they arise */}
        {/* Example:
        <TextField
          label="Default Temperature"
          name="defaultTemperature" // Assuming you add this to GlobalCanvasConfig
          type="number"
          fullWidth
          variant="outlined"
          value={config.defaultTemperature || 0.7}
          onChange={handleInputChange}
          margin="normal"
        />
        */}
      </Box>
    </Drawer>
  );
};

export default GlobalConfigSidebar;
