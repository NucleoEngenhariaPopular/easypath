// src/components/canvas/NodeModal.tsx
import { Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon, ContentCopy as ContentCopyIcon } from "@mui/icons-material";
import type { Node, Edge } from "@xyflow/react";
import type { FC, ReactNode } from "react";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomNodeData, ExtractVarItem, ModelOptions, PromptData } from "../../types/canvasTypes";
import VariableAutocomplete from './VariableAutocomplete';
import { getAvailableVariablesAtNode } from '../../utils/flowAnalyzer';

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node<CustomNodeData> | null;
  onNodeDataChange: (field: keyof CustomNodeData | `modelOptions.${keyof ModelOptions}` | `extractVars.${number}.${keyof ExtractVarItem}`, value: any) => void;
  onNodeDelete: (nodeId: string) => void;
  allNodes?: Node<CustomNodeData>[];
  allEdges?: Edge[];
}

const NODE_TYPES = [
  { value: 'start', label: 'Start' },
  { value: 'normal', label: 'Normal' },
  { value: 'message', label: 'Message' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'validation', label: 'Validation' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'summary', label: 'Summary' },
  { value: 'request', label: 'Request' },
  { value: 'global', label: 'Global' },
  { value: 'end', label: 'End' },
];

const VARIABLE_TYPES = ['string', 'int', 'float', 'boolean', 'datetime', 'array', 'object'];

const SectionTitle = ({ title, helper }: { title: ReactNode; helper?: ReactNode }) => (
  <Stack spacing={helper ? 0.5 : 0} mb={helper ? 2.5 : 2}>
    <Box sx={{ typography: 'subtitle1', fontWeight: 600 }} component="div">
      {title}
    </Box>
    {helper ? (
      <Typography variant="body2" color="text.secondary" component="div">
        {helper}
      </Typography>
    ) : null}
  </Stack>
);

