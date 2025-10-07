// src/components/canvas/NodeModal.tsx
import { Close as CloseIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import type { CustomNodeData, ExtractVarItem, ModelOptions } from "../../types/canvasTypes";

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node<CustomNodeData> | null;
  onNodeDataChange: (field: keyof CustomNodeData | `modelOptions.${keyof ModelOptions}` | `extractVars.${number}.${keyof ExtractVarItem}`, value: any) => void;
}

type InputMode = 'prompt' | 'staticText';

const NodeModal: FC<NodeModalProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onNodeDataChange,
}) => {
  const { t } = useTranslation();
  const [inputMode, setInputMode] = useState<InputMode>('prompt');

  useEffect(() => {
    if (selectedNode?.data) {
      if (selectedNode.data.prompt) {
        setInputMode('prompt');
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

  const handleModelOptionsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const fieldName = name as keyof ModelOptions;
    let fieldValue: string | number | boolean = value;

    if (type === 'checkbox') {
      fieldValue = (e.target as HTMLInputElement).checked;
    } else if (fieldName === 'temperature') {
      fieldValue = parseFloat(value);
      if (isNaN(fieldValue)) fieldValue = selectedNode.data.modelOptions?.[fieldName] ?? 0.3;
    }
    onNodeDataChange(`modelOptions.${fieldName}` as `modelOptions.${keyof ModelOptions}`, fieldValue);
  };

  const handleComplexChange = (field: keyof CustomNodeData, value: string) => {
    try {
      onNodeDataChange(field, JSON.parse(value));
    } catch (e) {
      onNodeDataChange(field, value);
      console.error("Error parsing JSON for complex field: ", e);
    }
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
          maxHeight: '90vh',
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 4,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
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
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 2,
              py: 0.75,
              bgcolor: 'action.hover',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                Node Type:
              </Typography>
              <Typography variant="caption" fontWeight="600" color="primary.main">
                {selectedNode.type || 'unknown'}
              </Typography>
            </Box>
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
                  Content Configuration
                </Typography>
              </Box>

              <Box sx={{
                p: 2.5,
                mb: 3,
                bgcolor: 'primary.lighter',
                borderRadius: 2,
                borderLeft: '4px solid',
                borderColor: 'primary.main',
              }}>
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                  💡 <strong>Prompt Guide</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Tell the LLM what to do at this step.
                  {selectedNode.type === 'message' && ' For messages, describe how to interact with the user.'}
                  {selectedNode.type === 'extraction' && ' For extraction, explain what data to collect.'}
                  {selectedNode.type === 'validation' && ' For validation, describe what to verify.'}
                  {selectedNode.type === 'recommendation' && ' For recommendations, explain what to suggest.'}
                  {selectedNode.type === 'summary' && ' For summaries, describe what to include.'}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={<Switch checked={inputMode === 'staticText'} onChange={handleInputModeChange} />}
                  label={inputMode === 'staticText' ? t('nodeModal.staticTextLabel') : t('nodeModal.promptLabel')}
                />
              </Box>

              {inputMode === 'prompt' ? (
                <TextField
                  label={t('nodeModal.promptLabel')}
                  name="prompt"
                  fullWidth
                  multiline
                  rows={8}
                  value={selectedNode.data.prompt || ''}
                  onChange={handleSimpleChange}
                  helperText="Describe the context, objective, notes, and examples for the LLM at this step"
                  placeholder={`Context: [What's happening at this step]\nObjective: [What should the LLM accomplish]\nNotes: [Important considerations]\nExamples: [Sample responses]`}
                />
              ) : (
                <TextField
                  label={t('nodeModal.staticTextLabel')}
                  name="text"
                  fullWidth
                  multiline
                  rows={6}
                  value={selectedNode.data.text || ''}
                  onChange={handleSimpleChange}
                  helperText={t('nodeModal.staticTextHelperText')}
                />
              )}
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

          {/* Model Options */}
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
                  Model Configuration
                </Typography>
              </Box>
              <Paper variant="outlined" sx={{
                p: 3,
                borderRadius: 2,
                borderColor: 'divider',
              }}>
                <Grid container spacing={3}>
                  <Grid sx={{ xs: 12, sm: 6 }} >
                    <TextField
                      label={t('nodeModal.modelTypeLabel')}
                      name="modelType"
                      fullWidth
                      value={selectedNode.data.modelOptions?.modelType || 'smart'}
                      onChange={handleModelOptionsChange}
                    />
                  </Grid>
                  <Grid sx={{ xs: 12, sm: 6 }} >
                    <TextField
                      label={t('nodeModal.temperatureLabel')}
                      name="temperature"
                      type="number"
                      fullWidth
                      inputProps={{ step: "0.1", min: "0", max: "2" }}
                      value={selectedNode.data.modelOptions?.temperature ?? 0.2}
                      onChange={handleModelOptionsChange}
                    />
                  </Grid>
                  <Grid sx={{ xs: 12, sm: 6 }} >
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="skipUserResponse"
                          checked={selectedNode.data.modelOptions?.skipUserResponse || false}
                          onChange={handleModelOptionsChange}
                        />
                      }
                      label={t('nodeModal.skipUserResponseLabel')}
                    />
                  </Grid>
                  <Grid sx={{ xs: 12, sm: 6 }} >
                    <FormControlLabel
                      control={
                        <Checkbox
                          name="conditionOverridesGlobalPathway"
                          checked={selectedNode.data.modelOptions?.conditionOverridesGlobalPathway || false}
                          onChange={handleModelOptionsChange}
                        />
                      }
                      label={t('nodeModal.conditionOverridesPathwayLabel')}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}

          {/* Condition */}
          {showAdvancedFields && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="500">
                {t('nodeModal.conditionSectionTitle')}
              </Typography>
              <TextField
                label={t('nodeModal.conditionLabel')}
                name="condition"
                fullWidth
                multiline
                rows={3}
                value={selectedNode.data.condition || ''}
                onChange={handleSimpleChange}
                helperText={t('nodeModal.conditionHelperText')}
              />
            </Box>
          )}

          {/* Variable Extraction - Highlighted for extraction/validation nodes */}
          {showExtractionFields && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
              <Paper variant="outlined" sx={{
                p: 3,
                bgcolor: 'warning.lighter',
                borderRadius: 2,
                borderColor: 'warning.main',
                borderWidth: 2,
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Define variables to extract from user messages. Use JSON format with name, description, and required fields.
                </Typography>
                <TextField
                  label="Extract Variables (JSON)"
                  name="extractVars"
                  fullWidth
                  multiline
                  rows={8}
                  value={selectedNode.data.extractVars ? JSON.stringify(selectedNode.data.extractVars, null, 2) : '[]'}
                  onChange={(e) => handleComplexChange('extractVars', e.target.value)}
                  helperText='Example: [{"varName": "user_street", "varType": "string", "description": "Street name", "defaultValue": ""}]'
                />
              </Paper>
            </Box>
          )}

          {/* Advanced Configuration - Using Accordions */}
          {showAdvancedFields && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{
                  width: 4,
                  height: 24,
                  bgcolor: 'secondary.main',
                  borderRadius: 1,
                  mr: 1.5
                }} />
                <Typography variant="h6" fontWeight="600" color="text.primary">
                  Advanced Configuration
                </Typography>
              </Box>

              {!showExtractionFields && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">{t('nodeModal.extractVarsTitle')}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      label={t('nodeModal.extractVarsJsonLabel')}
                      name="extractVars"
                      fullWidth
                      multiline
                      rows={4}
                      value={selectedNode.data.extractVars ? JSON.stringify(selectedNode.data.extractVars, null, 2) : '[]'}
                      onChange={(e) => handleComplexChange('extractVars', e.target.value)}
                      helperText={t('nodeModal.extractVarsHelper')}
                    />
                  </AccordionDetails>
                </Accordion>
              )}

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">{t('nodeModal.pathwayExamplesTitle')}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    label={t('nodeModal.pathwayExamplesJsonLabel')}
                    name="pathwayExamples"
                    fullWidth
                    multiline
                    rows={4}
                    value={selectedNode.data.pathwayExamples ? JSON.stringify(selectedNode.data.pathwayExamples, null, 2) : '[]'}
                    onChange={(e) => handleComplexChange('pathwayExamples', e.target.value)}
                    helperText={t('nodeModal.pathwayExamplesHelper')}
                  />
                </AccordionDetails>
              </Accordion>
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
