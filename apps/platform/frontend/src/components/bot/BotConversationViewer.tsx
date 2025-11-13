import React from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { ConversationMessage } from '../../types/bot';
import { useTranslation } from 'react-i18next';

interface BotConversationViewerProps {
  messages: ConversationMessage[];
  loading?: boolean;
  onRefresh?: () => void;
}

const BotConversationViewer: React.FC<BotConversationViewerProps> = ({
  messages,
  loading = false,
  onRefresh,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ maxHeight: 420, overflowY: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="text.secondary">
          {t('botDetail.conversationViewer.title')}
        </Typography>
        {onRefresh && (
          <Tooltip title={t('botDetail.conversationViewer.refresh')}>
            <span>
              <IconButton size="small" onClick={onRefresh}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
      <Divider />
      {messages.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('botDetail.conversationViewer.empty')}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {messages.map((message) => (
            <Box key={`${message.id}-${message.created_at}`}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.5, flexWrap: 'wrap' }}
              >
                <Chip
                  label={message.role}
                  size="small"
                  color={message.role === 'user' ? 'primary' : 'secondary'}
                  sx={{ height: 22, textTransform: 'capitalize' }}
                />
                <Typography variant="caption" color="text.secondary">
                  {new Date(message.created_at).toLocaleString()}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {message.content}
              </Typography>
              <Divider sx={{ mt: 1.5 }} />
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default BotConversationViewer;

