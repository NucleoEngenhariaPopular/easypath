import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ChatIcon from "@mui/icons-material/Chat";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
} from "@mui/material";

import { useTranslation } from "react-i18next";
import EasyPathAppBar from "../components/AppBar";
import {
  useFlowWebSocket,
  type FlowEvent,
  type FlowExecutionState,
} from "../hooks/useFlowWebSocket";

import { useEffect, useState, useRef, type FC } from "react";

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

const SessionsPage: FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(
    null,
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // WebSocket real-time monitoring
  const [liveMessages, setLiveMessages] = useState<
    Array<{ role: string; content: string; timestamp: string }>
  >([]);
  const [liveEvents, setLiveEvents] = useState<FlowEvent[]>([]);
  const [wsExecutionState, setWsExecutionState] =
    useState<FlowExecutionState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for selected session
  const { isConnected, lastEvent, executionState } = useFlowWebSocket({
    sessionId: selectedSession?.session_id || "",
    enabled: detailDialogOpen && !!selectedSession,
    onEvent: (event) => {
      console.log("Session WebSocket event:", event.event_type, event);
      setLiveEvents((prev) => [...prev, event]);

      // Track assistant messages
      if (event.event_type === "assistant_message" && event.message) {
        setLiveMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: event.message!,
            timestamp: event.timestamp,
          },
        ]);
      }
      // Track user messages
      else if (event.event_type === "user_message" && event.message) {
        setLiveMessages((prev) => [
          ...prev,
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions?limit=100");
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleViewDetails = async (session: Session) => {
    try {
      const response = await fetch(`/api/sessions/${session.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSession(data);
        // Reset live monitoring data
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
    // Clear live data when closing
    setLiveMessages([]);
    setLiveEvents([]);
    setWsExecutionState(null);
  };

  const handleCloseSession = async () => {
    if (!selectedSession) return;

    try {
      const response = await fetch(
        `/api/sessions/${selectedSession.id}/close`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        await fetchSessions();
        setCloseDialogOpen(false);
        setDetailDialogOpen(false);
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
        await fetchSessions();
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
      console.log("Deleting session:", selectedSession.id);
      const response = await fetch(`/api/sessions/${selectedSession.id}`, {
        method: "DELETE",
      });

      console.log("Delete response:", response.status);

      if (response.ok) {
        console.log("Session deleted successfully");
        await fetchSessions();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, color: "text.primary" }}
          >
            Active Sessions
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSessions}
          >
            Refresh
          </Button>
        </Box>

        {loading ? (
          <Typography>Loading sessions...</Typography>
        ) : sessions.length === 0 ? (
          <Card sx={{ p: 4, textAlign: "center" }}>
            <ChatIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No active sessions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sessions will appear here when users start conversations with your
              bots
            </Typography>
          </Card>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Bot</TableCell>
                  <TableCell>Platform</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Messages</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {session.platform_user_name || session.platform_user_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {session.platform_user_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {session.bot_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          session.platform.charAt(0).toUpperCase() +
                          session.platform.slice(1)
                        }
                        size="small"
                        color={
                          session.platform === "telegram"
                            ? "primary"
                            : "success"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={session.status}
                        size="small"
                        color={getStatusColor(session.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {session.message_count}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(session.last_message_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(session)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Session">
                        <IconButton
                          size="small"
                          onClick={() => handleResetSession(session.id)}
                          disabled={session.status === "closed"}
                        >
                          <RestartAltIcon fontSize="small" />
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

      {/* Session Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetailDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Session Details</span>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isConnected ? (
                <Chip
                  icon={<FiberManualRecordIcon />}
                  label="Live"
                  color="success"
                  size="small"
                  sx={{ "& .MuiChip-icon": { color: "success.main" } }}
                />
              ) : (
                <Chip
                  icon={<FiberManualRecordIcon />}
                  label="Disconnected"
                  color="default"
                  size="small"
                />
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box>
              {/* Session Info */}
              <Box sx={{ display: "flex", gap: 3, mb: 3, flexWrap: "wrap" }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    User
                  </Typography>
                  <Typography variant="body1">
                    {selectedSession.platform_user_name ||
                      selectedSession.platform_user_id}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bot
                  </Typography>
                  <Typography variant="body1">
                    {selectedSession.bot_name}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Session ID
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                >
                  {selectedSession.session_id}
                </Typography>
              </Box>

              {/* Live Execution State */}
              {(wsExecutionState || executionState) && (
                <Box sx={{ mb: 3 }}>
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Live Execution State
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Current Node
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {(wsExecutionState || executionState)
                              ?.current_node_id || "N/A"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Active
                          </Typography>
                          <Typography variant="body2">
                            {(wsExecutionState || executionState)?.is_active
                              ? "Yes"
                              : "No"}
                          </Typography>
                        </Box>
                      </Box>
                      {(wsExecutionState || executionState)?.variables &&
                        Object.keys(
                          (wsExecutionState || executionState)!.variables,
                        ).length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Extracted Variables
                            </Typography>
                            <Box
                              sx={{
                                mt: 1,
                                p: 1,
                                bgcolor: "background.paper",
                                borderRadius: 1,
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              {Object.entries(
                                (wsExecutionState || executionState)!.variables,
                              ).map(([key, value]) => (
                                <Box key={key} sx={{ mb: 0.5 }}>
                                  <Typography
                                    variant="caption"
                                    component="span"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {key}:
                                  </Typography>{" "}
                                  <Typography
                                    variant="caption"
                                    component="span"
                                  >
                                    {String(value)}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}

              {/* Messages Section */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Messages (
                  {selectedSession.message_count + liveMessages.length} total)
                  {liveMessages.length > 0 && (
                    <Chip
                      label={`${liveMessages.length} new`}
                      size="small"
                      color="success"
                      sx={{ ml: 1, height: 18, fontSize: "0.65rem" }}
                    />
                  )}
                </Typography>
                <Box
                  sx={{
                    maxHeight: 400,
                    overflow: "auto",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 2,
                    bgcolor: "background.default",
                  }}
                >
                  {/* Historical messages from database */}
                  {selectedSession.recent_messages.map((msg) => (
                    <Box key={msg.id} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Chip
                          label={msg.role}
                          size="small"
                          color={msg.role === "user" ? "primary" : "secondary"}
                          sx={{ height: 20, fontSize: "0.7rem" }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(msg.created_at)}
                        </Typography>
                      </Box>
                      <Typography variant="body2">{msg.content}</Typography>
                    </Box>
                  ))}

                  {/* Live messages from WebSocket */}
                  {liveMessages.map((msg, idx) => (
                    <Box
                      key={`live-${idx}`}
                      sx={{
                        mb: 2,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor:
                          msg.role === "user" ? "primary.50" : "secondary.50",
                        border: "1px solid",
                        borderColor:
                          msg.role === "user" ? "primary.200" : "secondary.200",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Chip
                          label={msg.role}
                          size="small"
                          color={msg.role === "user" ? "primary" : "secondary"}
                          sx={{ height: 20, fontSize: "0.7rem" }}
                        />
                        <Chip
                          label="LIVE"
                          size="small"
                          color="success"
                          sx={{ height: 18, fontSize: "0.65rem" }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      <Typography variant="body2">{msg.content}</Typography>
                    </Box>
                  ))}

                  {/* Auto-scroll anchor */}
                  <div ref={messagesEndRef} />
                </Box>
              </Box>

              {/* Live Events Section */}
              {liveEvents.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Flow Events ({liveEvents.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ maxHeight: 300, overflow: "auto" }}>
                        {liveEvents
                          .slice()
                          .reverse()
                          .map((event, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                mb: 1.5,
                                p: 1,
                                borderRadius: 1,
                                bgcolor: "background.paper",
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mb: 0.5,
                                }}
                              >
                                <Chip
                                  label={event.event_type}
                                  size="small"
                                  color={
                                    event.event_type === "error"
                                      ? "error"
                                      : event.event_type === "pathway_selected"
                                        ? "primary"
                                        : event.event_type ===
                                            "variable_extracted"
                                          ? "success"
                                          : "default"
                                  }
                                  sx={{ height: 18, fontSize: "0.65rem" }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {new Date(
                                    event.timestamp,
                                  ).toLocaleTimeString()}
                                </Typography>
                              </Box>

                              {event.node_id && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  sx={{
                                    fontFamily: "monospace",
                                    fontSize: "0.7rem",
                                  }}
                                >
                                  Node: {event.node_id}
                                </Typography>
                              )}

                              {event.reasoning && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                  sx={{ mt: 0.5 }}
                                >
                                  {event.reasoning}
                                </Typography>
                              )}

                              {event.variable_name && (
                                <Typography
                                  variant="caption"
                                  display="block"
                                  sx={{ mt: 0.5 }}
                                >
                                  <strong>{event.variable_name}:</strong>{" "}
                                  {String(event.variable_value)}
                                </Typography>
                              )}
                            </Box>
                          ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailDialog}>Close</Button>
          {selectedSession && selectedSession.status === "active" && (
            <Button
              startIcon={<CloseIcon />}
              color="warning"
              onClick={() => {
                setCloseDialogOpen(true);
              }}
            >
              Close Session
            </Button>
          )}
          <Button
            startIcon={<DeleteIcon />}
            color="error"
            onClick={() => {
              setDeleteDialogOpen(true);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Confirmation Dialog */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)}>
        <DialogTitle>Close Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will close the session and prevent further messages from being
            processed. The user will need to start a new conversation.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCloseSession}
            color="warning"
            variant="contained"
          >
            Close Session
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Session?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the session and all its messages. This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteSession}
            color="error"
            variant="contained"
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionsPage;