const NodeModal: FC<NodeModalProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onNodeDataChange,
  onNodeDelete,
  allNodes = [],
  allEdges = [],
}) => {
  const { t } = useTranslation();
  const [customPromptFields, setCustomPromptFields] = useState<Array<{ key: string; value: string }>>([]);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Get available variables for this node
  const availableVariables = selectedNode
    ? getAvailableVariablesAtNode(selectedNode.id, allNodes, allEdges)
    : [];

  // Handle copy variable to clipboard
  const handleCopyVariable = (variableName: string) => {
    navigator.clipboard.writeText(`{{${variableName}}}`);
    setCopiedVar(variableName);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  useEffect(() => {
    if (selectedNode?.data?.prompt?.custom_fields) {
      const fields = Object.entries(selectedNode.data.prompt.custom_fields).map(([key, value]) => ({
        key,
        value: value as string,
      }));
      setCustomPromptFields(fields);
    } else {
      setCustomPromptFields([]);
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return null;
  }

  const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      onNodeDataChange(name as keyof CustomNodeData, (e.target as HTMLInputElement).checked);
    } else {
      onNodeDataChange(name as keyof CustomNodeData, value);
    }
  };

  const handlePromptFieldChange = (field: keyof PromptData, value: string) => {
    const currentPrompt = selectedNode.data.prompt || { context: '', objective: '', notes: '', examples: '', custom_fields: {} };
    onNodeDataChange('prompt', { ...currentPrompt, [field]: value });
  };

  const handleAddCustomField = () => {
    setCustomPromptFields([...customPromptFields, { key: '', value: '' }]);
  };

  const handleCustomFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...customPromptFields];
    newFields[index][field] = value;
    setCustomPromptFields(newFields);

    // Update the prompt data
    const customFieldsObj = newFields.reduce((acc, f) => {
      if (f.key) acc[f.key] = f.value;
      return acc;
    }, {} as Record<string, string>);

    const currentPrompt = selectedNode.data.prompt || { context: '', objective: '', notes: '', examples: '', custom_fields: {} };
    onNodeDataChange('prompt', { ...currentPrompt, custom_fields: customFieldsObj });
  };

  const handleRemoveCustomField = (index: number) => {
    const newFields = customPromptFields.filter((_, i) => i !== index);
    setCustomPromptFields(newFields);

    // Update the prompt data
    const customFieldsObj = newFields.reduce((acc, f) => {
      if (f.key) acc[f.key] = f.value;
      return acc;
    }, {} as Record<string, string>);

    const currentPrompt = selectedNode.data.prompt || { context: '', objective: '', notes: '', examples: '', custom_fields: {} };
    onNodeDataChange('prompt', { ...currentPrompt, custom_fields: customFieldsObj });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this node? All connected edges will also be removed.')) {
      onNodeDelete(selectedNode.id);
      onClose();
    }
  };

  const handleAddVariable = () => {
    const newVar: ExtractVarItem = { name: '', varType: 'string', description: '', required: true };
    const currentVars = selectedNode.data.extractVars || [];
    onNodeDataChange('extractVars', [...currentVars, newVar]);
  };

  const handleVariableChange = (index: number, field: keyof ExtractVarItem, value: any) => {
    const currentVars = selectedNode.data.extractVars || [];
    const newVars = [...currentVars];
    newVars[index] = { ...newVars[index], [field]: value };
    onNodeDataChange('extractVars', newVars);
  };

  const handleRemoveVariable = (index: number) => {
    const currentVars = selectedNode.data.extractVars || [];
    const newVars = currentVars.filter((_, i) => i !== index);
    onNodeDataChange('extractVars', newVars);
  };

  const handleModelOptionsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const fieldName = name as keyof ModelOptions;
    let fieldValue: string | number | boolean = value;

    if (type === 'checkbox') {
      fieldValue = (e.target as HTMLInputElement).checked;
    } else if (fieldName === 'temperature') {
      fieldValue = parseFloat(value);
      if (isNaN(fieldValue)) fieldValue = selectedNode.data.modelOptions?.[fieldName] ?? 0.2;
    }
    onNodeDataChange(`modelOptions.${fieldName}` as `modelOptions.${keyof ModelOptions}`, fieldValue);
  };

  const isRequestNode = selectedNode.type === 'request';

  // Determine which fields to show based on node type
  const contentNodeTypes = ['normal', 'message', 'request', 'extraction', 'validation', 'recommendation', 'summary'];
  const showContentFields = contentNodeTypes.includes(selectedNode.type || '');

  const advancedNodeTypes = ['normal', 'message', 'request', 'extraction', 'validation', 'recommendation', 'summary'];
  const showAdvancedFields = advancedNodeTypes.includes(selectedNode.type || '');

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper
        sx={{
          position: 'relative',
          width: { xs: '96%', sm: 640, md: 780 },
          maxWidth: '95vw',
          minWidth: { xs: '96%', sm: 520 },
          minHeight: 400,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 28px 60px rgba(15, 23, 42, 0.22)',
          bgcolor: 'background.paper',
          resize: 'both',
          overflow: 'hidden',
        }}>

        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 3, md: 4 },
            py: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h6" component="h2" fontWeight={600}>
              Edit Node
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedNode.data.name || selectedNode.id}
            </Typography>
          </Stack>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: { xs: 3, md: 4 },
            py: { xs: 3, md: 4 },
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#b0b8c4',
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#8b96a6',
            },
          }}
        >
          {/* Basic Information */}
          <Box component="section">
            <SectionTitle
              title="Basic Information"
              helper="Set the fundamentals for how this node appears on the canvas."
            />
            <Stack spacing={2}>
              <TextField
                label="Node Name"
                name="name"
                fullWidth
                size="small"
                value={selectedNode.data.name || ""}
                onChange={handleSimpleChange}
                helperText="Display name shown on the canvas."
              />
              <TextField
                label="Node ID"
                name="nodeId"
                fullWidth
                size="small"
                value={selectedNode.id || ""}
                onChange={handleSimpleChange}
                helperText="Unique identifier for this node (updating it will rewrite existing connections)."
              />
              <FormControl fullWidth size="small">
                <InputLabel>Node Type</InputLabel>
                <Select
                  value={selectedNode.type || 'normal'}
                  label="Node Type"
                  onChange={(e) => onNodeDataChange('nodeType', e.target.value)}
                >
                  {NODE_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {/* Prompt Configuration */}
          {showContentFields && (
            <Box component="section">
              <SectionTitle
                title="Prompt Configuration"
                helper="Shape the instructions the model will receive at this step."
              />
              <Stack spacing={2}>
                <VariableAutocomplete
                  label="Context"
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={12}
                  value={selectedNode.data.prompt?.context || ''}
                  onChange={(value) => handlePromptFieldChange('context', value)}
                  availableVariables={availableVariables}
                  helperText="What's happening at this step in the conversation flow."
                />

                <VariableAutocomplete
                  label="Objective"
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={12}
                  value={selectedNode.data.prompt?.objective || ''}
                  onChange={(value) => handlePromptFieldChange('objective', value)}
                  availableVariables={availableVariables}
                  helperText="What should the LLM accomplish at this node."
                />

                <VariableAutocomplete
                  label="Notes"
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={10}
                  value={selectedNode.data.prompt?.notes || ''}
                  onChange={(value) => handlePromptFieldChange('notes', value)}
                  availableVariables={availableVariables}
                  helperText="Important considerations, tone, or style guidelines."
                />

                <VariableAutocomplete
                  label="Examples"
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={12}
                  value={selectedNode.data.prompt?.examples || ''}
                  onChange={(value) => handlePromptFieldChange('examples', value)}
                  availableVariables={availableVariables}
                  helperText="Sample responses or example outputs."
                />

                {customPromptFields.length > 0 && (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Custom Fields
                    </Typography>
                    <Stack spacing={1.5}>
                      {customPromptFields.map((field, index) => (
                        <Stack
                          key={`${field.key}-${index}`}
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          alignItems="flex-start"
                        >
                          <TextField
                            label="Field Name"
                            value={field.key}
                            onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                            size="small"
                            sx={{ flex: { xs: '1 1 auto', sm: '0 0 200px' } }}
                          />
                          <TextField
                            label="Field Value"
                            multiline
                            minRows={2}
                            maxRows={4}
                            value={field.value}
                            onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                            size="small"
                            sx={{ flex: 1 }}
                          />
                          <IconButton onClick={() => handleRemoveCustomField(index)} color="error" size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                )}

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddCustomField}
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Add Custom Field
                </Button>
              </Stack>
            </Box>
          )}

          {/* Request Configuration */}
          {isRequestNode && (
            <Box component="section">
              <SectionTitle
                title={t('nodeModal.requestConfigurationTitle')}
                helper="Define the request this node should perform."
              />
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    label={t('nodeModal.requestUrlLabel')}
                    name="url"
                    fullWidth
                    size="small"
                    value={selectedNode.data.url || ''}
                    onChange={handleSimpleChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('nodeModal.methodLabel')}</InputLabel>
                    <Select
                      name="method"
                      value={selectedNode.data.method || 'GET'}
                      label={t('nodeModal.methodLabel')}
                      onChange={(e) => onNodeDataChange('method', e.target.value)}
                    >
                      <MenuItem value="GET">GET</MenuItem>
                      <MenuItem value="POST">POST</MenuItem>
                      <MenuItem value="PUT">PUT</MenuItem>
                      <MenuItem value="DELETE">DELETE</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}


          {/* Loop Condition */}
          {showAdvancedFields && (
            <Box component="section">
              <SectionTitle
                title="Loop Condition"
                helper="Control whether this node repeats until a condition is met."
              />
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedNode.data.loopEnabled || false}
                      onChange={(e) => onNodeDataChange('loopEnabled', e.target.checked)}
                    />
                  }
                  label="Enable loop condition"
                  sx={{ mb: 2 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Define the condition in which the model should loop back or move to the next node.
                </Typography>
                {selectedNode.data.loopEnabled && (
                  <VariableAutocomplete
                    label="Loop Condition"
                    name="condition"
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={10}
                    value={selectedNode.data.condition || ''}
                    onChange={(value) => onNodeDataChange('condition', value)}
                    availableVariables={availableVariables}
                    helperText="Describe when this node should loop or continue."
                  />
                )}
              </Paper>
            </Box>
          )}

          {/* Global Node Configuration */}
          {selectedNode.type === 'global' && (
            <Box component="section">
              <SectionTitle
                title="Global Node Configuration"
                helper="Describe when this node should be triggered from anywhere in the flow."
              />
              <Paper
                variant="outlined"
                sx={{ p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Global nodes can be triggered from any point in the conversation flow based on specific conditions.
                </Typography>

                <TextField
                  label="Node Description"
                  name="nodeDescription"
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={6}
                  value={selectedNode.data.nodeDescription || ''}
                  onChange={handleSimpleChange}
                  helperText="Describe when this global node should be triggered."
                  placeholder="When should this node be activated?"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedNode.data.autoReturnToPrevious || false}
                      onChange={(e) => onNodeDataChange('autoReturnToPrevious', e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Automatically return to the previous node
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        When enabled, the flow returns to the previous node after responding. Disable it to define custom pathways.
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </Box>
          )}

          {/* Variable Extraction */}
          <Box component="section">
            <SectionTitle
              title="Variable Extraction"
              helper="Define the data points you want to capture while this node runs."
            />
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: (selectedNode.data.extractVars || []).length > 0 ? 3 : 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Specify variables to extract from user messages at this node.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddVariable}
                  size="small"
                >
                  Add Variable
                </Button>
              </Stack>

              {(selectedNode.data.extractVars || []).length > 0 ? (
                <Stack spacing={2.5}>
                  {(selectedNode.data.extractVars || []).map((variable, index) => (
                    <Paper
                      key={index}
                      variant="outlined"
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        position: 'relative',
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                      >
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                          Variable {index + 1}
                        </Typography>
                        <IconButton onClick={() => handleRemoveVariable(index)} color="error" size="small">
                          <DeleteIcon />
                        </IconButton>
                      </Stack>

                      <Stack spacing={2}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                          <TextField
                            label="Variable Name"
                            value={variable.name}
                            onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                            placeholder="e.g., user_email"
                            size="small"
                            fullWidth
                          />
                          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 160 } }}>
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={variable.varType}
                              label="Type"
                              onChange={(e) => handleVariableChange(index, 'varType', e.target.value)}
                            >
                              {VARIABLE_TYPES.map((type) => (
                                <MenuItem key={type} value={type}>
                                  {type}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Stack>

                        <TextField
                          label="Description"
                          fullWidth
                          multiline
                          minRows={3}
                          maxRows={5}
                          value={variable.description}
                          onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                          size="small"
                          placeholder="Describe what this variable represents and how to extract it."
                        />

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={variable.required}
                              onChange={(e) => handleVariableChange(index, 'required', e.target.checked)}
                            />
                          }
                          label="Required variable (must be extracted before moving forward)"
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    py: 4,
                    px: 3,
                    textAlign: 'center',
                    borderRadius: 2,
                    borderStyle: 'dashed',
                    borderColor: 'divider',
                    backgroundColor: 'background.default',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No variables defined yet. Use “Add Variable” to capture structured data.
                  </Typography>
                </Paper>
              )}
            </Paper>
          </Box>

          {/* Available Variables Section */}
          {showContentFields && availableVariables.length > 0 && (
            <Box component="section">
              <SectionTitle
                title={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <span>{t('nodeModal.availableVariablesTitle')}</span>
                    <Chip label={availableVariables.length} size="small" color="success" />
                  </Stack>
                }
                helper={t('nodeModal.availableVariablesDesc')}
              />
              <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      {t('nodeModal.viewAllVariables', { count: availableVariables.length })}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {availableVariables.map((variable) => (
                        <ListItem
                          key={variable.name}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            mb: 1,
                          }}
                          secondaryAction={
                            <Tooltip
                              title={
                                copiedVar === variable.name
                                  ? t('nodeModal.variableCopied')
                                  : t('nodeModal.copyVariable')
                              }
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
                              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                <Typography variant="body2" fontWeight="bold" component="span">
                                  {`{{${variable.name}}}`}
                                </Typography>
                                <Chip label={variable.type} size="small" sx={{ height: 20 }} />
                                {variable.required && (
                                  <Chip
                                    label={t('variableInspector.requiredChip')}
                                    size="small"
                                    color="warning"
                                    sx={{ height: 20 }}
                                  />
                                )}
                              </Stack>
                            }
                            secondary={
                              <Stack spacing={0.5}>
                                <Typography variant="caption" component="div">
                                  {variable.description}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" component="div">
                                  {t('variableInspector.sourceLabel')} {variable.sourceNodeName}
                                </Typography>
                              </Stack>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              </Paper>
            </Box>
          )}

          {/* Advanced Options */}
          {showAdvancedFields && (
            <Box component="section">
              <SectionTitle
                title="Advanced Options"
                helper="Fine-tune how the model behaves at this node."
              />
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <TextField
                  label="Temperature"
                  name="temperature"
                  type="number"
                  fullWidth
                  size="small"
                  inputProps={{ step: 0.1, min: 0, max: 2 }}
                  value={selectedNode.data.modelOptions?.temperature ?? 0.2}
                  onChange={handleModelOptionsChange}
                  helperText="Controls randomness in responses (0 = deterministic, 2 = very creative)."
                  sx={{ maxWidth: 280, mb: 3 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      name="skipUserResponse"
                      checked={selectedNode.data.modelOptions?.skipUserResponse || false}
                      onChange={handleModelOptionsChange}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Skip user response
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        When enabled, the flow automatically advances without waiting for the user.
                      </Typography>
                    </Box>
                  }
                />
              </Paper>
            </Box>
          )}

        </Box>

        <Divider />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            px: { xs: 3, md: 4 },
            py: 3,
            backgroundColor: 'background.paper',
          }}
        >
          <Button
            onClick={handleDelete}
            color="error"
            variant="outlined"
            startIcon={<DeleteIcon />}
            sx={{ borderRadius: 2 }}
          >
            Delete
          </Button>
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>
              Close
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onClose}
              sx={{ borderRadius: 2, boxShadow: 'none' }}
            >
              Done
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Modal>
  );
};

export default NodeModal;
