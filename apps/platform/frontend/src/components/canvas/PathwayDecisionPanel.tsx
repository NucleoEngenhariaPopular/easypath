import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  IconButton,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { type DecisionLog } from '../../hooks/useFlowWebSocket';

interface PathwayDecisionPanelProps {
  decisionLog: DecisionLog;
}

const PathwayDecisionPanel: React.FC<PathwayDecisionPanelProps> = ({ decisionLog }) => {
  const [expanded, setExpanded] = useState(true);

  const formatTime = (ms?: number) => {
    if (!ms) return 'N/A';
    return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  const formatCost = (cost?: number) => {
    if (!cost) return '$0.000000';
    return `$${cost.toFixed(6)}`;
  };

  return (
    <Paper
      sx={{
        mb: 2,
        border: '2px solid',
        borderColor: 'primary.main',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          backgroundColor: 'primary.lighter',
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'primary.light' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            PATHWAY DECISION INFO
          </Typography>
          <Chip
            label={new Date(decisionLog.timestamp).toLocaleTimeString()}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <IconButton size="small" sx={{ p: 0 }}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {/* Current Node */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
              ◎ Current Node:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              {decisionLog.nodeName || decisionLog.nodeId}
            </Typography>

            {decisionLog.nodePrompt && (
              <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.main', py: 1 }}>
                {decisionLog.nodePrompt.context && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      #context
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {decisionLog.nodePrompt.context}
                    </Typography>
                  </Box>
                )}
                {decisionLog.nodePrompt.objective && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      #objective
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {decisionLog.nodePrompt.objective}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Previous Node */}
          {decisionLog.previousNodeId && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  « Previous Node Name:
                </Typography>
                <Typography variant="body2">
                  {decisionLog.previousNodeName || decisionLog.previousNodeId}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Pathway Selection */}
          {decisionLog.availablePathways && decisionLog.availablePathways.length > 0 && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                  » Pathway Selection:
                </Typography>

                {/* Available Options */}
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Available Options:
                </Typography>
                <Box sx={{ pl: 2, mb: 1 }}>
                  {decisionLog.availablePathways.map((pathway, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        mb: 0.5,
                        p: 1,
                        backgroundColor: pathway.label === decisionLog.chosenPathway ? 'success.lighter' : 'action.hover',
                        borderRadius: 1,
                        border: pathway.label === decisionLog.chosenPathway ? '2px solid' : '1px solid',
                        borderColor: pathway.label === decisionLog.chosenPathway ? 'success.main' : 'divider',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: pathway.label === decisionLog.chosenPathway ? 600 : 400 }}>
                        • {pathway.label}
                        {pathway.label === decisionLog.chosenPathway && ' ✓'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
                        {pathway.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Chosen Pathway */}
                {decisionLog.chosenPathway && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Chosen:
                    </Typography>
                    <Chip label={decisionLog.chosenPathway} size="small" color="success" />
                  </Box>
                )}

                {/* Confidence */}
                {decisionLog.pathwayConfidence !== undefined && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Confidence:
                    </Typography>
                    <Typography variant="caption">
                      {decisionLog.pathwayConfidence.toFixed(1)}%
                    </Typography>
                  </Box>
                )}

                {/* LLM Reasoning */}
                {decisionLog.llmReasoning && (
                  <Box sx={{ mt: 1, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Reasoning:
                    </Typography>
                    <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                      "{decisionLog.llmReasoning}"
                    </Typography>
                  </Box>
                )}
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Variables Extracted */}
          {decisionLog.variablesExtracted && Object.keys(decisionLog.variablesExtracted).length > 0 && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                  ◉ Variables Extracted:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {Object.entries(decisionLog.variablesExtracted).map(([key, value]) => {
                    const wasExtracted = decisionLog.variablesStatus?.[key] !== false;
                    return (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        {wasExtracted ? (
                          <CheckCircleIcon fontSize="small" color="success" />
                        ) : (
                          <CancelIcon fontSize="small" color="error" />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {key}:
                        </Typography>
                        <Typography variant="body2">
                          {String(value)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Assistant Response */}
          {decisionLog.assistantResponse && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                  ◎ Assistant Response:
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: 'grey.800',
                    color: 'grey.100',
                    borderRadius: 1,
                    maxHeight: 150,
                    overflowY: 'auto',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {decisionLog.assistantResponse}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Performance Stats */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
              ⚡ Performance:
            </Typography>
            <Box sx={{ pl: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {decisionLog.timingMs && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Time:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatTime(decisionLog.timingMs)}
                  </Typography>
                </Box>
              )}
              {decisionLog.tokensUsed && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tokens:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {decisionLog.tokensUsed.toLocaleString()}
                  </Typography>
                </Box>
              )}
              {decisionLog.costUsd !== undefined && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Cost:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCost(decisionLog.costUsd)}
                  </Typography>
                </Box>
              )}
              {decisionLog.modelName && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Model:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {decisionLog.modelName}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default PathwayDecisionPanel;
