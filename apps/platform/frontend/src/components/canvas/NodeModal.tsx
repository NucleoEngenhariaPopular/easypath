import type { Node } from "@xyflow/react";
import type { CustomNodeData, ModelOptions, ExtractVarItem, PathwayExample } from "../../types/canvasTypes";
import type { FC } from "react";
import { Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Modal, Select, TextField, Typography, Paper, Grid } from "@mui/material";

interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNode: Node<CustomNodeData> | null;
  onNodeDataChange: (field: keyof CustomNodeData | `modelOptions.${keyof ModelOptions}` | `extractVars.${number}.${keyof ExtractVarItem}`, value: any) => void;
}

const NodeModal: FC<NodeModalProps> = ({
  isOpen,
  onClose,
  selectedNode,
  onNodeDataChange,
}) => {
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
    } else if (fieldName === 'temperature' || fieldName === 'newTemperature') {
      fieldValue = parseFloat(value);
      if (isNaN(fieldValue)) fieldValue = 0; // or handle error
    }
    // Special handling for nested properties
    onNodeDataChange(`modelOptions.${fieldName}` as `modelOptions.${keyof ModelOptions}`, fieldValue);
  };


  // Basic string representation for complex fields for now
  const handleComplexChange = (field: keyof CustomNodeData, value: string) => {
    try {
      onNodeDataChange(field, JSON.parse(value));
    } catch (e) {
      // Handle parse error, maybe set an error state or just update with raw string
      onNodeDataChange(field, value); // Or show an error to the user
      console.error("Error parsing JSON for complex field: ", e);
    }
  };


  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute' as 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 600, md: 700 }, // Responsive width
          maxHeight: '90vh',
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: { xs: 2, sm: 3, md: 4 },
        }}>

        <Typography variant="h6" component="h2" gutterBottom>
          Edit Node: {selectedNode.data.name || selectedNode.id}
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Node Name"
              name="name"
              fullWidth
              margin="normal"
              value={selectedNode.data.name || ""}
              onChange={handleSimpleChange}
            />
          </Grid>

          {/* Common fields for 'normal' (Default) and 'request' nodes */}
          {(selectedNode.type === 'normal' || selectedNode.type === 'request' || selectedNode.type === 'EndCall') && (
            <>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Prompt (Instructions for AI)"
                  name="prompt"
                  fullWidth
                  margin="normal"
                  multiline
                  rows={4}
                  value={selectedNode.data.prompt || ''}
                  onChange={handleSimpleChange}
                  helperText="Main instructions for this node."
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Static Text (If any, overrides prompt for speech)"
                  name="text"
                  fullWidth
                  margin="normal"
                  multiline
                  rows={2}
                  value={selectedNode.data.text || ''}
                  onChange={handleSimpleChange}
                  helperText="If provided, this exact text will be spoken."
                />
              </Grid>
            </>
          )}

          {selectedNode.type === 'request' && (
            <>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Request URL"
                  name="url"
                  fullWidth
                  margin="normal"
                  value={selectedNode.data.url || ''}
                  onChange={handleSimpleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Method</InputLabel>
                  <Select
                    name="method"
                    value={selectedNode.data.method || 'GET'}
                    label="Method"
                    onChange={(e) => onNodeDataChange('method', e.target.value)}
                  >
                    <MenuItem value="GET">GET</MenuItem>
                    <MenuItem value="POST">POST</MenuItem>
                    <MenuItem value="PUT">PUT</MenuItem>
                    <MenuItem value="DELETE">DELETE</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Model Options - for 'normal'/'Default', 'request', 'EndCall' etc. */}
          {(selectedNode.type === 'normal' || selectedNode.type === 'request' || selectedNode.type === 'EndCall') && (
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Model Options</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                      label="Model Type"
                      name="modelType"
                      fullWidth
                      margin="dense"
                      value={selectedNode.data.modelOptions?.modelType || 'smart'}
                      onChange={handleModelOptionsChange}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                      label="Temperature"
                      name="temperature"
                      type="number"
                      fullWidth
                      margin="dense"
                      inputProps={{ step: "0.1" }}
                      value={selectedNode.data.modelOptions?.temperature ?? 0.2}
                      onChange={handleModelOptionsChange}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField
                      label="New Temp (override)"
                      name="newTemperature"
                      type="number"
                      fullWidth
                      margin="dense"
                      inputProps={{ step: "0.1" }}
                      value={selectedNode.data.modelOptions?.newTemperature ?? ''} // Use ?? for optional field
                      onChange={handleModelOptionsChange}
                      helperText="Optional override"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <FormControlLabel
                      control={<Checkbox name="isSMSReturnNode" checked={selectedNode.data.modelOptions?.isSMSReturnNode || false} onChange={handleModelOptionsChange} />}
                      label="SMS Return Node"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <FormControlLabel
                      control={<Checkbox name="skipUserResponse" checked={selectedNode.data.modelOptions?.skipUserResponse || false} onChange={handleModelOptionsChange} />}
                      label="Skip User Response"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <FormControlLabel
                      control={<Checkbox name="disableEndCallTool" checked={selectedNode.data.modelOptions?.disableEndCallTool || false} onChange={handleModelOptionsChange} />}
                      label="Disable EndCall Tool"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <FormControlLabel
                      control={<Checkbox name="block_interruptions" checked={selectedNode.data.modelOptions?.block_interruptions || false} onChange={handleModelOptionsChange} />}
                      label="Block Interruptions"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <FormControlLabel
                      control={<Checkbox name="disableSilenceRepeat" checked={selectedNode.data.modelOptions?.disableSilenceRepeat || false} onChange={handleModelOptionsChange} />}
                      label="Disable Silence Repeat"
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <FormControlLabel
                      control={<Checkbox name="conditionOverridesGlobalPathway" checked={selectedNode.data.modelOptions?.conditionOverridesGlobalPathway || false} onChange={handleModelOptionsChange} />}
                      label="Condition Overrides Pathway"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* Condition */}
          {(selectedNode.type === 'normal' || selectedNode.type === 'request') && (
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Condition (Textual description)"
                name="condition"
                fullWidth
                margin="normal"
                multiline
                rows={3}
                value={selectedNode.data.condition || ''}
                onChange={handleSimpleChange}
                helperText="When this node should be activated/evaluated."
              />
            </Grid>
          )}

          {/* Placeholder for ExtractVars - Requires a more complex UI */}
          {(selectedNode.type === 'normal' || selectedNode.type === 'request') && (
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                <Typography variant="subtitle1" gutterBottom>Extract Variables</Typography>
                <TextField
                  label="ExtractVars (JSON Array)"
                  name="extractVars"
                  fullWidth
                  margin="dense"
                  multiline
                  rows={3}
                  value={selectedNode.data.extractVars ? JSON.stringify(selectedNode.data.extractVars, null, 2) : '[]'}
                  onChange={(e) => handleComplexChange('extractVars', e.target.value)}
                  helperText="Edit as JSON. E.g., [{ varName: 'name', varType: 'string', description: 'User name' }]"
                />
                {/* Ideally, this would be a dynamic list of inputs for each var */}
              </Paper>
            </Grid>
          )}

          {/* Placeholder for ExtractVarSettings */}
          {(selectedNode.type === 'normal' || selectedNode.type === 'request') && (
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                <Typography variant="subtitle1" gutterBottom>Extract Variable Settings</Typography>
                <TextField
                  label="ExtractVarSettings (JSON Object)"
                  name="extractVarSettings"
                  fullWidth
                  margin="dense"
                  multiline
                  rows={2}
                  value={selectedNode.data.extractVarSettings ? JSON.stringify(selectedNode.data.extractVarSettings, null, 2) : '{}'}
                  onChange={(e) => handleComplexChange('extractVarSettings', e.target.value)}
                  helperText="Edit as JSON. E.g., { setting: 'value' }"
                />
              </Paper>
            </Grid>
          )}


          {/* Placeholder for PathwayExamples - Requires a more complex UI */}
          {(selectedNode.type === 'normal' || selectedNode.type === 'request') && (
            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Pathway Examples</Typography>
                <TextField
                  label="PathwayExamples (JSON Array)"
                  name="pathwayExamples"
                  fullWidth
                  margin="dense"
                  multiline
                  rows={3}
                  value={selectedNode.data.pathwayExamples ? JSON.stringify(selectedNode.data.pathwayExamples, null, 2) : '[]'}
                  onChange={(e) => handleComplexChange('pathwayExamples', e.target.value)}
                  helperText="Edit as JSON. Complex structure, see type definition."
                />
              </Paper>
            </Grid>
          )}

        </Grid>

        <Button variant="contained" color="primary" onClick={onClose} sx={{ mt: 3 }}>
          Done
        </Button>
      </Box>
    </Modal>
  )
}

export default NodeModal;
