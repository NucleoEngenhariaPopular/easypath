// src/components/canvas/NodeModal.tsx
import { Close as CloseIcon, Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  Box, Button, Checkbox, FormControl, FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem, Modal,
  Paper,
  Select,
  Switch,
  TextField, Typography
} from "@mui/material";
import type { Node } from "@xyflow/react";
import type { FC } from "react";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomNodeData, ExtractVarItem, ModelOptions, PromptData } from "../../types/canvasTypes";

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node<CustomNodeData> | null;
  onNodeDataChange: (field: keyof CustomNodeData | `modelOptions.${keyof ModelOptions}` | `extractVars.${number}.${keyof ExtractVarItem}`, value: any) => void;
}

type InputMode = 'prompt' | 'staticText';

const NODE_TYPES = [
  { value: 'start', label: 'Start' },
  { value: 'normal', label: 'Normal' },
  { value: 'message', label: 'Message' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'validation', label: 'Validation' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'summary', label: 'Summary' },
  { value: 'request', label: 'Request' },
  { value: 'end', label: 'End' },
];

const VARIABLE_TYPES = ['string', 'int', 'float', 'boolean', 'datetime', 'array', 'object'];

const NodeModal: FC<NodeModalProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onNodeDataChange,
}) => {
  const { t } = useTranslation();
  const [inputMode, setInputMode] = useState<InputMode>('prompt');
  const [customPromptFields, setCustomPromptFields] = useState<Array<{ key: string; value: string }>>([]);

  useEffect(() => {
    if (selectedNode?.data) {
      if (selectedNode.data.prompt) {
        setInputMode('prompt');
        // Load custom fields from prompt data
        if (selectedNode.data.prompt.custom_fields) {
          const fields = Object.entries(selectedNode.data.prompt.custom_fields).map(([key, value]) => ({
            key,
            value: value as string,
          }));
          setCustomPromptFields(fields);
        }
      } else if (selectedNode.data.text) {
        setInputMode('staticText');
      } else {
        setInputMode('prompt');
      }
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

  const handleInputModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputMode(event.target.checked ? 'staticText' : 'prompt');
  };

  const isRequestNode = selectedNode.type === 'request';

  // Determine which fields to show based on node type
  const contentNodeTypes = ['normal', 'message', 'request', 'extraction', 'validation', 'recommendation', 'summary'];
  const showContentFields = contentNodeTypes.includes(selectedNode.type || '');

  const advancedNodeTypes = ['normal', 'message', 'request', 'extraction', 'validation', 'recommendation', 'summary'];
  const showAdvancedFields = advancedNodeTypes.includes(selectedNode.type || '');

  const extractionNodeTypes = ['extraction', 'validation'];
  const showExtractionFields = extractionNodeTypes.includes(selectedNode.type || '');

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
      <Box
        sx={{
          position: 'relative',
          width: { xs: '95%', sm: 650, md: 800 },
          maxWidth: '95vw',
          minWidth: { xs: '95%', sm: 500 },
          maxHeight: '90vh',
          minHeight: '400px',
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 4,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          resize: 'both',
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        }}>

        {/* Header */}
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}>
          <Box>
            <Typography variant="h5" component="h2" fontWeight="700" sx={{ mb: 0.5 }}>
              Edit Node
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {selectedNode.data.name || selectedNode.id}
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

        <Box sx={{ p: 4 }}>
          {/* Basic Information */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{
                width: 4,
                height: 24,
                bgcolor: 'primary.main',
                borderRadius: 1,
                mr: 1.5
              }} />
              <Typography variant="h6" fontWeight="600" color="text.primary">
                Basic Information
              </Typography>
            </Box>
            <TextField
              label="Node Name"
              name="name"
              fullWidth
              value={selectedNode.data.name || ""}
              onChange={handleSimpleChange}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
              helperText="This is the display name shown on the canvas"
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Node Type</InputLabel>
              <Select
                value={selectedNode.type || 'normal'}
                label="Node Type"
                onChange={(e) => onNodeDataChange('nodeType', e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {NODE_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Content Section */}
          {showContentFields && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{
                  width: 4,
                  height: 24,
                  bgcolor: 'primary.main',
                  borderRadius: 1,
                  mr: 1.5
                }} />
                <Typography variant="h6" fontWeight="600" color="text.primary">
                  Prompt Configuration
                </Typography>
              </Box>

              <TextField
                label="Context"
                fullWidth
                multiline
                rows={3}
                value={selectedNode.data.prompt?.context || ''}
                onChange={(e) => handlePromptFieldChange('context', e.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiInputBase-root': {
                    resize: 'vertical',
                    overflow: 'auto',
                  }
                }}
                helperText="What's happening at this step in the conversation flow"
              />

              <TextField
                label="Objective"
                fullWidth
                multiline
                rows={3}
                value={selectedNode.data.prompt?.objective || ''}
                onChange={(e) => handlePromptFieldChange('objective', e.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiInputBase-root': {
                    resize: 'vertical',
                    overflow: 'auto',
                  }
                }}
                helperText="What should the LLM accomplish at this node"
              />

              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={2}
                value={selectedNode.data.prompt?.notes || ''}
                onChange={(e) => handlePromptFieldChange('notes', e.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiInputBase-root': {
                    resize: 'vertical',
                    overflow: 'auto',
                  }
                }}
                helperText="Important considerations, tone, style guidelines"
              />

              <TextField
                label="Examples"
                fullWidth
                multiline
                rows={3}
                value={selectedNode.data.prompt?.examples || ''}
                onChange={(e) => handlePromptFieldChange('examples', e.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiInputBase-root': {
                    resize: 'vertical',
                    overflow: 'auto',
                  }
                }}
                helperText="Sample responses or example outputs"
              />

              {/* Custom Fields */}
              {customPromptFields.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Custom Fields
                  </Typography>
                  {customPromptFields.map((field, index) => (
                    <Box key={index} sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField
                        label="Field Name"
                        value={field.key}
                        onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                        sx={{ flex: '0 0 200px' }}
                      />
                      <TextField
                        label="Field Value"
                        multiline
                        rows={2}
                        value={field.value}
                        onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                        sx={{
                          flex: 1,
                          '& .MuiInputBase-root': {
                            resize: 'vertical',
                            overflow: 'auto',
                          }
                        }}
                      />
                      <IconButton
                        onClick={() => handleRemoveCustomField(index)}
                        color="error"
                        sx={{ mt: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddCustomField}
                sx={{ borderRadius: 2 }}
              >
                Add Custom Field
              </Button>
            </Box>
          )}

          {/* Request Configuration */}
          {isRequestNode && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="500">
                {t('nodeModal.requestConfigurationTitle')}
              </Typography>
              <Grid container spacing={2}>
                <Grid sx={{ xs: 12, md: 8 }} >
                  <TextField
                    label={t('nodeModal.requestUrlLabel')}
                    name="url"
                    fullWidth
                    value={selectedNode.data.url || ''}
                    onChange={handleSimpleChange}
                  />
                </Grid>
                <Grid sx={{ xs: 12, md: 4 }} >
                  <FormControl fullWidth>
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
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{
                  width: 4,
                  height: 24,
                  bgcolor: 'secondary.main',
                  borderRadius: 1,
                  mr: 1.5
                }} />
                <Typography variant="h6" fontWeight="600" color="text.primary">
                  Loop Condition
                </Typography>
              </Box>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedNode.data.loopEnabled || false}
                      onChange={(e) => onNodeDataChange('loopEnabled', e.target.checked)}
                    />
                  }
                  label="Enable Loop Condition"
                  sx={{ mb: 2 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Define the condition in which the model should loop back or move to the next node
                </Typography>
                {selectedNode.data.loopEnabled && (
                  <TextField
                    label="Loop Condition"
                    name="condition"
                    fullWidth
                    multiline
                    rows={3}
                    value={selectedNode.data.condition || ''}
                    onChange={handleSimpleChange}
                    sx={{
                      '& .MuiInputBase-root': {
                        resize: 'vertical',
                        overflow: 'auto',
                      }
                    }}
                    helperText="Describe when this node should loop or continue"
                  />
                )}
              </Paper>
            </Box>
          )}

          {/* Variable Extraction */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{
                  width: 4,
                  height: 24,
                  bgcolor: 'warning.main',
                  borderRadius: 1,
                  mr: 1.5
                }} />
                <Typography variant="h6" fontWeight="600" color="text.primary">
                  Variable Extraction
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddVariable}
                size="small"
                sx={{ borderRadius: 2 }}
              >
                Add Variable
              </Button>
            </Box>

            <Paper variant="outlined" sx={{
              p: 3,
              bgcolor: showExtractionFields ? 'warning.lighter' : 'background.paper',
              borderRadius: 2,
              borderColor: showExtractionFields ? 'warning.main' : 'divider',
              borderWidth: showExtractionFields ? 2 : 1,
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Define variables to extract from user messages at this node.
              </Typography>

              {(selectedNode.data.extractVars || []).length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {(selectedNode.data.extractVars || []).map((variable, index) => (
                    <Paper
                      key={index}
                      elevation={2}
                      sx={{
                        p: 3,
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        position: 'relative'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight="600">
                          Variable {index + 1}
                        </Typography>
                        <IconButton
                          onClick={() => handleRemoveVariable(index)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <TextField
                            label="Variable Name"
                            value={variable.name}
                            onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                            placeholder="e.g., user_email"
                            size="small"
                            sx={{ flex: 1 }}
                          />
                          <FormControl size="small" sx={{ minWidth: 140 }}>
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
                        </Box>

                        <TextField
                          label="Description"
                          fullWidth
                          multiline
                          rows={3}
                          value={variable.description}
                          onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                          size="small"
                          sx={{
                            '& .MuiInputBase-root': {
                              resize: 'vertical',
                              overflow: 'auto',
                            }
                          }}
                          placeholder="Describe what this variable represents and how to extract it"
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
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Box sx={{
                  py: 4,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  border: '2px dashed',
                  borderColor: 'divider'
                }}>
                  <Typography variant="body2" color="text.secondary">
                    No variables defined yet. Click "Add Variable" to get started.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>

          {/* Advanced Options */}
          {showAdvancedFields && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{
                  width: 4,
                  height: 24,
                  bgcolor: 'info.main',
                  borderRadius: 1,
                  mr: 1.5
                }} />
                <Typography variant="h6" fontWeight="600" color="text.primary">
                  Advanced Options
                </Typography>
              </Box>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: 'divider' }}>
                <TextField
                  label="Temperature"
                  name="temperature"
                  type="number"
                  fullWidth
                  inputProps={{ step: "0.1", min: "0", max: "2" }}
                  value={selectedNode.data.modelOptions?.temperature ?? 0.2}
                  onChange={handleModelOptionsChange}
                  helperText="Controls randomness in LLM responses (0 = deterministic, 2 = very creative)"
                  sx={{ maxWidth: 300 }}
                />
              </Paper>
            </Box>
          )}

          {/* Footer Actions */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            pt: 3,
            mt: 3,
            borderTop: '2px solid',
            borderColor: 'divider'
          }}>
            <Typography variant="caption" color="text.secondary">
              Changes are saved automatically
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={onClose}
                sx={{ borderRadius: 2 }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={onClose}
                sx={{
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                }}
              >
                Done
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Modal >
  );
};

export default NodeModal;
