import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ChatIcon from "@mui/icons-material/Chat";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import SearchIcon from "@mui/icons-material/Search";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import HistoryIcon from "@mui/icons-material/History";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
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
} from "@mui/material";
import type { ChipProps } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { alpha } from "@mui/material/styles";

import { useTranslation } from "react-i18next";
import EasyPathAppBar from "../components/AppBar";
import {
  useFlowWebSocket,
  type FlowEvent,
  type FlowExecutionState,
} from "../hooks/useFlowWebSocket";

import {
  useEffect,
  useState,
  useRef,
  type FC,
  useMemo,
  useCallback,
  type ReactNode,
  type SyntheticEvent,
} from "react";

interface Session {
  id: number;
  bot_config_id: number;
  bot_name: string;
  platform: string;
  platform_user_id: string;
  platform_user_name: string | null;
  session_id: string;
  status: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

interface SessionDetail extends Session {
  recent_messages: Array<{
    id: number;
    role: string;
    content: string;
    created_at: string;
  }>;
}

interface TabPanelProps {
  children: ReactNode;
  value: string;
  current: string;
}

const TabPanel = ({ children, value, current }: TabPanelProps) => {
  if (value !== current) {
    return null;
  }

  return <Box sx={{ pt: 2 }}>{children}</Box>;
};

const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

const formatRelativeTime = (dateString: string) => {
  const target = new Date(dateString).getTime();
  if (Number.isNaN(target)) {
    return "--";
  }

  const diffMs = Date.now() - target;
  if (diffMs < 0) {
    return "just now";
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks}w ago`;
  }

  return new Date(dateString).toLocaleDateString();
};

const getStatusColor = (status: string): ChipProps["color"] => {
  switch (status) {
    case "active":
      return "success";
    case "closed":
      return "default";
    case "archived":
      return "warning";
    default:
      return "default";
  }
};

const getEventChipColor = (
  eventType: FlowEvent["event_type"],
): ChipProps["color"] => {
  switch (eventType) {
    case "error":
      return "error";
    case "pathway_selected":
      return "primary";
    case "variable_extracted":
      return "success";
    case "assistant_message":
      return "secondary";
    case "user_message":
      return "info";
    default:
      return "default";
  }
};

const SessionsPage: FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Session["status"]>(
    "all",
  );
  const [platformFilter, setPlatformFilter] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"lastActivity" | "messageCount">(
    "lastActivity",
  );
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(
    null,
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"conversation" | "events">(
    "conversation",
  );
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [liveMessages, setLiveMessages] = useState<
    Array<{ role: string; content: string; timestamp: string }>
  >([]);
  const [liveEvents, setLiveEvents] = useState<FlowEvent[]>([]);
  const [wsExecutionState, setWsExecutionState] =
    useState<FlowExecutionState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isConnected, executionState } = useFlowWebSocket({
    sessionId: selectedSession?.session_id || "",
    enabled: detailDialogOpen && !!selectedSession,
    onEvent: (event) => {
      console.log("Session WebSocket event:", event.event_type, event);
      setLiveEvents((prev) => [...prev.slice(-199), event]);

      if (event.event_type === "assistant_message" && event.message) {
        setLiveMessages((prev) => [
          ...prev.slice(-199),
          {
            role: "assistant",
            content: event.message!,
            timestamp: event.timestamp,
          },
        ]);
      } else if (event.event_type === "user_message" && event.message) {
        setLiveMessages((prev) => [
          ...prev.slice(-199),
          {
            role: "user",
            content: event.message!,
            timestamp: event.timestamp,
          },
        ]);
      }
    },
    onStateUpdate: (state) => {
      console.log("Session WebSocket state update:", state);
      setWsExecutionState(state);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  const fetchSessions = useCallback(
    async (options?: { preserveContent?: boolean }) => {
      if (options?.preserveContent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch("/api/sessions?limit=100");
        if (response.ok) {
          const data = await response.json();
          setSessions(data);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        if (options?.preserveContent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      fetchSessions({ preserveContent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleViewDetails = async (session: Session) => {
    try {
      const response = await fetch(`/api/sessions/${session.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSession(data);
        setDetailTab("conversation");
        setLiveMessages([]);
        setLiveEvents([]);
        setWsExecutionState(null);
        setDetailDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch session details:", error);
    }
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setDetailTab("conversation");
    setLiveMessages([]);
    setLiveEvents([]);
    setWsExecutionState(null);
  };

