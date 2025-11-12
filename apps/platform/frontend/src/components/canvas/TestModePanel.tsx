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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ChatIcon from '@mui/icons-material/Chat';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
import GroupIcon from '@mui/icons-material/Group';
import { useTranslation } from 'react-i18next';
import PathwayDecisionPanel from './PathwayDecisionPanel';
import DataCollectionTable from '../bot/DataCollectionTable';
import TestPersonaManager, { type TestPersona } from '../bot/TestPersonaManager';
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
  botId?: number; // Optional bot ID for viewing collected data
  flowId?: number; // Flow ID for creating test personas
  ownerId?: string; // Owner ID for creating test personas
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
    loopEvaluation: {
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

const DEFAULT_DRAWER_WIDTH = 1000;
const MIN_DRAWER_WIDTH = 400;
const MAX_DRAWER_WIDTH = 1600;

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
  botId,
  flowId,
  ownerId = 'user-123', // Default owner ID for test mode
}) => {
  const { t } = useTranslation();
  const [inputMessage, setInputMessage] = useState('');
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'decisions' | 'chat' | 'data' | 'personas'>('chat');
  const [drawerWidth, setDrawerWidth] = useState(DEFAULT_DRAWER_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Test persona state
  const [personas, setPersonas] = useState<TestPersona[]>([]);
  const [activePersona, setActivePersona] = useState<TestPersona | null>(null);
  const [personaMessages, setPersonaMessages] = useState<Record<string, Message[]>>({});

  // Load personas from localStorage on mount (per-bot storage)
  useEffect(() => {
    if (!botId) return;

    const storageKey = `test-personas-bot-${botId}`;
    const savedPersonas = localStorage.getItem(storageKey);
    if (savedPersonas) {
      try {
        const parsed = JSON.parse(savedPersonas);
        setPersonas(parsed);
      } catch (e) {
        console.error('Failed to load personas from localStorage:', e);
      }
    } else {
      // Check for old global personas and clear them (migration)
      const oldPersonas = localStorage.getItem('test-personas');
      if (oldPersonas) {
        console.log('Clearing old global personas (migrated to per-bot storage)');
        localStorage.removeItem('test-personas');
      }
      setPersonas([]);
    }
  }, [botId]);

  // Save personas to localStorage when they change (per-bot storage)
  useEffect(() => {
    if (!botId) return;

    const storageKey = `test-personas-bot-${botId}`;
    if (personas.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(personas));
    } else {
      // Remove key if no personas
      localStorage.removeItem(storageKey);
    }
  }, [personas, botId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Refocus input after response is received
  useEffect(() => {
    if (!isLoading && isConnected) {
      inputRef.current?.focus();
    }
  }, [isLoading, isConnected]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
      // Refocus input after sending message
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendOverride();
    }
  };

  // Persona handlers
  const handlePersonaCreate = (persona: TestPersona) => {
    setPersonas([...personas, persona]);
    setActivePersona(persona);
    setPersonaMessages({ ...personaMessages, [persona.id]: [] });
  };

  const handlePersonaChange = (persona: TestPersona) => {
    setActivePersona(persona);
  };

  const handlePersonaDelete = (personaId: string) => {
    setPersonas(personas.filter(p => p.id !== personaId));
    if (activePersona?.id === personaId) {
      setActivePersona(null);
    }
    // Remove messages for this persona
    const newMessages = { ...personaMessages };
    delete newMessages[personaId];
    setPersonaMessages(newMessages);
  };

  // Send message via test bot endpoint when persona is active
  const handlePersonaMessage = async (message: string) => {
    if (!activePersona?.botConfigId) {
      alert('Please select a test persona first');
      return;
    }

    try {
      // Add user message to persona's message list
      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      const personaId = activePersona.id;
      setPersonaMessages(prev => ({
        ...prev,
        [personaId]: [...(prev[personaId] || []), userMessage],
      }));

      // Send to test bot endpoint
      const response = await fetch('http://localhost:8082/api/test/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: activePersona.botConfigId,
          user_message: message,
          persona_user_id: `test-user-${personaId}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const result = await response.json();

      // Add assistant response to persona's message list
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toISOString(),
      };

      setPersonaMessages(prev => ({
        ...prev,
        [personaId]: [...(prev[personaId] || []), assistantMessage],
      }));

      // Update persona message count
      setPersonas(prev =>
        prev.map(p =>
          p.id === personaId
            ? { ...p, messageCount: p.messageCount + 1 }
            : p
        )
      );

    } catch (err) {
      console.error('Failed to send persona message:', err);
      alert('Failed to send message. Check console for details.');
    }
  };

  // Override handleSend to use persona endpoint when persona is active
  const handleSendOverride = () => {
    if (inputMessage.trim()) {
      if (activePersona) {
        handlePersonaMessage(inputMessage.trim());
      } else {
        onSendMessage(inputMessage.trim());
      }
      setInputMessage('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= MIN_DRAWER_WIDTH && newWidth <= MAX_DRAWER_WIDTH) {
        setDrawerWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
          transition: isResizing ? 'none' : 'width 0.2s',
        },
      }}
    >
      {/* Resize Handle */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: 'col-resize',
          backgroundColor: isResizing ? 'primary.main' : 'transparent',
          transition: 'background-color 0.2s',
          zIndex: 1300,
          '&:hover': {
            backgroundColor: 'primary.main',
            opacity: 0.5,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '2px',
            height: '40px',
            backgroundColor: isResizing ? 'primary.contrastText' : 'action.disabled',
            borderRadius: '1px',
            opacity: isResizing ? 1 : 0.3,
            transition: 'opacity 0.2s',
          },
        }}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3, position: 'relative' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ flex: 1 }} /> {/* Spacer for centering */}
          <Typography variant="h5" sx={{ fontWeight: 600, textAlign: 'center' }}>
            {t('testMode.title')}
          </Typography>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <IconButton
              onClick={() => setShowStatsPanel(!showStatsPanel)}
              size="small"
              color={showStatsPanel ? 'primary' : 'default'}
              title="Performance Stats"
            >
              <AssessmentIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
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
            label={`Session: ${sessionId}`}
            size="small"
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {t('testMode.variables')}
              </Typography>
              <Chip
                label="Persisted"
                size="small"
                color="success"
                icon={<StorageIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
            {Object.entries(variables).map(([key, value]) => (
              <Box
                key={key}
                sx={{
                  mb: 1,
                  p: 1.5,
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  backgroundColor: 'background.paper',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 0.5 }}>
                  <Typography variant="caption" component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {key}
                  </Typography>
                  {currentNodeId && (
                    <Chip
                      label={`from: ${currentNodeId}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.5 } }}
                    />
                  )}
                </Box>
                <Typography variant="body2" component="div" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
                  {String(value)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.5, fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
                  Saved to database • Real-time sync
                </Typography>
              </Box>
            ))}
          </Paper>
        )}


        {/* View Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) {
                setViewMode(newMode);
              }
            }}
            aria-label="view mode"
            sx={{
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
              },
            }}
          >
            <ToggleButton value="decisions" aria-label="decision logs">
              <AccountTreeIcon sx={{ mr: 1 }} fontSize="small" />
              Decision Logs
            </ToggleButton>
            <ToggleButton value="chat" aria-label="chat messages">
              <ChatIcon sx={{ mr: 1 }} fontSize="small" />
              Chat Messages
            </ToggleButton>
            {flowId && (
              <ToggleButton value="personas" aria-label="test personas">
                <GroupIcon sx={{ mr: 1 }} fontSize="small" />
                Personas
              </ToggleButton>
            )}
            {(botId || personas.some(p => p.botConfigId)) && (
              <ToggleButton value="data" aria-label="collected data">
                <TableChartIcon sx={{ mr: 1 }} fontSize="small" />
                Collected Data
              </ToggleButton>
            )}
          </ToggleButtonGroup>
        </Box>

        {/* Main Content Area - Single View */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', mb: 2 }}>
          {/* Decision Logs View */}
          {viewMode === 'decisions' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText'
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'center' }}>
                  Decision Logs
                </Typography>
              </Paper>
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  pr: 1,
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'action.hover',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'action.selected',
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: 'action.disabled',
                    },
                  },
                }}
              >
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
          )}

          {/* Chat Messages View */}
          {viewMode === 'chat' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  backgroundColor: 'success.main',
                  color: 'success.contrastText'
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'center' }}>
                  Chat Messages
                </Typography>
              </Paper>
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  pr: 1,
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'action.hover',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'action.selected',
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: 'action.disabled',
                    },
                  },
                }}
              >
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
          )}

          {/* Collected Data View */}
          {viewMode === 'data' && botId && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 1.5,
                  backgroundColor: 'info.main',
                  color: 'info.contrastText'
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'center' }}>
                  Collected Data
                </Typography>
              </Paper>
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  pr: 1,
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'action.hover',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'action.selected',
                    borderRadius: '4px',
                    '&:hover': {
                      backgroundColor: 'action.disabled',
                    },
                  },
                }}
              >
                <DataCollectionTable
                  botId={botId}
                  botIds={personas.map(p => p.botConfigId).filter(Boolean) as number[]}
                />
              </Box>
            </Box>
          )}

          {/* Personas View */}
          {viewMode === 'personas' && flowId && (
            <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden', gap: 2 }}>
              {/* Persona Manager Sidebar */}
              <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider' }}>
                <TestPersonaManager
                  flowId={flowId}
                  ownerId={ownerId}
                  activePersona={activePersona}
                  personas={personas}
                  onPersonaChange={handlePersonaChange}
                  onPersonaCreate={handlePersonaCreate}
                  onPersonaDelete={handlePersonaDelete}
                />
              </Box>

              {/* Persona Chat Area */}
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {activePersona ? (
                  <>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        mb: 1.5,
                        backgroundColor: 'secondary.main',
                        color: 'secondary.contrastText'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'center' }}>
                        Testing as: {activePersona.avatar} {activePersona.name}
                      </Typography>
                    </Paper>
                    <Box
                      sx={{
                        flexGrow: 1,
                        overflowY: 'auto',
                        pr: 1,
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: 'action.hover',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: 'action.selected',
                          borderRadius: '4px',
                        },
                      }}
                    >
                      {/* Persona messages */}
                      {personaMessages[activePersona.id]?.map((msg, index) => (
                        <Box
                          key={index}
                          sx={{
                            mb: 2,
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <Paper
                            sx={{
                              p: 1.5,
                              maxWidth: '70%',
                              backgroundColor: msg.role === 'user' ? 'primary.main' : 'grey.800',
                              color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                            }}
                          >
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {msg.content}
                            </Typography>
                          </Paper>
                        </Box>
                      ))}
                    </Box>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      Select or create a persona to start testing
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* Input */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={activePersona ? `Message as ${activePersona.name}...` : t('testMode.inputPlaceholder')}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={activePersona ? false : (!isConnected || isLoading)}
            multiline
            maxRows={3}
            inputRef={inputRef}
          />
          <IconButton
            color="primary"
            onClick={handleSendOverride}
            disabled={!inputMessage.trim() || (activePersona ? false : (!isConnected || isLoading))}
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

      {/* Floating Performance Stats Panel */}
      {showStatsPanel && (lastMessageStats || (conversationStats && conversationStats.totalTokens > 0)) && (
        <Paper
          sx={{
            position: 'fixed',
            right: drawerWidth + 20,
            top: 300,
            width: 400,
            maxHeight: '80vh',
            overflowY: 'auto',
            p: 2,
            backgroundColor: 'background.paper',
            boxShadow: 6,
            borderRadius: 2,
            zIndex: 1299,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'action.hover',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'action.selected',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'action.disabled',
              },
            },
          }}
        >
          {/* Stats Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Performance Stats
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setShowStatsPanel(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Last Message Stats */}
          {lastMessageStats && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                Last Message Breakdown
              </Typography>

              {/* Summary */}
              <Paper elevation={0} sx={{ mb: 2, p: 1.5, backgroundColor: 'action.hover' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Total Time:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {lastMessageStats.responseTime.toFixed(2)}s
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Total Tokens:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {lastMessageStats.tokens.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Cost:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ${lastMessageStats.cost.toFixed(6)}
                  </Typography>
                </Box>
              </Paper>

              {/* Pathway Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                  1. Pathway Selection
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Model: {lastMessageStats.pathwaySelection.model}
                </Typography>
                <Box sx={{ pl: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography variant="caption" color="text.secondary">Time:</Typography>
                    <Typography variant="caption">{lastMessageStats.pathwaySelection.time.toFixed(2)}s</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
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
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'success.main' }}>
                  2. Response Generation
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Model: {lastMessageStats.responseGeneration.model}
                </Typography>
                <Box sx={{ pl: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                    <Typography variant="caption" color="text.secondary">Time:</Typography>
                    <Typography variant="caption">{lastMessageStats.responseGeneration.time.toFixed(2)}s</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
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

              {/* Loop Evaluation - Only show if tokens > 0 */}
              {lastMessageStats.loopEvaluation && lastMessageStats.loopEvaluation.totalTokens > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'warning.main' }}>
                    3. Loop Evaluation
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Model: {lastMessageStats.loopEvaluation.model}
                  </Typography>
                  <Box sx={{ pl: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="caption" color="text.secondary">Time:</Typography>
                      <Typography variant="caption">{lastMessageStats.loopEvaluation.time.toFixed(2)}s</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                      <Typography variant="caption" color="text.secondary">Tokens:</Typography>
                      <Typography variant="caption">
                        {lastMessageStats.loopEvaluation.totalTokens.toLocaleString()}
                        <span style={{ opacity: 0.6 }}> ({lastMessageStats.loopEvaluation.inputTokens} in / {lastMessageStats.loopEvaluation.outputTokens} out)</span>
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Cost:</Typography>
                      <Typography variant="caption">${lastMessageStats.loopEvaluation.cost.toFixed(6)}</Typography>
                    </Box>
                  </Box>
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      Loop condition evaluated - stayed on current node
                    </Typography>
                  </Alert>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
            </Box>
          )}

          {/* Conversation Totals */}
          {conversationStats && conversationStats.totalTokens > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
                Conversation Total
              </Typography>
              <Paper elevation={0} sx={{ p: 1.5, backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Total Time:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {conversationStats.totalResponseTime.toFixed(2)}s
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Total Tokens:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {conversationStats.totalTokens.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Total Cost:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ${conversationStats.totalCost.toFixed(6)}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}
        </Paper>
      )}
    </Drawer>
  );
};

export default TestModePanel;
