import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  Divider,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import PathwayDecisionPanel from './PathwayDecisionPanel';
import type { DecisionLog } from '../../hooks/useFlowWebSocket';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface TestModePanelProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  isConnected: boolean;
  messages: Message[];
  variables: Record<string, any>;
  currentNodeId: string | null;
  onSendMessage: (message: string) => void;
  onReset: () => void;
  isLoading?: boolean;
  lastMessageStats?: {
    responseTime: number;
    tokens: number;
    cost: number;
    pathwaySelection: {
      time: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
      model: string;
    };
    responseGeneration: {
      time: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
      model: string;
    };
  } | null;
  conversationStats?: {
    totalResponseTime: number;
    totalTokens: number;
    totalCost: number;
  };
  decisionLogs?: DecisionLog[];
}

const drawerWidth = 800;

// Typing indicator component with animated dots
const TypingIndicator: React.FC = () => {
  return (
    <Box
      sx={{
        mb: 2,
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      <Paper
        sx={{
          p: 1.5,
          backgroundColor: 'grey.800',
          display: 'flex',
          gap: 0.5,
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'grey.500',
            animation: 'bounce 1.4s infinite ease-in-out',
            animationDelay: '0s',
            '@keyframes bounce': {
              '0%, 80%, 100%': {
                transform: 'scale(0)',
                opacity: 0.5,
              },
              '40%': {
                transform: 'scale(1)',
                opacity: 1,
              },
            },
          }}
        />
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'grey.500',
            animation: 'bounce 1.4s infinite ease-in-out',
            animationDelay: '0.2s',
            '@keyframes bounce': {
              '0%, 80%, 100%': {
                transform: 'scale(0)',
                opacity: 0.5,
              },
              '40%': {
                transform: 'scale(1)',
                opacity: 1,
              },
            },
          }}
        />
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'grey.500',
            animation: 'bounce 1.4s infinite ease-in-out',
            animationDelay: '0.4s',
            '@keyframes bounce': {
              '0%, 80%, 100%': {
                transform: 'scale(0)',
                opacity: 0.5,
              },
              '40%': {
                transform: 'scale(1)',
                opacity: 1,
              },
            },
          }}
        />
      </Paper>
    </Box>
  );
};

