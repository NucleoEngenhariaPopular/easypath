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
import { useTranslation } from 'react-i18next';

interface GlobalConfigSidebarProps {
  open: boolean;
  onClose: () => void;
  config: GlobalCanvasConfig;
  onConfigChange: (fieldName: keyof GlobalCanvasConfig, value: string) => void;
  flowName: string;
  flowDescription: string;
  onFlowNameChange: (name: string) => void;
  onFlowDescriptionChange: (description: string) => void;
}

export const drawerWidth = 400;

const GlobalConfigSidebar: React.FC<GlobalConfigSidebarProps> = ({
  open,
  onClose,
  config,
  onConfigChange,
  flowName,
  flowDescription,
  onFlowNameChange,
  onFlowDescriptionChange,
}) => {
  const { t } = useTranslation();

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
          {t('globalConfigSidebar.title')}
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <Box sx={{ p: 2, overflowY: 'auto' }}>
        <TextField
          label={t('globalConfigSidebar.flowNameLabel')}
          fullWidth
          variant="outlined"
          value={flowName}
          onChange={(e) => onFlowNameChange(e.target.value)}
          margin="normal"
          helperText={t('globalConfigSidebar.flowNameHelper')}
        />
        <TextField
          label={t('globalConfigSidebar.flowDescriptionLabel')}
          multiline
          rows={2}
          fullWidth
          variant="outlined"
          value={flowDescription}
          onChange={(e) => onFlowDescriptionChange(e.target.value)}
          margin="normal"
          helperText={t('globalConfigSidebar.flowDescriptionHelper')}
        />
        <Divider sx={{ my: 3 }} />
        <TextField
          label={t('globalConfigSidebar.globalPromptLabel')}
          name="globalPrompt"
          multiline
          rows={6}
          fullWidth
          variant="outlined"
          value={config.globalPrompt || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText={t('globalConfigSidebar.globalPromptHelper')}
        />
        <TextField
          label={t('globalConfigSidebar.roleAndObjectiveLabel')}
          name="roleAndObjective"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.roleAndObjective || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText={t('globalConfigSidebar.roleAndObjectiveHelper')}
        />
        <TextField
          label={t('globalConfigSidebar.toneAndStyleLabel')}
          name="toneAndStyle"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.toneAndStyle || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText={t('globalConfigSidebar.toneAndStyleHelper')}
        />
        <TextField
          label={t('globalConfigSidebar.languageAndFormatRulesLabel')}
          name="languageAndFormatRules"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.languageAndFormatRules || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText={t('globalConfigSidebar.languageAndFormatRulesHelper')}
        />
        <TextField
          label={t('globalConfigSidebar.behaviorAndFallbacksLabel')}
          name="behaviorAndFallbacks"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.behaviorAndFallbacks || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText={t('globalConfigSidebar.behaviorAndFallbacksHelper')}
        />
        <TextField
          label={t('globalConfigSidebar.placeholdersAndVariablesLabel')}
          name="placeholdersAndVariables"
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          value={config.placeholdersAndVariables || ''}
          onChange={handleInputChange}
          margin="normal"
          helperText={t('globalConfigSidebar.placeholdersAndVariablesHelper')}
        />
      </Box>
    </Drawer>
  );
};

export default GlobalConfigSidebar;
