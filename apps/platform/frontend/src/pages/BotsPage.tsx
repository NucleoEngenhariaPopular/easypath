import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';

import { useTranslation } from 'react-i18next';
import EasyPathAppBar from '../components/AppBar';

import { useEffect, useState, type FC } from 'react';

interface Bot {
  id: number;
  platform: string;
  bot_name: string;
  flow_id: number;
  owner_id: string;
  is_active: boolean;
  webhook_url: string | null;
  created_at: string;
  updated_at: string | null;
}

interface Flow {
  id: number;
  name: string;
  description: string;
  flow_data: any;
}

const BotsPage: FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [bots, setBots] = useState<Bot[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    platform: 'telegram',
    bot_name: '',
    bot_token: '',
    flow_id: '',
    owner_id: 'user-123', // TODO: Get from auth context
  });

  useEffect(() => {
    fetchBots();
    fetchFlows();
  }, []);

  const fetchBots = async () => {
    try {
      const response = await fetch('/api/bots');
      if (response.ok) {
        const data = await response.json();
        setBots(data);
      }
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlows = async () => {
    try {
      const response = await fetch('/api/flows/');
      if (response.ok) {
        const data = await response.json();
        setFlows(data);
      }
    } catch (error) {
      console.error('Failed to fetch flows:', error);
    }
  };

  const handleCreateBot = async () => {
    if (!formData.bot_name.trim() || !formData.bot_token.trim() || !formData.flow_id) {
      return;
    }

    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          flow_id: parseInt(formData.flow_id),
        }),
      });

      if (response.ok) {
        const newBot = await response.json();
        setBots([...bots, newBot]);
        handleCloseCreateDialog();
      } else {
        const error = await response.json();
        alert(`Failed to create bot: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create bot:', error);
      alert('Failed to create bot. Check console for details.');
    }
  };

  const handleUpdateBot = async () => {
    if (!selectedBot) return;

    try {
      const response = await fetch(`/api/bots/${selectedBot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_name: formData.bot_name,
          flow_id: parseInt(formData.flow_id),
          is_active: selectedBot.is_active,
        }),
      });

      if (response.ok) {
        const updatedBot = await response.json();
        setBots(bots.map(b => b.id === selectedBot.id ? updatedBot : b));
        handleCloseEditDialog();
      }
    } catch (error) {
      console.error('Failed to update bot:', error);
    }
  };

  const handleDeleteBot = async () => {
    if (!selectedBot) return;

    try {
      const response = await fetch(`/api/bots/${selectedBot.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBots(bots.filter(b => b.id !== selectedBot.id));
        handleCloseDeleteDialog();
      }
    } catch (error) {
      console.error('Failed to delete bot:', error);
    }
  };

  const handleToggleActive = async (bot: Bot) => {
    try {
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !bot.is_active,
        }),
      });

      if (response.ok) {
        const updatedBot = await response.json();
        setBots(bots.map(b => b.id === bot.id ? updatedBot : b));
      }
    } catch (error) {
      console.error('Failed to toggle bot status:', error);
    }
  };

  const handleOpenCreateDialog = () => {
    setFormData({
      platform: 'telegram',
      bot_name: '',
      bot_token: '',
      flow_id: '',
      owner_id: 'user-123',
    });
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleOpenEditDialog = (bot: Bot) => {
    setSelectedBot(bot);
    setFormData({
      platform: bot.platform,
      bot_name: bot.bot_name,
      bot_token: '', // Don't expose token
      flow_id: bot.flow_id.toString(),
      owner_id: bot.owner_id,
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedBot(null);
  };

  const handleOpenDeleteDialog = (bot: Bot) => {
    setSelectedBot(bot);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedBot(null);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'telegram':
        return <TelegramIcon />;
      case 'whatsapp':
        return <WhatsAppIcon />;
      default:
        return <SmartToyIcon />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFlowName = (flowId: number) => {
    const flow = flows.find(f => f.id === flowId);
    return flow ? flow.name : `Flow #${flowId}`;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <EasyPathAppBar appBarHeight="large" />
      <Box sx={{ flexGrow: 1, p: 3, maxWidth: '1400px', mx: 'auto', width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Messaging Bots
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            sx={{ borderRadius: 2 }}
          >
            Create Bot
          </Button>
        </Box>

        {loading ? (
          <Typography>Loading bots...</Typography>
        ) : bots.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <SmartToyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No bots configured
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first bot to connect Telegram or WhatsApp to your flows
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
              Create Bot
            </Button>
          </Card>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Platform</TableCell>
                  <TableCell>Bot Name</TableCell>
                  <TableCell>Connected Flow</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bots.map((bot) => (
                  <TableRow key={bot.id} hover>
                    <TableCell>
                      <Chip
                        icon={getPlatformIcon(bot.platform)}
                        label={bot.platform.charAt(0).toUpperCase() + bot.platform.slice(1)}
                        size="small"
                        color={bot.platform === 'telegram' ? 'primary' : 'success'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {bot.bot_name}
                      </Typography>
                      {bot.webhook_url && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {bot.webhook_url}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{getFlowName(bot.flow_id)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={bot.is_active ? <CheckCircleIcon /> : <CancelIcon />}
                        label={bot.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={bot.is_active ? 'success' : 'default'}
                        onClick={() => handleToggleActive(bot)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(bot.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEditDialog(bot)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleOpenDeleteDialog(bot)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Create Bot Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Bot</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Connect a messaging platform bot to one of your flows
          </DialogContentText>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Platform</InputLabel>
            <Select
              value={formData.platform}
              label="Platform"
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            >
              <MenuItem value="telegram">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TelegramIcon /> Telegram
                </Box>
              </MenuItem>
              <MenuItem value="whatsapp" disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WhatsAppIcon /> WhatsApp (Coming Soon)
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Bot Name"
            value={formData.bot_name}
            onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
            sx={{ mb: 2 }}
            helperText="Friendly name to identify your bot"
          />
          <TextField
            fullWidth
            label="Bot Token"
            value={formData.bot_token}
            onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
            sx={{ mb: 2 }}
            helperText="Get from @BotFather on Telegram"
            type="password"
          />
          <FormControl fullWidth>
            <InputLabel>Connected Flow</InputLabel>
            <Select
              value={formData.flow_id}
              label="Connected Flow"
              onChange={(e) => setFormData({ ...formData, flow_id: e.target.value })}
            >
              {flows.map((flow) => (
                <MenuItem key={flow.id} value={flow.id.toString()}>
                  {flow.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            onClick={handleCreateBot}
            variant="contained"
            disabled={!formData.bot_name.trim() || !formData.bot_token.trim() || !formData.flow_id}
          >
            Create Bot
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Bot Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Bot</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Bot Name"
            value={formData.bot_name}
            onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth>
            <InputLabel>Connected Flow</InputLabel>
            <Select
              value={formData.flow_id}
              label="Connected Flow"
              onChange={(e) => setFormData({ ...formData, flow_id: e.target.value })}
            >
              {flows.map((flow) => (
                <MenuItem key={flow.id} value={flow.id.toString()}>
                  {flow.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleUpdateBot} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm">
        <DialogTitle>Delete Bot</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedBot?.bot_name}"? This will remove the webhook and stop all message processing.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteBot} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BotsPage;