const TestModePanel: React.FC<TestModePanelProps> = ({
  open,
  onClose,
  sessionId,
  isConnected,
  messages,
  variables,
  currentNodeId,
  onSendMessage,
  onReset,
  isLoading = false,
  lastMessageStats,
  conversationStats,
  decisionLogs = [],
}) => {
  const { t } = useTranslation();
  const [inputMessage, setInputMessage] = useState('');
  const [showStats, setShowStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'background.default',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t('testMode.title')}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Connection Status */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={isConnected ? t('testMode.connected') : t('testMode.disconnected')}
            color={isConnected ? 'success' : 'error'}
            size="small"
            sx={{ mr: 1 }}
          />
          <Chip
            label={`Session: ${sessionId.substring(0, 8)}...`}
            size="small"
            variant="outlined"
          />
        </Box>

        {/* Current Node */}
        {currentNodeId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('testMode.currentNode')}: <strong>{currentNodeId}</strong>
          </Alert>
        )}

        {/* Variables */}
        {Object.keys(variables).length > 0 && (
          <Paper sx={{ p: 2, mb: 2, backgroundColor: 'action.hover' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              {t('testMode.variables')}
            </Typography>
            {Object.entries(variables).map(([key, value]) => (
              <Box key={key} sx={{ mb: 0.5 }}>
                <Typography variant="caption" component="span" sx={{ fontWeight: 600 }}>
                  {key}:
                </Typography>{' '}
                <Typography variant="caption" component="span">
                  {String(value)}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}

        {/* Stats - Collapsible */}
        {(lastMessageStats || (conversationStats && conversationStats.totalTokens > 0)) && (
          <Paper sx={{ mb: 2, backgroundColor: 'action.hover' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1.5,
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.selected' },
              }}
              onClick={() => setShowStats(!showStats)}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Performance Stats
              </Typography>
              <IconButton size="small" sx={{ p: 0 }}>
                {showStats ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Box>

            {showStats && (
              <Box sx={{ px: 2, pb: 2 }}>
                {/* Last Message Stats */}
                {lastMessageStats && (
                  <Box sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                      Last Message Breakdown:
                    </Typography>

                    {/* Summary */}
                    <Box sx={{ mb: 1, p: 1, backgroundColor: 'background.paper', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" color="text.secondary">Total Time:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {lastMessageStats.responseTime.toFixed(2)}s
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption" color="text.secondary">Total Tokens:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {lastMessageStats.tokens.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Total Cost:</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          ${lastMessageStats.cost.toFixed(6)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Pathway Selection */}
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: 'primary.main' }}>
                        1. Pathway Selection ({lastMessageStats.pathwaySelection.model})
                      </Typography>
                      <Box sx={{ pl: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                          <Typography variant="caption" color="text.secondary">Time:</Typography>
                          <Typography variant="caption">{lastMessageStats.pathwaySelection.time.toFixed(2)}s</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                          <Typography variant="caption" color="text.secondary">Tokens:</Typography>
                          <Typography variant="caption">
                            {lastMessageStats.pathwaySelection.totalTokens.toLocaleString()}
                            <span style={{ opacity: 0.6 }}> ({lastMessageStats.pathwaySelection.inputTokens} in / {lastMessageStats.pathwaySelection.outputTokens} out)</span>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">Cost:</Typography>
                          <Typography variant="caption">${lastMessageStats.pathwaySelection.cost.toFixed(6)}</Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Response Generation */}
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5, color: 'success.main' }}>
                        2. Response Generation ({lastMessageStats.responseGeneration.model})
                      </Typography>
                      <Box sx={{ pl: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                          <Typography variant="caption" color="text.secondary">Time:</Typography>
                          <Typography variant="caption">{lastMessageStats.responseGeneration.time.toFixed(2)}s</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.2 }}>
                          <Typography variant="caption" color="text.secondary">Tokens:</Typography>
                          <Typography variant="caption">
                            {lastMessageStats.responseGeneration.totalTokens.toLocaleString()}
                            <span style={{ opacity: 0.6 }}> ({lastMessageStats.responseGeneration.inputTokens} in / {lastMessageStats.responseGeneration.outputTokens} out)</span>
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">Cost:</Typography>
                          <Typography variant="caption">${lastMessageStats.responseGeneration.cost.toFixed(6)}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Conversation Totals */}
                {conversationStats && conversationStats.totalTokens > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Conversation Total:
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="caption" color="text.secondary">Time:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {conversationStats.totalResponseTime.toFixed(2)}s
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="caption" color="text.secondary">Tokens:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {conversationStats.totalTokens.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Cost:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        ${conversationStats.totalCost.toFixed(6)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        )}

        {/* Main Content Area - Two Columns */}
        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden', mb: 2 }}>
          {/* Left Column - Decision Logs */}
          <Box sx={{ flex: '0 0 48%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Decision Logs
            </Typography>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
              {decisionLogs && decisionLogs.length > 0 ? (
                decisionLogs.map((log) => (
                  <PathwayDecisionPanel key={log.id} decisionLog={log} />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                  No decision logs yet
                </Typography>
              )}
            </Box>
          </Box>

          {/* Right Column - Messages */}
          <Box sx={{ flex: '0 0 48%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Chat Messages
            </Typography>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
          {messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              {t('testMode.noMessages')}
            </Typography>
          ) : (
            messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  mb: 2,
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    backgroundColor: msg.role === 'user' ? 'primary.main' : 'grey.800',
                    color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="body2">{msg.content}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, mt: 0.5, display: 'block' }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            ))
          )}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
            </Box>
          </Box>
        </Box>

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('testMode.inputPlaceholder')}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isConnected || isLoading}
            multiline
            maxRows={3}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!inputMessage.trim() || !isConnected || isLoading}
          >
            <SendIcon />
          </IconButton>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onReset}
            size="small"
          >
            {t('testMode.reset')}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default TestModePanel;
