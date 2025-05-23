import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Fab,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
  Paper,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'; // For MessageSquare equivalent
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';

import EasyPathAppBar from '../components/AppBar';
import { useNavigate } from 'react-router-dom';

// New mock data for folders
const folders = [
  { id: '1', name: 'Customer Support', count: 5 },
  { id: '2', name: 'Sales', count: 3 },
  { id: '3', name: 'Marketing', count: 2 },
  { id: '4', name: 'Product', count: 1 },
];

// Updated mock data for paths with additional fields
const mockPaths = [
  {
    id: '1',
    title: 'Customer Onboarding',
    description: 'Guide new customers through the onboarding process',
    createdAt: '2023-10-15T00:00:00Z', // Use ISO string for dates
    folder: 'Customer Support',
    nodes: 12,
    status: 'active',
  },
  {
    id: '2',
    title: 'Product Inquiry',
    description: 'Handle product-related questions and inquiries',
    createdAt: '2023-09-22T00:00:00Z',
    folder: 'Sales',
    nodes: 8,
    status: 'active',
  },
  {
    id: '3',
    title: 'Feedback Collection',
    description: 'Collect customer feedback about products and services',
    createdAt: '2023-11-05T00:00:00Z',
    folder: 'Marketing',
    nodes: 6,
    status: 'draft',
  },
  {
    id: '4',
    title: 'Order Status',
    description: 'Check and update customers on their order status',
    createdAt: '2023-10-30T00:00:00Z',
    folder: 'Customer Support',
    nodes: 10,
    status: 'active',
  },
  {
    id: '5',
    title: 'Technical Support',
    description: 'Provide technical assistance to customers',
    createdAt: '2023-11-12T00:00:00Z',
    folder: 'Customer Support',
    nodes: 15,
    status: 'active',
  },
  {
    id: '6',
    title: 'Refund Process',
    description: 'Automated flow for processing customer refunds.',
    createdAt: '2024-01-20T00:00:00Z',
    folder: 'Customer Support',
    nodes: 7,
    status: 'draft',
  },
  {
    id: '7',
    title: 'New Feature Announcement',
    description: 'Announce and explain new product features to users.',
    createdAt: '2024-02-01T00:00:00Z',
    folder: 'Marketing',
    nodes: 9,
    status: 'active',
  },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'date-newest' | 'date-oldest'>('date-newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleCreatePath = () => {
    navigate('/canvas/new');
  };

  const handlePathClick = (id: string) => {
    navigate(`/canvas/${id}`); // Navigate to specific canvas for editing
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const filteredAndSortedPaths = useMemo(() => {
    let currentPaths = mockPaths.filter((path) => {
      const matchesFolder = selectedFolder ? path.folder === selectedFolder : true;
      const matchesSearch =
        path.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        path.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || path.status === filterStatus;
      return matchesFolder && matchesSearch && matchesStatus;
    });

    // Sort logic
    currentPaths.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'title-desc') {
        return b.title.localeCompare(a.title);
      } else if (sortBy === 'date-newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'date-oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

    return currentPaths;
  }, [selectedFolder, searchQuery, sortBy, filterStatus]);

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
          p: 3, // Global padding
          maxWidth: '1400px', // Max width for content
          mx: 'auto', // Center content
          width: '100%',
          gap: 3,
          [theme.breakpoints.down('md')]: {
            flexDirection: 'column', // Stack sidebar and main content on small screens
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
              order: 2, // Put sidebar below main content on small screens
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
              Folders
            </Typography>
            <IconButton size="small">
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant={selectedFolder === null ? 'contained' : 'text'}
              color={selectedFolder === null ? 'primary' : 'inherit'}
              onClick={() => setSelectedFolder(null)}
              sx={{ justifyContent: 'flex-start', py: 1.2, px: 2, borderRadius: 2 }}
            >
              <FolderIcon sx={{ mr: 1 }} />
              All Paths
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
                {mockPaths.length}
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
              order: 1, // Put main content above sidebar on small screens
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
              {selectedFolder ? selectedFolder : 'All Paths'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreatePath}
              sx={{ borderRadius: 2 }}
            >
              Create Path
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
              placeholder="Search paths..."
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
                <InputLabel id="sort-by-label">Sort By</InputLabel>
                <Select
                  labelId="sort-by-label"
                  id="sort-by-select"
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) =>
                    setSortBy(e.target.value as 'title-asc' | 'title-desc' | 'date-newest' | 'date-oldest')
                  }
                >
                  <MenuItem value="title-asc">Name (A-Z)</MenuItem>
                  <MenuItem value="title-desc">Name (Z-A)</MenuItem>
                  <MenuItem value="date-newest">Date (Newest)</MenuItem>
                  <MenuItem value="date-oldest">Date (Oldest)</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }} size="small">
                <InputLabel id="filter-status-label">Filter</InputLabel>
                <Select
                  labelId="filter-status-label"
                  id="filter-status-select"
                  value={filterStatus}
                  label="Filter"
                  onChange={(e) =>
                    setFilterStatus(e.target.value as 'all' | 'active' | 'draft' | 'archived')
                  }
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>

              <Tabs
                value={viewMode}
                onChange={(_event, newValue) => setViewMode(newValue)}
                aria-label="view mode tabs"
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
                  aria-label="grid view"
                  sx={{ minWidth: 'unset', px: 1.5 }}
                />
                <Tab
                  icon={<ViewListIcon fontSize="small" />}
                  value="list"
                  aria-label="list view"
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
                          {path.title}
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
                          {path.nodes} nodes
                        </Typography>
                      </Box>
                    </CardContent>
                    <Divider />
                    <CardContent sx={{ pt: 1.5, pb: '16px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.disabled">
                        Created: {formatDate(path.createdAt)}
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
