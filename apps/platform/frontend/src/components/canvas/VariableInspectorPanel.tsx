import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { Node, Edge } from '@xyflow/react';
import type { CustomNodeData, VariableInfo } from '../../types/canvasTypes';
import { getAllFlowVariables, getAvailableVariablesAtNode } from '../../utils/flowAnalyzer';

interface VariableInspectorPanelProps {
  open: boolean;
  onClose: () => void;
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  currentNodeId?: string;
  runtimeVariables?: Record<string, any>;
}

const drawerWidth = 400;

const VariableInspectorPanel: React.FC<VariableInspectorPanelProps> = ({
  open,
  onClose,
  nodes,
  edges,
  currentNodeId,
  runtimeVariables = {},
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Get all variables in the flow
  const allVariables = useMemo(() => getAllFlowVariables(nodes), [nodes]);

  // Get variables available at current node (if specified)
  const availableAtCurrentNode = useMemo(() => {
    if (!currentNodeId) return [];
    return getAvailableVariablesAtNode(currentNodeId, nodes, edges);
  }, [currentNodeId, nodes, edges]);

  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    if (!searchTerm.trim()) return allVariables;
    
    const search = searchTerm.toLowerCase();
    return allVariables.filter(
      v =>
        v.name.toLowerCase().includes(search) ||
        v.description.toLowerCase().includes(search) ||
        v.sourceNodeName.toLowerCase().includes(search)
    );
  }, [allVariables, searchTerm]);

  // Group variables by source node
  const variablesByNode = useMemo(() => {
    const grouped = new Map<string, VariableInfo[]>();
    
    for (const variable of filteredVariables) {
      if (!grouped.has(variable.sourceNodeId)) {
        grouped.set(variable.sourceNodeId, []);
      }
      grouped.get(variable.sourceNodeId)!.push(variable);
    }
    
    return grouped;
  }, [filteredVariables]);

  // Handle copy to clipboard
  const handleCopyVariable = (variableName: string) => {
    navigator.clipboard.writeText(`{{${variableName}}}`);
    setCopiedVar(variableName);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  // Count runtime vs static
  const runtimeCount = Object.keys(runtimeVariables).length;
  const staticCount = allVariables.length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6">{t('variableInspector.title')}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Search */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('variableInspector.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>

        {/* Summary */}
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Box display="flex" gap={1} mb={1}>
            <Chip
              label={t('variableInspector.definedCount', { count: staticCount })}
              size="small"
              color="primary"
              variant="outlined"
            />
            {runtimeCount > 0 && (
              <Chip
                label={t('variableInspector.extractedCount', { count: runtimeCount })}
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>
          {currentNodeId && (
            <Typography variant="caption" color="text.secondary">
              {t('variableInspector.availableAtNode', { count: availableAtCurrentNode.length })}
            </Typography>
          )}
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {allVariables.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('variableInspector.noVariablesAlert')}
            </Alert>
          ) : null}

          {/* Runtime Variables Section */}
          {runtimeCount > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  {t('variableInspector.runtimeVariablesTitle')}
                  <Chip
                    label={runtimeCount}
                    size="small"
                    color="success"
                    sx={{ ml: 1, height: 20 }}
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  {t('variableInspector.runtimeVariablesDesc')}
                </Typography>
                <List dense>
                  {Object.entries(runtimeVariables).map(([name, value]) => (
                    <ListItem
                      key={name}
                      sx={{ bgcolor: 'success.light', mb: 0.5, borderRadius: 1 }}
                      secondaryAction={
                        <Tooltip title={copiedVar === name ? t('variableInspector.copied') : t('variableInspector.copyReference')}>
                          <IconButton
                            size="small"
                            onClick={() => handleCopyVariable(name)}
                            color={copiedVar === name ? 'success' : 'default'}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="bold">
                            {`{{${name}}}`}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" noWrap>
                            {t('variableInspector.valueLabel')} {String(value)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Static Variables Section - Grouped by Node */}
          <Accordion defaultExpanded={runtimeCount === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                {t('variableInspector.staticVariablesTitle')}
                <Chip
                  label={filteredVariables.length}
                  size="small"
                  color="primary"
                  sx={{ ml: 1, height: 20 }}
                />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                {t('variableInspector.staticVariablesDesc')}
              </Typography>

              {Array.from(variablesByNode.entries()).map(([nodeId, variables]) => {
                const node = nodes.find(n => n.id === nodeId);
                const nodeName = node?.data.name || nodeId;
                const isAvailableAtCurrent = currentNodeId
                  ? availableAtCurrentNode.some(v => v.sourceNodeId === nodeId)
                  : false;

                return (
                  <Box key={nodeId} sx={{ mb: 2 }}>
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      mb={1}
                      sx={{
                        bgcolor: isAvailableAtCurrent ? 'success.light' : 'background.default',
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" fontWeight="bold">
                        {nodeName}
                      </Typography>
                      {isAvailableAtCurrent && (
                        <Chip
                          label={t('variableInspector.availableChip')}
                          size="small"
                          color="success"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>

                    <List dense>
                      {variables.map((variable) => (
                        <ListItem
                          key={variable.name}
                          sx={{
                            bgcolor: 'background.paper',
                            mb: 0.5,
                            borderRadius: 1,
                            border: 1,
                            borderColor: 'divider',
                          }}
                          secondaryAction={
                            <Tooltip
                              title={copiedVar === variable.name ? t('variableInspector.copied') : t('variableInspector.copyReference')}
                            >
                              <IconButton
                                size="small"
                                onClick={() => handleCopyVariable(variable.name)}
                                color={copiedVar === variable.name ? 'success' : 'default'}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          }
                        >
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Typography variant="body2" fontWeight="bold">
                                  {`{{${variable.name}}}`}
                                </Typography>
                                <Chip
                                  label={variable.type}
                                  size="small"
                                  sx={{ height: 16, fontSize: '0.65rem' }}
                                />
                                {variable.required && (
                                  <Chip
                                    label={t('variableInspector.requiredChip')}
                                    size="small"
                                    color="warning"
                                    sx={{ height: 16, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption">{variable.description}</Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                );
              })}

              {filteredVariables.length === 0 && searchTerm && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  {t('variableInspector.noMatchesFound', { term: searchTerm })}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Help Section */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="caption" fontWeight="bold" display="block" mb={1}>
              {t('variableInspector.helpTitle')}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {t('variableInspector.helpText')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default VariableInspectorPanel;

