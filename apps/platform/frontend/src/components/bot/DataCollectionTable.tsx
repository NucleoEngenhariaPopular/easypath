import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';

interface CollectedData {
  conversation_id: number;
  platform_user_id: string;
  platform_user_name?: string;
  variables: Record<string, any>;
  last_extracted_at: string;
  bot_id?: number; // Added for multi-bot support
  bot_name?: string; // Added for multi-bot support
}

interface DataCollectionTableProps {
  botId?: number; // Single bot ID (backwards compatible)
  botIds?: number[]; // Multiple bot IDs (for test personas)
}

const DataCollectionTable: React.FC<DataCollectionTableProps> = ({ botId, botIds }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<CollectedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Determine which bot IDs to fetch
  const effectiveBotIds = botIds || (botId ? [botId] : []);

  useEffect(() => {
    if (effectiveBotIds.length > 0) {
      fetchData();
    }
  }, [JSON.stringify(effectiveBotIds)]); // Use JSON.stringify for array comparison

  const fetchData = async () => {
    if (effectiveBotIds.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch data for all bot IDs in parallel
      const fetchPromises = effectiveBotIds.map(id =>
        fetch(`http://localhost:8082/api/variables/bots/${id}`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch bot ${id}`);
            return res.json();
          })
          .then(result => result.map((item: CollectedData) => ({ ...item, bot_id: id })))
      );

      const results = await Promise.all(fetchPromises);
      const combined = results.flat();
      setData(combined);
    } catch (err) {
      console.error('Failed to fetch collected data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;

    // Get all unique variable names across all conversations
    const allVarNames = new Set<string>();
    data.forEach(row => {
      Object.keys(row.variables).forEach(key => allVarNames.add(key));
    });

    // CSV Header
    const headers = ['Platform User ID', 'User Name', ...Array.from(allVarNames), 'Last Updated'];
    const csvRows = [
      headers.join(','),
      ...data.map(row => {
        const cells = [
          `"${row.platform_user_id}"`,
          `"${row.platform_user_name || ''}"`,
          ...Array.from(allVarNames).map(varName => {
            const value = row.variables[varName];
            return value !== undefined ? `"${String(value).replace(/"/g, '""')}"` : '""';
          }),
          `"${new Date(row.last_extracted_at).toISOString()}"`,
        ];
        return cells.join(',');
      }),
    ];

    const csvContent = csvRows.join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bot_${botId}_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Get all unique variable keys across all conversations
  const allVariableKeys = Array.from(
    new Set(data.flatMap(row => Object.keys(row.variables)))
  ).sort();

  // Filter data based on search term
  const filteredData = data.filter(row =>
    row.platform_user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.platform_user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    Object.values(row.variables).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="body2">Error loading data: {error}</Typography>
        <Button size="small" onClick={fetchData} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2 }}>
        <TextField
          size="small"
          placeholder="Search by user or variable value..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.5 }} />,
          }}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh data">
            <IconButton onClick={fetchData} size="small" color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
            disabled={data.length === 0}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredData.length} of {data.length} conversations with collected data
          {allVariableKeys.length > 0 && ` • ${allVariableKeys.length} unique variables`}
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                Platform User
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                User Name
              </TableCell>
              {allVariableKeys.map(key => (
                <TableCell
                  key={key}
                  sx={{ fontWeight: 600, backgroundColor: 'background.default', minWidth: 150 }}
                >
                  {key}
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 600, backgroundColor: 'background.default' }}>
                Last Updated
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={allVariableKeys.length + 3} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {data.length === 0
                      ? 'No data collected yet. Variables will appear here once users interact with your bot.'
                      : 'No results match your search.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(row => (
                <TableRow
                  key={row.conversation_id}
                  sx={{
                    '&:hover': { backgroundColor: 'action.hover' },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {row.platform_user_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.platform_user_name || '-'}</Typography>
                  </TableCell>
                  {allVariableKeys.map(key => (
                    <TableCell key={key}>
                      {row.variables[key] !== undefined ? (
                        <Tooltip title={String(row.variables[key])} placement="top">
                          <Chip
                            label={String(row.variables[key])}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{
                              maxWidth: 200,
                              '& .MuiChip-label': {
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              },
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(row.last_extracted_at).toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DataCollectionTable;
