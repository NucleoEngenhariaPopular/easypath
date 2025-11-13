import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useEffect, useMemo, useState, type FC, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import EasyPathAppBar from '../components/AppBar';
import { messagingGatewayFetch, platformFetch, postJson, putJson } from '../services/apiClient';
import type { BotConfig, MessagingPlatform } from '../types/bot';

interface FlowSummary {
  id: number;
  name: string;
  description: string;
  flow_data: { nodes?: unknown[] };
  status?: string;
  created_at?: string;
}

const INITIAL_BOT_FORM = {
  platform: 'telegram',
  bot_name: '',
  bot_token: '',
  flow_id: '',
  owner_id: 'user-123',
};

const platformIcons: Record<MessagingPlatform, JSX.Element> = {
  telegram: <TelegramIcon />,
  whatsapp: <WhatsAppIcon />,
};

const DashboardPage: FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  const [bots, setBots] = useState<BotConfig[]>([]);
  const [flows, setFlows] = useState<FlowSummary[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [botError, setBotError] = useState<string | null>(null);
  const [createBotOpen, setCreateBotOpen] = useState(false);
  const [editBotOpen, setEditBotOpen] = useState(false);
  const [deleteBotOpen, setDeleteBotOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  const [botFormData, setBotFormData] = useState(INITIAL_BOT_FORM);
  const [dialogLoading, setDialogLoading] = useState(false);

  const nonTestBots = useMemo(
    () => bots.filter((bot) => !bot.is_test_bot),
    [bots],
  );

  const activeBotCount = useMemo(
    () =>
      nonTestBots.filter(
        (bot) => bot.is_active === true || bot.is_active === 'active',
      ).length,
    [nonTestBots],
  );

  const nodeCount = useMemo(() => {
    return flows.reduce((total, flow) => total + (flow.flow_data?.nodes?.length || 0), 0);
  }, [flows]);

  const fetchBots = useCallback(async () => {
    setLoadingBots(true);
    try {
      const data = await messagingGatewayFetch<BotConfig[]>('/api/bots');
      setBots(data);
    } catch (error) {
      console.error('Failed to load bots:', error);
      setBotError(error instanceof Error ? error.message : 'Failed to load bots');
    } finally {
      setLoadingBots(false);
    }
  }, []);

  const fetchFlows = useCallback(async () => {
    setLoadingFlows(true);
    try {
      const data = await platformFetch<FlowSummary[]>('/flows/');
      setFlows(data);
    } catch (error) {
      console.error('Failed to load flows:', error);
    } finally {
      setLoadingFlows(false);
    }
  }, []);

  useEffect(() => {
    fetchBots();
    fetchFlows();
  }, [fetchBots, fetchFlows]);

  const handleOpenCreate = () => {
    setBotFormData(INITIAL_BOT_FORM);
    setBotError(null);
    setCreateBotOpen(true);
  };

  const handleOpenEdit = (bot: BotConfig) => {
    setSelectedBot(bot);
    setBotFormData({
      platform: bot.platform,
      bot_name: bot.bot_name,
      bot_token: '',
      flow_id: bot.flow_id.toString(),
      owner_id: bot.owner_id,
    });
    setBotError(null);
    setEditBotOpen(true);
  };

  const handleOpenDelete = (bot: BotConfig) => {
    setSelectedBot(bot);
    setDeleteBotOpen(true);
  };

  const handleCloseDialogs = () => {
    setCreateBotOpen(false);
    setEditBotOpen(false);
    setDeleteBotOpen(false);
    setSelectedBot(null);
    setDialogLoading(false);
    setBotError(null);
  };

  const handleCreateBot = async () => {
    if (!botFormData.flow_id || !botFormData.bot_name.trim() || !botFormData.bot_token.trim()) {
      setBotError('All fields are required');
      return;
    }

    setDialogLoading(true);
    try {
      const payload = {
        platform: botFormData.platform,
        bot_name: botFormData.bot_name.trim(),
        bot_token: botFormData.bot_token.trim(),
        flow_id: parseInt(botFormData.flow_id, 10),
        owner_id: botFormData.owner_id,
      };
      const newBot = await messagingGatewayFetch<BotConfig>(
        '/api/bots',
        { ...postJson(payload) },
      );
      setBots((prev) => [...prev, newBot]);
      handleCloseDialogs();
    } catch (error) {
      console.error('Failed to create bot:', error);
      setBotError(error instanceof Error ? error.message : 'Failed to create bot');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleUpdateBot = async () => {
    if (!selectedBot) return;
    if (!botFormData.bot_name.trim() || !botFormData.flow_id) {
      setBotError('Bot name and flow are required');
      return;
    }

    setDialogLoading(true);
    try {
      const payload = {
        bot_name: botFormData.bot_name.trim(),
        flow_id: parseInt(botFormData.flow_id, 10),
      };

      const updatedBot = await messagingGatewayFetch<BotConfig>(
        `/api/bots/${selectedBot.id}`,
        { ...putJson(payload) },
      );

      setBots((prev) => prev.map((bot) => (bot.id === updatedBot.id ? updatedBot : bot)));
      handleCloseDialogs();
    } catch (error) {
      console.error('Failed to update bot:', error);
      setBotError(error instanceof Error ? error.message : 'Failed to update bot');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteBot = async () => {
    if (!selectedBot) return;
    setDialogLoading(true);
    try {
      await messagingGatewayFetch(
        `/api/bots/${selectedBot.id}`,
        { method: 'DELETE', parseJson: false },
      );
      setBots((prev) => prev.filter((bot) => bot.id !== selectedBot.id));
      handleCloseDialogs();
    } catch (error) {
      console.error('Failed to delete bot:', error);
      setBotError(error instanceof Error ? error.message : 'Failed to delete bot');
      setDialogLoading(false);
    }
  };

  const handleToggleActive = async (bot: BotConfig) => {
    const nextStatus =
      bot.is_active === true || bot.is_active === 'active' ? false : true;
    try {
      const updated = await messagingGatewayFetch<BotConfig>(
        `/api/bots/${bot.id}`,
        { ...putJson({ is_active: nextStatus }) },
      );
      setBots((prev) => prev.map((item) => (item.id === bot.id ? updated : item)));
    } catch (error) {
      console.error('Failed to toggle bot status:', error);
    }
  };

  const getFlowName = (flowId: number) =>
    flows.find((flow) => flow.id === flowId)?.name || `Flow #${flowId}`;

  const renderPlatformIcon = (platform: MessagingPlatform) =>
    platformIcons[platform] ?? <SmartToyIcon />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <EasyPathAppBar appBarHeight="large" />
      <Box sx={{ flexGrow: 1, p: 3, maxWidth: '1200px', mx: 'auto', width: '100%' }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {t('dashboardPage.workspaceTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboardPage.workspaceSubtitle')}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/canvas/new')}
              >
                {t('dashboardPage.actions.newFlow')}
              </Button>
              <Button
                variant="contained"
                startIcon={<SmartToyIcon />}
                onClick={handleOpenCreate}
              >
                {t('dashboardPage.actions.newBot')}
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={2}>
            {[
              {
                label: t('dashboardPage.metrics.bots'),
                value: loadingBots ? <CircularProgress size={18} /> : nonTestBots.length,
                caption: t('dashboardPage.metrics.botsCaption'),
              },
              {
                label: t('dashboardPage.metrics.activeBots'),
                value: loadingBots ? <CircularProgress size={18} /> : activeBotCount,
                caption: t('dashboardPage.metrics.activeBotsCaption'),
              },
              {
                label: t('dashboardPage.metrics.flows'),
                value: loadingFlows ? <CircularProgress size={18} /> : flows.length,
                caption: t('dashboardPage.metrics.flowsCaption'),
              },
              {
                label: t('dashboardPage.metrics.nodes'),
                value: loadingFlows ? <CircularProgress size={18} /> : nodeCount,
                caption: t('dashboardPage.metrics.nodesCaption'),
              },
            ].map((metric) => (
              <Grid item xs={12} sm={6} md={3} key={metric.label}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {metric.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {metric.caption}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('dashboardPage.botsSection.title')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={fetchBots}
                  disabled={loadingBots}
                >
                  {t('dashboardPage.botsSection.refresh')}
                </Button>
                <Button variant="contained" size="small" onClick={handleOpenCreate}>
                  {t('dashboardPage.botsSection.create')}
                </Button>
              </Stack>
            </Stack>
            {botError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {botError}
              </Alert>
            )}
            {loadingBots ? (
              <Grid container spacing={2}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Skeleton variant="rounded" height={180} />
                  </Grid>
                ))}
              </Grid>
            ) : nonTestBots.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <SmartToyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  {t('dashboardPage.botsSection.emptyTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboardPage.botsSection.emptySubtitle')}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {nonTestBots.map((bot) => (
                  <Grid item xs={12} md={6} key={bot.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: theme.palette.primary.light, color: theme.palette.primary.main }}>
                              {renderPlatformIcon(bot.platform)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {bot.bot_name || `Bot #${bot.id}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {getFlowName(bot.flow_id)}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1}>
                            <Chip
                            label={bot.is_active === true || bot.is_active === 'active' ? t('dashboardPage.botsSection.statusActive') : t('dashboardPage.botsSection.statusInactive')}
                              color={bot.is_active === true || bot.is_active === 'active' ? 'success' : 'default'}
                              size="small"
                              onClick={() => handleToggleActive(bot)}
                              sx={{ cursor: 'pointer' }}
                            />
                            <Tooltip title="Edit bot">
                              <IconButton size="small" onClick={() => handleOpenEdit(bot)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete bot">
                              <IconButton size="small" color="error" onClick={() => handleOpenDelete(bot)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Button
                          size="small"
                          onClick={() => navigate(`/bots/${bot.id}`)}
                        >
                      {t('dashboardPage.botsSection.viewDetails')}
                        </Button>
                        {bot.webhook_url && (
                          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                        {bot.webhook_url}
                          </Typography>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t('dashboardPage.flowsSection.title')}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => navigate('/dashboard')} disabled>
                {t('dashboardPage.allPaths')}
              </Button>
            </Stack>
            {loadingFlows ? (
              <Stack spacing={1.5}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} variant="rounded" height={56} />
                ))}
              </Stack>
            ) : flows.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboardPage.flowsSection.empty')}
                </Typography>
              </Box>
            ) : (
              <List dense>
                {flows.slice(0, 6).map((flow) => (
                  <ListItem
                    key={flow.id}
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={`${flow.flow_data?.nodes?.length || 0} nodes`}
                          size="small"
                          variant="outlined"
                        />
                        <Button size="small" onClick={() => navigate(`/canvas/${flow.id}`)}>
                          Open
                        </Button>
                      </Stack>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <SmartToyIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={flow.name}
                      secondary={flow.description || t('dashboardPage.flowsSection.noDescription')}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Stack>
      </Box>

      <Dialog open={createBotOpen} onClose={dialogLoading ? undefined : handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Create Bot</DialogTitle>
        <DialogContent>
          {botError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {botError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Platform</InputLabel>
              <Select
                label="Platform"
                value={botFormData.platform}
                onChange={(event) =>
                  setBotFormData((prev) => ({ ...prev, platform: event.target.value }))
                }
                disabled={dialogLoading}
              >
                <MenuItem value="telegram">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TelegramIcon fontSize="small" />
                    <span>Telegram</span>
                  </Stack>
                </MenuItem>
                <MenuItem value="whatsapp" disabled>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WhatsAppIcon fontSize="small" />
                    <span>WhatsApp (coming soon)</span>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Bot name"
              value={botFormData.bot_name}
              onChange={(event) =>
                setBotFormData((prev) => ({ ...prev, bot_name: event.target.value }))
              }
              disabled={dialogLoading}
              fullWidth
            />
            <TextField
              label="Bot token"
              value={botFormData.bot_token}
              onChange={(event) =>
                setBotFormData((prev) => ({ ...prev, bot_token: event.target.value }))
              }
              disabled={dialogLoading}
              fullWidth
              type="password"
              helperText="Get this token from @BotFather on Telegram"
            />
            <FormControl fullWidth>
              <InputLabel>Active flow</InputLabel>
              <Select
                label="Active flow"
                value={botFormData.flow_id}
                onChange={(event) =>
                  setBotFormData((prev) => ({ ...prev, flow_id: event.target.value }))
                }
                disabled={dialogLoading}
              >
                {flows.map((flow) => (
                  <MenuItem key={flow.id} value={flow.id.toString()}>
                    {flow.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} disabled={dialogLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateBot} variant="contained" disabled={dialogLoading}>
            {dialogLoading ? 'Creating...' : 'Create Bot'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editBotOpen} onClose={dialogLoading ? undefined : handleCloseDialogs} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Bot</DialogTitle>
        <DialogContent>
          {botError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {botError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Bot name"
              value={botFormData.bot_name}
              onChange={(event) =>
                setBotFormData((prev) => ({ ...prev, bot_name: event.target.value }))
              }
              disabled={dialogLoading}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Active flow</InputLabel>
              <Select
                label="Active flow"
                value={botFormData.flow_id}
                onChange={(event) =>
                  setBotFormData((prev) => ({ ...prev, flow_id: event.target.value }))
                }
                disabled={dialogLoading}
              >
                {flows.map((flow) => (
                  <MenuItem key={flow.id} value={flow.id.toString()}>
                    {flow.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} disabled={dialogLoading}>
            Cancel
          </Button>
          <Button onClick={handleUpdateBot} variant="contained" disabled={dialogLoading}>
            {dialogLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteBotOpen} onClose={dialogLoading ? undefined : handleCloseDialogs} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Bot</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete "{selectedBot?.bot_name}"? This will remove the webhook and stop all message processing.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs} disabled={dialogLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteBot}
            variant="contained"
            color="error"
            disabled={dialogLoading}
          >
            {dialogLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardPage;