  const handleCloseSession = async () => {
    if (!selectedSession) {
      return;
    }

    try {
      const response = await fetch(
        `/api/sessions/${selectedSession.id}/close`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        await fetchSessions({ preserveContent: true });
        setCloseDialogOpen(false);
        setDetailDialogOpen(false);
        setSelectedSession(null);
      }
    } catch (error) {
      console.error("Failed to close session:", error);
    }
  };

  const handleResetSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/reset`, {
        method: "POST",
      });

      if (response.ok) {
        await fetchSessions({ preserveContent: true });
      }
    } catch (error) {
      console.error("Failed to reset session:", error);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) {
      console.error("No session selected");
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchSessions({ preserveContent: true });
        setDeleteDialogOpen(false);
        setDetailDialogOpen(false);
        setSelectedSession(null);
      } else {
        const errorText = await response.text();
        console.error("Delete failed:", response.status, errorText);
        alert(`Failed to delete session: ${errorText}`);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert(`Error deleting session: ${error}`);
    }
  };

  const sessionMetrics = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter((session) => session.status === "active").length;
    const closed = sessions.filter((session) => session.status === "closed").length;
    const archived = sessions.filter((session) => session.status === "archived").length;
    const totalMessages = sessions.reduce(
      (acc, session) => acc + session.message_count,
      0,
    );

    return {
      total,
      active,
      closed,
      archived,
      averageMessages: total > 0 ? Math.round(totalMessages / total) : 0,
    };
  }, [sessions]);

  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Set(sessions.map((session) => session.status));
    return Array.from(uniqueStatuses).sort();
  }, [sessions]);

  const platformOptions = useMemo(() => {
    const uniquePlatforms = new Set(sessions.map((session) => session.platform));
    return Array.from(uniquePlatforms).sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    const base = sessions.filter((session) => {
      const matchesSearch =
        normalizedTerm.length === 0 ||
        [
          session.platform_user_name,
          session.platform_user_id,
          session.bot_name,
          session.session_id,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedTerm));

      const matchesStatus =
        statusFilter === "all" || session.status === statusFilter;
      const matchesPlatform =
        platformFilter === "all" || session.platform === platformFilter;

      return matchesSearch && matchesStatus && matchesPlatform;
    });

    const sorted = base.slice();

    if (sortBy === "messageCount") {
      sorted.sort((a, b) => b.message_count - a.message_count);
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime(),
      );
    }

    return sorted;
  }, [
    sessions,
    searchTerm,
    statusFilter,
    platformFilter,
    sortBy,
  ]);

  const combinedMessages = useMemo(() => {
    if (!selectedSession) {
      return [] as Array<{
        id: string | number;
        role: string;
        content: string;
        timestamp: string;
        isLive?: boolean;
      }>;
    }

    const historical = selectedSession.recent_messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
      isLive: false,
    }));

    const live = liveMessages.map((msg, index) => ({
      id: `live-${index}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      isLive: true,
    }));

    return [...historical, ...live];
  }, [selectedSession, liveMessages]);

  const reversedLiveEvents = useMemo(
    () => liveEvents.slice().reverse(),
    [liveEvents],
  );

  const liveExecution = wsExecutionState || executionState;

  const shouldShowSkeleton = loading && sessions.length === 0;

  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    setStatusFilter(event.target.value as typeof statusFilter);
  };

  const handlePlatformFilterChange = (event: SelectChangeEvent<string>) => {
    setPlatformFilter(event.target.value as typeof platformFilter);
  };

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    setSortBy(event.target.value as typeof sortBy);
  };

  const handleDetailTabChange = (_: SyntheticEvent, value: string) => {
    setDetailTab(value as typeof detailTab);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <EasyPathAppBar appBarHeight="large" />
      <Box
        sx={{
          flexGrow: 1,
          p: 3,
          maxWidth: "1400px",
          mx: "auto",
          width: "100%",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              {t("sessionsPage.title", { defaultValue: "Active Sessions" })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("sessionsPage.subtitle", {
                defaultValue:
                  "Monitor live conversations, inspect flow execution, and take action in real time.",
              })}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={
              refreshing ? (
                <CircularProgress size={16} color="inherit" thickness={5} />
              ) : (
                <RefreshIcon />
              )
            }
            onClick={() =>
              fetchSessions({ preserveContent: sessions.length > 0 })
            }
            disabled={refreshing && sessions.length === 0}
          >
            {refreshing
              ? t("sessionsPage.refreshing", { defaultValue: "Refreshing" })
              : t("sessionsPage.refresh", { defaultValue: "Refresh" })}
          </Button>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "repeat(1, minmax(0, 1fr))",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            },
            mb: 3,
          }}
        >
          {[
            {
              label: t("sessionsPage.metrics.total", {
                defaultValue: "Total Sessions",
              }),
              value: sessionMetrics.total,
              caption: t("sessionsPage.metrics.totalCaption", {
                defaultValue: "Across all bots",
              }),
              icon: <PeopleOutlineIcon fontSize="small" />,
              iconColor: theme.palette.primary.main,
              iconBg: alpha(theme.palette.primary.main, 0.12),
            },
            {
              label: t("sessionsPage.metrics.active", {
                defaultValue: "Active",
              }),
              value: sessionMetrics.active,
              caption: t("sessionsPage.metrics.activeCaption", {
                defaultValue: "Currently live",
              }),
              icon: <FiberManualRecordIcon fontSize="small" />,
              iconColor: theme.palette.success.main,
              iconBg: alpha(theme.palette.success.main, 0.12),
            },
            {
              label: t("sessionsPage.metrics.closed", {
                defaultValue: "Closed",
              }),
              value: sessionMetrics.closed,
              caption: t("sessionsPage.metrics.closedCaption", {
                defaultValue: "Awaiting follow-up",
              }),
              icon: <HistoryIcon fontSize="small" />,
              iconColor: theme.palette.grey[700],
              iconBg: alpha(theme.palette.grey[600], 0.08),
            },
            {
              label: t("sessionsPage.metrics.avgMessages", {
                defaultValue: "Avg. Messages",
              }),
              value: sessionMetrics.averageMessages,
              caption: t("sessionsPage.metrics.avgMessagesCaption", {
                defaultValue: "Per session",
              }),
              icon: <ChatBubbleOutlineIcon fontSize="small" />,
              iconColor: theme.palette.secondary.main,
              iconBg: alpha(theme.palette.secondary.main, 0.12),
            },
          ].map((metric) => (
            <Paper
              key={metric.label}
              variant="outlined"
              sx={{
                p: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: metric.iconBg,
                    color: metric.iconColor,
                  }}
                >
                  {metric.icon}
                </Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {metric.label}
                </Typography>
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {metric.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metric.caption}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              fullWidth
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("sessionsPage.filters.search", {
                defaultValue: "Search by user, bot, or ID",
              })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flex={1}>
              <FormControl fullWidth>
                <InputLabel id="sessions-status-filter-label">
                  {t("sessionsPage.filters.status", {
                    defaultValue: "Status",
                  })}
                </InputLabel>
                <Select
                  labelId="sessions-status-filter-label"
                  id="sessions-status-filter"
                  value={statusFilter}
                  label={t("sessionsPage.filters.status", {
                    defaultValue: "Status",
                  })}
                  onChange={handleStatusFilterChange}
                >
                  <MenuItem value="all">
                    {t("sessionsPage.filters.allStatuses", {
                      defaultValue: "All statuses",
                    })}
                  </MenuItem>
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="sessions-platform-filter-label">
                  {t("sessionsPage.filters.platform", {
                    defaultValue: "Platform",
                  })}
                </InputLabel>
                <Select
                  labelId="sessions-platform-filter-label"
                  id="sessions-platform-filter"
                  value={platformFilter}
                  label={t("sessionsPage.filters.platform", {
                    defaultValue: "Platform",
                  })}
                  onChange={handlePlatformFilterChange}
                >
                  <MenuItem value="all">
                    {t("sessionsPage.filters.allPlatforms", {
                      defaultValue: "All platforms",
                    })}
                  </MenuItem>
                  {platformOptions.map((platform) => (
                    <MenuItem key={platform} value={platform}>
                      {platform}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="sessions-sort-filter-label">
                  {t("sessionsPage.filters.sort", {
                    defaultValue: "Sort by",
                  })}
                </InputLabel>
                <Select
                  labelId="sessions-sort-filter-label"
                  id="sessions-sort-filter"
                  value={sortBy}
                  label={t("sessionsPage.filters.sort", {
                    defaultValue: "Sort by",
                  })}
                  onChange={handleSortChange}
                >
                  <MenuItem value="lastActivity">
                    {t("sessionsPage.filters.sortLast", {
                      defaultValue: "Newest activity",
                    })}
                  </MenuItem>
                  <MenuItem value="messageCount">
                    {t("sessionsPage.filters.sortMessages", {
                      defaultValue: "Most messages",
                    })}
                  </MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Paper>

        {shouldShowSkeleton ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 1 }} />
            </Stack>
          </Paper>
        ) : filteredSessions.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 6,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <ChatIcon sx={{ fontSize: 64, color: "text.disabled" }} />
            <Typography variant="h6" color="text.primary">
              {t("sessionsPage.empty.title", {
                defaultValue: "No sessions match your filters",
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("sessionsPage.empty.subtitle", {
                defaultValue: "Try adjusting the filters or wait for new conversations to start.",
              })}
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: "hidden" }}>
            {refreshing && <LinearProgress sx={{ borderRadius: 0 }} />}
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t("sessionsPage.table.user", { defaultValue: "User" })}</TableCell>
                  <TableCell>{t("sessionsPage.table.bot", { defaultValue: "Bot" })}</TableCell>
                  <TableCell>{t("sessionsPage.table.platform", { defaultValue: "Platform" })}</TableCell>
                  <TableCell>{t("sessionsPage.table.status", { defaultValue: "Status" })}</TableCell>
                  <TableCell>{t("sessionsPage.table.messages", { defaultValue: "Messages" })}</TableCell>
                  <TableCell>{t("sessionsPage.table.lastActivity", { defaultValue: "Last Activity" })}</TableCell>
                  <TableCell align="right">{t("sessionsPage.table.actions", { defaultValue: "Actions" })}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSessions.map((session) => {
                  const displayName =
                    session.platform_user_name || session.platform_user_id;
                  const avatarLabel = displayName
                    ? displayName.charAt(0).toUpperCase()
                    : "?";

                  return (
                    <TableRow key={session.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.grey[100],
                              color: theme.palette.text.primary,
                              width: 36,
                              height: 36,
                              fontSize: "0.95rem",
                              fontWeight: 600,
                            }}
                          >
                            {avatarLabel}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {displayName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {session.platform_user_id}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {session.bot_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          #{session.bot_config_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            session.platform.charAt(0).toUpperCase() +
                            session.platform.slice(1)
                          }
                          size="small"
                          variant="outlined"
                          color={
                            session.platform === "telegram"
                              ? "primary"
                              : "secondary"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={session.status}
                          size="small"
                          color={getStatusColor(session.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ChatBubbleOutlineIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {session.message_count}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={formatDate(session.last_message_at)}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <HistoryIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {formatRelativeTime(session.last_message_at)}
                            </Typography>
                          </Stack>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={t("sessionsPage.actions.view", {
                            defaultValue: "View details",
                          })}
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(session)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={t("sessionsPage.actions.reset", {
                            defaultValue: "Reset session",
                          })}
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleResetSession(session.id)}
                              disabled={session.status === "closed"}
                            >
                              <RestartAltIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetailDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="h6" component="div">
                {t("sessionsPage.dialog.title", {
                  defaultValue: "Session Details",
                })}
              </Typography>
              {selectedSession && (
                <Typography variant="caption" color="text.secondary">
                  {t("sessionsPage.dialog.sessionId", {
                    defaultValue: "Session",
                  })}
                  : {selectedSession.session_id}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {selectedSession && (
                <Chip
                  label={`${
                    selectedSession.message_count + liveMessages.length
                  } ${t("sessionsPage.dialog.messages", {
                    defaultValue: "messages",
                  })}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {isConnected ? (
                <Chip
                  icon={<FiberManualRecordIcon />}
                  label={t("sessionsPage.dialog.live", { defaultValue: "Live" })}
                  color="success"
                  size="small"
                  sx={{ "& .MuiChip-icon": { color: "success.main" } }}
                />
              ) : (
                <Chip
                  icon={<FiberManualRecordIcon />}
                  label={t("sessionsPage.dialog.disconnected", {
                    defaultValue: "Disconnected",
                  })}
                  color="default"
                  size="small"
                />
              )}
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "background.default" }}>
          {selectedSession && (
            <Stack spacing={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={3}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.secondary.main, 0.12),
                        color: theme.palette.secondary.main,
                        width: 48,
                        height: 48,
                        fontSize: "1.1rem",
                        fontWeight: 600,
                      }}
                    >
                      {(selectedSession.platform_user_name ||
                        selectedSession.platform_user_id ||
                        "?")
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {selectedSession.platform_user_name ||
                          selectedSession.platform_user_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {selectedSession.platform_user_id}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      label={selectedSession.bot_name}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={
                        selectedSession.platform.charAt(0).toUpperCase() +
                        selectedSession.platform.slice(1)
                      }
                      size="small"
                      color={
                        selectedSession.platform === "telegram"
                          ? "primary"
                          : "secondary"
                      }
                    />
                    <Chip
                      label={selectedSession.status}
                      size="small"
                      color={getStatusColor(selectedSession.status)}
                    />
                  </Stack>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Box
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                      xs: "repeat(1, minmax(0, 1fr))",
                      sm: "repeat(2, minmax(0, 1fr))",
                      md: "repeat(4, minmax(0, 1fr))",
                    },
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("sessionsPage.dialog.createdAt", {
                        defaultValue: "Created",
                      })}
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(selectedSession.created_at)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("sessionsPage.dialog.lastMessage", {
                        defaultValue: "Last activity",
                      })}
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(selectedSession.last_message_at)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("sessionsPage.dialog.sessionIdLabel", {
                        defaultValue: "Session ID",
                      })}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                    >
                      {selectedSession.session_id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("sessionsPage.dialog.messagesCount", {
                        defaultValue: "Messages",
                      })}
                    </Typography>
                    <Typography variant="body2">
                      {selectedSession.message_count + liveMessages.length}
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {liveExecution && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={2}
                  >
                    <Typography variant="subtitle2" color="text.secondary">
                      {t("sessionsPage.dialog.liveExecution", {
                        defaultValue: "Live Execution State",
                      })}
                    </Typography>
                    <Chip
                      label={
                        liveExecution.is_active
                          ? t("sessionsPage.dialog.executionActive", {
                              defaultValue: "Running",
                            })
                          : t("sessionsPage.dialog.executionIdle", {
                              defaultValue: "Idle",
                            })
                      }
                      size="small"
                      color={liveExecution.is_active ? "success" : "default"}
                    />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: {
                        xs: "repeat(1, minmax(0, 1fr))",
                        sm: "repeat(3, minmax(0, 1fr))",
                      },
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("sessionsPage.dialog.currentNode", {
                          defaultValue: "Current node",
                        })}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {liveExecution.current_node_id || "N/A"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("sessionsPage.dialog.messagesProcessed", {
                          defaultValue: "Messages processed",
                        })}
                      </Typography>
                      <Typography variant="body2">
                        {liveExecution.message_history?.length ?? 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("sessionsPage.dialog.isActive", {
                          defaultValue: "Active",
                        })}
                      </Typography>
                      <Typography variant="body2">
                        {liveExecution.is_active
                          ? t("sessionsPage.dialog.yes", { defaultValue: "Yes" })
                          : t("sessionsPage.dialog.no", { defaultValue: "No" })}
                      </Typography>
                    </Box>
                  </Box>

                  {liveExecution.variables &&
                    Object.keys(liveExecution.variables).length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mb: 1 }}
                        >
                          {t("sessionsPage.dialog.extractedVariables", {
                            defaultValue: "Extracted variables",
                          })}
                        </Typography>
                        <Box
                          sx={{
                            display: "grid",
                            gap: 1.5,
                            gridTemplateColumns: {
                              xs: "repeat(1, minmax(0, 1fr))",
                              sm: "repeat(2, minmax(0, 1fr))",
                              md: "repeat(3, minmax(0, 1fr))",
                            },
                          }}
                        >
                          {Object.entries(liveExecution.variables).map(
                            ([key, value]) => (
                              <Paper
                                key={key}
                                variant="outlined"
                                sx={{ p: 1.5, bgcolor: "background.paper" }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {key}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontFamily: "monospace",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {String(value)}
                                </Typography>
                              </Paper>
                            ),
                          )}
                        </Box>
                      </Box>
                    )}
                </Paper>
              )}

              <Box>
                <Tabs
                  value={detailTab}
                  onChange={handleDetailTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab
                    value="conversation"
                    label={t("sessionsPage.tabs.conversation", {
                      defaultValue: "Conversation",
                    })}
                  />
                  <Tab
                    value="events"
                    label={`${t("sessionsPage.tabs.events", {
                      defaultValue: "Flow Events",
                    })} (${liveEvents.length})`}
                  />
                </Tabs>
                <TabPanel value="conversation" current={detailTab}>
                  <Paper
                    variant="outlined"
                    sx={{
                      maxHeight: 420,
                      overflow: "auto",
                      p: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    {combinedMessages.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t("sessionsPage.dialog.noMessages", {
                          defaultValue: "No messages yet for this session.",
                        })}
                      </Typography>
                    ) : (
                      <Stack
                        spacing={2}
                        divider={
                          <Divider
                            flexItem
                            sx={{ borderStyle: "dashed", opacity: 0.4 }}
                          />
                        }
                      >
                        {combinedMessages.map((message) => (
                          <Box key={message.id}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ mb: 0.5, flexWrap: "wrap" }}
                            >
                              <Chip
                                label={message.role}
                                size="small"
                                color={
                                  message.role === "user" ? "primary" : "secondary"
                                }
                                sx={{ height: 20, fontSize: "0.7rem" }}
                              />
                              {message.isLive && (
                                <Chip
                                  label={t("sessionsPage.dialog.liveBadge", {
                                    defaultValue: "LIVE",
                                  })}
                                  size="small"
                                  color="success"
                                  sx={{ height: 18, fontSize: "0.65rem" }}
                                />
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(message.timestamp)}
                              </Typography>
                            </Stack>
                            <Typography variant="body2">
                              {message.content}
                            </Typography>
                          </Box>
                        ))}
                        <div ref={messagesEndRef} />
                      </Stack>
                    )}
                  </Paper>
                </TabPanel>
                <TabPanel value="events" current={detailTab}>
                  <Paper
                    variant="outlined"
                    sx={{
                      maxHeight: 420,
                      overflow: "auto",
                      p: 2,
                      bgcolor: "background.paper",
                    }}
                  >
                    {reversedLiveEvents.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t("sessionsPage.dialog.noEvents", {
                          defaultValue: "No live flow events captured yet.",
                        })}
                      </Typography>
                    ) : (
                      <Stack spacing={1.5}>
                        {reversedLiveEvents.map((event, index) => (
                          <Paper
                            key={`${event.event_type}-${index}`}
                            variant="outlined"
                            sx={{ p: 1.5 }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ mb: 0.5, flexWrap: "wrap" }}
                            >
                              <Chip
                                label={event.event_type}
                                size="small"
                                color={getEventChipColor(event.event_type)}
                                sx={{ height: 18, fontSize: "0.65rem" }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(event.timestamp)}
                              </Typography>
                            </Stack>

                            {event.node_id && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: "monospace",
                                  display: "block",
                                }}
                              >
                                Node: {event.node_id}
                              </Typography>
                            )}

                            {event.reasoning && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                              >
                                {event.reasoning}
                              </Typography>
                            )}

                            {event.variable_name && (
                              <Typography
                                variant="body2"
                                sx={{ mt: 0.5, fontFamily: "monospace" }}
                              >
                                {event.variable_name}: {String(event.variable_value)}
                              </Typography>
                            )}
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </TabPanel>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5 }}>
          <Button onClick={handleCloseDetailDialog} color="inherit">
            {t("sessionsPage.dialog.close", { defaultValue: "Close" })}
          </Button>
          {selectedSession && selectedSession.status === "active" && (
            <Button
              startIcon={<CloseIcon />}
              color="warning"
              onClick={() => setCloseDialogOpen(true)}
            >
              {t("sessionsPage.dialog.closeSession", {
                defaultValue: "Close Session",
              })}
            </Button>
          )}
          <Button
            startIcon={<DeleteIcon />}
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
          >
            {t("sessionsPage.dialog.delete", { defaultValue: "Delete" })}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)}>
        <DialogTitle>
          {t("sessionsPage.confirmClose.title", {
            defaultValue: "Close Session?",
          })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("sessionsPage.confirmClose.description", {
              defaultValue:
                "This will close the session and prevent further messages from being processed. The user will need to start a new conversation.",
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)} color="inherit">
            {t("sessionsPage.confirmClose.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            onClick={handleCloseSession}
            color="warning"
            variant="contained"
          >
            {t("sessionsPage.confirmClose.confirm", {
              defaultValue: "Close Session",
            })}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          {t("sessionsPage.confirmDelete.title", {
            defaultValue: "Delete Session?",
          })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("sessionsPage.confirmDelete.description", {
              defaultValue:
                "This will permanently delete the session and all its messages. This action cannot be undone.",
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            {t("sessionsPage.confirmDelete.cancel", {
              defaultValue: "Cancel",
            })}
          </Button>
          <Button
            onClick={handleDeleteSession}
            color="error"
            variant="contained"
          >
            {t("sessionsPage.confirmDelete.confirm", {
              defaultValue: "Delete Permanently",
            })}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsPage;
