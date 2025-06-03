// src/components/canvas/NodeModal.tsx
import type { Node } from "@xyflow/react";
import type { CustomNodeData, ModelOptions, ExtractVarItem, PathwayExample } from "../../types/canvasTypes";
import type { FC } from "react";
import {
  Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel,
  MenuItem, Modal, Select, TextField, Typography, Paper, Grid, Switch,
  IconButton, Divider, Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import { Close as CloseIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

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
  const showContentFields = selectedNode.type === 'normal' || selectedNode.type === 'request' || selectedNode.type === 'EndCall';
  const showAdvancedFields = selectedNode.type === 'normal' || selectedNode.type === 'request';

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '95%', sm: 650, md: 750 },
          maxHeight: '95vh',
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 24,
        }}>

        {/* Header */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 3,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="h5" component="h2" fontWeight="600">
            {t('nodeModal.editNodeTitle', { nodeName: selectedNode.data.name || selectedNode.id })}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Basic Information */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom color="primary" fontWeight="500">
              {t('nodeModal.basicInformationTitle')}
            </Typography>
            <TextField
              label={t('nodeModal.nodeNameLabel')}
              name="name"
              fullWidth
              value={selectedNode.data.name || ""}
              onChange={handleSimpleChange}
              sx={{ mb: 2 }}
            />
          </Box>

          {/* Content Section */}
          {showContentFields && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="500">
                {t('nodeModal.contentTitle')}
              </Typography>

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
                  rows={6}
                  value={selectedNode.data.prompt || ''}
                  onChange={handleSimpleChange}
                  helperText={t('nodeModal.promptHelperText')}
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
              <Typography variant="h6" gutterBottom color="primary" fontWeight="500">
                {t('nodeModal.modelConfigurationTitle')}
              </Typography>
              <Paper variant="outlined" sx={{ p: 3 }}>
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

          {/* Advanced Configuration - Using Accordions */}
          {showAdvancedFields && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom color="primary" fontWeight="500">
                {t('nodeModal.advancedConfigurationTitle')}
              </Typography>

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
            justifyContent: 'flex-end',
            gap: 2,
            pt: 3,
            borderTop: '1px solid',
            borderColor: 'divider'
          }}>
            <Button variant="outlined" onClick={onClose}>
              {t('nodeModal.cancelButton')}
            </Button>
            <Button variant="contained" color="primary" onClick={onClose}>
              {t('nodeModal.doneButton')}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal >
  );
};

export default NodeModal;
