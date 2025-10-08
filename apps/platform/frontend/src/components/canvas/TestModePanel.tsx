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
import { useTranslation } from 'react-i18next';

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
}

const drawerWidth = 400;

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
}) => {
  const { t } = useTranslation();
  const [inputMessage, setInputMessage] = useState('');
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

        <Divider sx={{ mb: 2 }} />

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
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
