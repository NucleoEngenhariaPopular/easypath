import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import GridViewIcon from '@mui/icons-material/GridView';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import EasyPathAppBar from '../components/AppBar';

import { useEffect, useState, useMemo, type FC } from 'react';
import { supabase } from '../supabaseClient';



const DashboardPage: FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate();
  const theme = useTheme();

  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'date-newest' | 'date-oldest'>('date-newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchFlows = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch('/api/flows/', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setFlows(data);
        }
      }
    };

    fetchFlows();
  }, []);

  const folders = useMemo(() => {
    const folderMap: { [key: string]: number } = {};
    flows.forEach(flow => {
      if (flow.folder) {
        folderMap[flow.folder] = (folderMap[flow.folder] || 0) + 1;
      }
    });
    return Object.keys(folderMap).map(name => ({ id: name, name, count: folderMap[name] }));
  }, [flows]);

  const handleCreatePath = () => {
    navigate('/canvas/new');
  };

  const handlePathClick = (id: string) => {
    navigate(`/canvas/${id}`); // Navigate to specific canvas for editing
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(i18n.language, options);
  };

  const filteredAndSortedPaths = useMemo(() => {
    let currentPaths = flows.filter((path) => {
      const matchesFolder = selectedFolder ? path.folder === selectedFolder : true;
      const matchesSearch =
        path.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        path.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || path.status === filterStatus;
      return matchesFolder && matchesSearch && matchesStatus;
    });

    // Sort logic
    currentPaths.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'title-desc') {
        return b.name.localeCompare(a.name);
      } else if (sortBy === 'date-newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'date-oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });

    return currentPaths;
  }, [selectedFolder, searchQuery, sortBy, filterStatus, flows]);

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'draft':
        return theme.palette.warning.main;
      case 'archived':
        return theme.palette.text.secondary;
      default:
        return theme.palette.grey[500]; // Fallback to a grey color
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <EasyPathAppBar appBarHeight="large" />
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          p: 3,
          maxWidth: '1400px',
          mx: 'auto',
          width: '100%',
          gap: 3,
          [theme.breakpoints.down('md')]: {
            flexDirection: 'column',
          },
        }}
      >
        {/* Sidebar with folders */}
        <Paper
          elevation={2}
          sx={{
            width: 280,
            p: 2,
            borderRadius: 3,
            height: 'fit-content',
            minHeight: '200px',
            [theme.breakpoints.down('md')]: {
              width: '100%',
              order: 2,
            },
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            transform: 'translateX(0)',
            opacity: 1,
            // Simple animation approximation
            '&.entering': { transform: 'translateX(-20px)', opacity: 0 },
            '&.entered': { transform: 'translateX(0)', opacity: 1 },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {t('dashboardPage.foldersTitle')}
            </Typography>
            <Tooltip title={t('dashboardPage.addFolderTooltip')}>
              <IconButton size="small">
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant={selectedFolder === null ? 'contained' : 'text'}
              color={selectedFolder === null ? 'primary' : 'inherit'}
              onClick={() => setSelectedFolder(null)}
              sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: 2 }}
            >
              <FolderIcon sx={{ mr: 1 }} />
              {t('dashboardPage.allPaths')}
              <Typography
                variant="caption"
                sx={{
                  ml: 'auto',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: selectedFolder === null ? alpha(theme.palette.primary.contrastText, 0.2) : theme.palette.action.selected,
                  color: selectedFolder === null ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                  fontWeight: 600,
                }}
              >
                {folders.length}
              </Typography>
            </Button>
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.name ? 'contained' : 'text'}
                color={selectedFolder === folder.name ? 'primary' : 'inherit'}
                onClick={() => setSelectedFolder(folder.name)}
                sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: 2 }}
              >
                {selectedFolder === folder.name ? <FolderOpenIcon sx={{ mr: 1 }} /> : <FolderIcon sx={{ mr: 1 }} />}
                {folder.name}
                <Typography
                  variant="caption"
                  sx={{
                    ml: 'auto',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    backgroundColor: selectedFolder === folder.name ? alpha(theme.palette.primary.contrastText, 0.2) : theme.palette.action.selected,
                    color: selectedFolder === folder.name ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                    fontWeight: 600,
                  }}
                >
                  {folder.count}
                </Typography>
              </Button>
            ))}
          </Box>
        </Paper>

        {/* Main content area */}
        <Box
          sx={{
            flex: 1,
            [theme.breakpoints.down('md')]: {
              order: 1,
            },
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            transform: 'translateY(0)',
            opacity: 1,
            // Simple animation approximation
            '&.entering': { transform: 'translateY(20px)', opacity: 0 },
            '&.entered': { transform: 'translateY(0)', opacity: 1 },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {selectedFolder ? selectedFolder : t('dashboardPage.allPaths')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreatePath}
              sx={{ borderRadius: 2 }}
            >
              {t('dashboardPage.createPathButton')}
            </Button>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mb: 3,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              placeholder={t('dashboardPage.searchPlaceholder')}
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{
                borderRadius: 2,
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
                flex: 1,
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
              <FormControl sx={{ minWidth: 120 }} size="small">
                <InputLabel id="sort-by-label">{t('dashboardPage.sortByLabel')}</InputLabel>
                <Select
                  labelId="sort-by-label"
                  id="sort-by-select"
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) =>
                    setSortBy(e.target.value as 'title-asc' | 'title-desc' | 'date-newest' | 'date-oldest')
                  }
                >
                  <MenuItem value="title-asc">{t('dashboardPage.sortByNameAsc')}</MenuItem>
                  <MenuItem value="title-desc">{t('dashboardPage.sortByNameDesc')}</MenuItem>
                  <MenuItem value="date-newest">{t('dashboardPage.sortByDateNewest')}</MenuItem>
                  <MenuItem value="date-oldest">{t('dashboardPage.sortByDateOldest')}</MenuItem>

                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }} size="small">
                <InputLabel id="filter-status-label">{t('dashboardPage.filterLabel')}</InputLabel>
                <Select
                  labelId="filter-status-label"
                  id="filter-status-select"
                  value={filterStatus}
                  label="Filter"
                  onChange={(e) =>
                    setFilterStatus(e.target.value as 'all' | 'active' | 'draft' | 'archived')
                  }
                >
                  <MenuItem value="all">{t('dashboardPage.filterStatusAll')}</MenuItem>
                  <MenuItem value="active">{t('dashboardPage.filterStatusActive')}</MenuItem>
                  <MenuItem value="draft">{t('dashboardPage.filterStatusDraft')}</MenuItem>
                  <MenuItem value="archived">{t('dashboardPage.filterStatusArchived')}</MenuItem>

                </Select>
              </FormControl>

              <Tabs
                value={viewMode}
                onChange={(_event, newValue) => setViewMode(newValue)}
                aria-label={t('dashboardPage.viewModeAriaLabel')}
                sx={{
                  minHeight: 0,
                  '& .MuiTab-root': { minHeight: 0, py: 1, px: 1.5, borderRadius: 1 },
                  '& .MuiTabs-indicator': { display: 'none' },
                  '& .Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                  },
                }}
              >
                <Tab
                  icon={<GridViewIcon fontSize="small" />}
                  value="grid"
                  aria-label={t('dashboardPage.viewGrid')}
                  sx={{ minWidth: 'unset', px: 1.5 }}
                />
                <Tab
                  icon={<ViewListIcon fontSize="small" />}
                  value="list"
                  aria-label={t('dashboardPage.viewList')}
                  sx={{ minWidth: 'unset', px: 1.5 }}
                />
              </Tabs>
            </Box>
          </Box>

          {viewMode === 'grid' && (
            <Grid container spacing={3}>
              {filteredAndSortedPaths.map((path) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={path.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.3s ease, transform 0.2s ease',
                      '&:hover': {
                        boxShadow: theme.shadows[6],
                        transform: 'translateY(-4px)',
                      },
                      borderRadius: 3,
                    }}
                    onClick={() => handlePathClick(path.id)}
                  >
                    <CardContent sx={{ pb: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="h3" sx={{ fontSize: '1.1rem', fontWeight: 600, flexGrow: 1 }}>
                          {path.name}
                        </Typography>
                        <IconButton
                          size="small"
                          sx={{ ml: 1, mt: -1, mr: -1 }}
                          onClick={(e) => e.stopPropagation()} // Prevent card click when clicking dropdown
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                        {/* More options dropdown would go here */}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.4, minHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {path.description}
                      </Typography>
                    </CardContent>
                    <CardContent sx={{ flexGrow: 1, pt: 0, pb: '16px !important' }}>
                      <Box
                        sx={{
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          borderRadius: 2,
                          p: 3,
                          height: 120,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: theme.palette.primary.main,
                        }}
                      >
                        <ChatBubbleOutlineIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t('dashboardPage.pathCard.nodes', { count: path.flow_data.nodes?.length || 0 })}
                        </Typography>
                      </Box>
                    </CardContent>
                    <Divider />
                    <CardContent sx={{ pt: 1.5, pb: '16px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.disabled">
                        {t('dashboardPage.pathCard.created', { date: formatDate(path.created_at) })}
                      </Typography>
                      <Box
                        sx={{
                          backgroundColor: getStatusBadgeColor(path.status),
                          color: theme.palette.getContrastText(getStatusBadgeColor(path.status)),
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      >
                        {path.status}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {viewMode === 'list' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredAndSortedPaths.map((path) => (
                <Card
                  key={path.id}
                  sx={{
                    width: '100%',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.3s ease, transform 0.2s ease',
                    '&:hover': {
                      boxShadow: theme.shadows[4],
                      transform: 'translateX(4px)',
                    },
                    borderRadius: 2,
                  }}
                  onClick={() => handlePathClick(path.id)}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                    <Box
                      sx={{
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        borderRadius: 1.5,
                        p: 1.5,
                        mr: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.palette.primary.main,
                      }}
                    >
                      <ChatBubbleOutlineIcon sx={{ fontSize: 28 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {path.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4, minHeight: 20, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                        {path.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, ml: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {formatDate(path.createdAt)}
                      </Typography>
                      <Box
                        sx={{
                          backgroundColor: getStatusBadgeColor(path.status),
                          color: theme.palette.getContrastText(getStatusBadgeColor(path.status)),
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {path.status}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      {/* More options dropdown would go here */}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPage;
