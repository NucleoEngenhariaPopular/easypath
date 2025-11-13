import { useEffect, useMemo, useState, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import EasyPathAppBar from '../components/AppBar';
import DataCollectionTable from '../components/bot/DataCollectionTable';
import BotConversationViewer from '../components/bot/BotConversationViewer';
import {
  messagingGatewayFetch,
  platformFetch,
  putJson,
} from '../services/apiClient';
import type {
  BotConfig,
  BotConversation,
  BotStatus,
  BotSummary,
  ConversationMessage,
  MessagingPlatform,
} from '../types/bot';
import { useTranslation } from 'react-i18next';

interface FlowSummary {
  id: number;
  name: string;
  description: string;
}

const platformIcons: Record<MessagingPlatform, JSX.Element> = {
  telegram: <TelegramIcon fontSize="small" />,
  whatsapp: <WhatsAppIcon fontSize="small" />,
};

const BotDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const botId = Number(id);
  const { t } = useTranslation();
  const [bot, setBot] = useState<BotConfig | null>(null);
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [summary, setSummary] = useState<BotSummary | null>(null);
  const [conversations, setConversations] = useState<BotConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [loadingBot, setLoadingBot] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'conversations'>('data');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [flowUpdating, setFlowUpdating] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!botId) {
      setPageError(t('botDetail.invalidId'));
      setLoadingBot(false);
      return;
    }

    const fetchData = async () => {
      setLoadingBot(true);
      try {
        const [botResponse, flowResponse, summaryResponse] = await Promise.all([
          messagingGatewayFetch<BotConfig>(`/api/bots/${botId}`),
          platformFetch<FlowSummary[]>('/flows/'),
          messagingGatewayFetch<BotSummary>(`/api/variables/bots/${botId}/summary`),
        ]);

        setBot(botResponse);
        setFlows(flowResponse);
        setSummary(summaryResponse);
      } catch (error) {
        console.error('Failed to load bot details:', error);
        setPageError(error instanceof Error ? error.message : 'Failed to load bot details');
      } finally {
        setLoadingBot(false);
      }
    };

    const fetchConversationList = async () => {
      setLoadingConversations(true);
      try {
        const data = await messagingGatewayFetch<BotConversation[]>(
          `/api/bots/${botId}/conversations`,
        );
        setConversations(data);
        if (data.length > 0) {
          setSelectedConversationId(data[0].id);
        } else {
          setSelectedConversationId(null);
          setConversationMessages([]);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchData();
    fetchConversationList();
  }, [botId, t]);

  useEffect(() => {
    if (!selectedConversationId) {
      setConversationMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await messagingGatewayFetch<ConversationMessage[]>(
          `/api/conversations/${selectedConversationId}/messages`,
        );
        setConversationMessages(data);
      } catch (error) {
        console.error('Failed to load conversation messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedConversationId]);

  const handleToggleStatus = async () => {
    if (!bot) return;
    setStatusUpdating(true);
    try {
      const nextStatus: BotStatus | boolean =
        bot.is_active === true || bot.is_active === 'active' ? false : true;
      const updatedBot = await messagingGatewayFetch<BotConfig>(
        `/api/bots/${bot.id}`,
        { ...putJson({ is_active: nextStatus }) },
      );
      setBot(updatedBot);
    } catch (error) {
      console.error('Failed to update bot status:', error);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleFlowUpdate = async (flowId: string) => {
    if (!bot) return;
    setFlowUpdating(true);
    try {
      const updatedBot = await messagingGatewayFetch<BotConfig>(
        `/api/bots/${bot.id}`,
        { ...putJson({ flow_id: parseInt(flowId, 10) }) },
      );
      setBot(updatedBot);
    } catch (error) {
      console.error('Failed to update active flow:', error);
    } finally {
      setFlowUpdating(false);
    }
  };

  const refreshConversations = async () => {
    if (!botId) return;
    setLoadingConversations(true);
    try {
      const data = await messagingGatewayFetch<BotConversation[]>(
        `/api/bots/${botId}/conversations`,
      );
      setConversations(data);
      if (data.length > 0 && !data.find((conv) => conv.id === selectedConversationId)) {
        setSelectedConversationId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const renderPlatform = (platform: MessagingPlatform) =>
    platformIcons[platform] ?? <SmartToyIcon fontSize="small" />;

  if (!botId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography variant="body1" color="text.secondary">
          Invalid bot identifier.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <EasyPathAppBar appBarHeight="small" />
      <Box sx={{ flexGrow: 1, p: 3, maxWidth: '1200px', mx: 'auto', width: '100%' }}>
        <Stack spacing={3}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            variant="text"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('botDetail.back')}
          </Button>

          {loadingBot ? (
            <Paper variant="outlined" sx={{ p: 4 }}>
              <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
              <Skeleton variant="text" width="25%" height={24} />
              <Skeleton variant="rounded" height={80} sx={{ mt: 3 }} />
            </Paper>
          ) : bot ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={3}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    icon={renderPlatform(bot.platform)}
                    label={bot.platform.charAt(0).toUpperCase() + bot.platform.slice(1)}
                    variant="outlined"
                  />
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {bot.bot_name || `Bot #${bot.id}`}
                  </Typography>
                  <Chip
                    label={bot.is_active === true || bot.is_active === 'active' ? t('botDetail.statusActive') : t('botDetail.statusInactive')}
                    color={bot.is_active === true || bot.is_active === 'active' ? 'success' : 'default'}
                    onClick={handleToggleStatus}
                    disabled={statusUpdating}
                    sx={{ cursor: 'pointer' }}
                  />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/canvas/${bot.flow_id}`)}
                  >
                    {t('botDetail.editFlow')}
                  </Button>
                  <Button variant="contained" onClick={() => navigate('/canvas/new')}>
                    {t('botDetail.newFlow')}
                  </Button>
                </Stack>
              </Stack>

              <Grid container spacing={2} sx={{ mt: 3 }}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('botDetail.activeFlowLabel')}</InputLabel>
                    <Select
                      label={t('botDetail.activeFlowLabel')}
                      value={bot.flow_id.toString()}
                      onChange={(event) => handleFlowUpdate(event.target.value)}
                      disabled={flowUpdating}
                    >
                      {flows.map((flow) => (
                        <MenuItem key={flow.id} value={flow.id.toString()}>
                          {flow.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    {t('botDetail.webhookLabel')}
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                    {bot.webhook_url || t('botDetail.webhookPlaceholder')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">
                    {t('botDetail.createdLabel')}
                  </Typography>
                  <Typography variant="body2">
                    {new Date(bot.created_at).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          ) : pageError ? (
            <Alert severity="error">{pageError}</Alert>
          ) : null}

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('botDetail.metrics.conversations')}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {summary?.conversations_with_data ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('botDetail.metrics.conversationsCaption')}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('botDetail.metrics.variables')}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {summary?.total_variables_collected ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('botDetail.metrics.variablesCaption')}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t('botDetail.metrics.uniqueVariables')}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {summary?.unique_variable_names.length ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('botDetail.metrics.uniqueVariablesCaption')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_event, value) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2 }}
            >
              <Tab value="data" label={t('botDetail.tabs.data')} />
              <Tab value="conversations" label={t('botDetail.tabs.conversations')} />
            </Tabs>

            {activeTab === 'data' ? (
              <DataCollectionTable botId={botId} />
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} md={5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('botDetail.conversationList.title')}
                    </Typography>
                    <Tooltip title="Refresh conversations">
                      <span>
                        <Button
                          size="small"
                          startIcon={<RefreshIcon />}
                          onClick={refreshConversations}
                          disabled={loadingConversations}
                        >
                          {t('botDetail.conversationList.refresh')}
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                  {loadingConversations ? (
                    <Skeleton variant="rounded" height={320} />
                  ) : conversations.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('botDetail.conversationList.empty')}
                      </Typography>
                    </Box>
                  ) : (
                    <Paper variant="outlined" sx={{ maxHeight: 360, overflowY: 'auto' }}>
                      <List dense>
                        {conversations.map((conversation) => (
                          <ListItem disablePadding key={conversation.id}>
                            <ListItemButton
                              selected={conversation.id === selectedConversationId}
                              onClick={() => setSelectedConversationId(conversation.id)}
                            >
                              <ListItemText
                                primary={conversation.platform_user_name || conversation.platform_user_id}
                                secondary={
                                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                    <Chip
                                      label={`${conversation.message_count} msgs`}
                                      size="small"
                                      variant="outlined"
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(conversation.last_message_at).toLocaleString()}
                                    </Typography>
                                  </Stack>
                                }
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}
                </Grid>
                <Grid item xs={12} md={7}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    {selectedConversation ? (
                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {t('botDetail.conversations.with', {
                            name: selectedConversation.platform_user_name || selectedConversation.platform_user_id,
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('botDetail.conversations.session', { id: selectedConversation.session_id })}
                        </Typography>
                      </Stack>
                    ) : null}
                    <BotConversationViewer
                      messages={conversationMessages}
                      loading={loadingMessages}
                      onRefresh={() => {
                        if (selectedConversationId) {
                          setSelectedConversationId(selectedConversationId);
                        }
                      }}
                    />
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
};

export default BotDetailPage;

