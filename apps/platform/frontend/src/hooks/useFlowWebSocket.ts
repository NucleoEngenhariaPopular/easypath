import { useEffect, useRef, useState, useCallback } from "react";

export interface PathwayOption {
  label: string;
  description: string;
  target: string;
}

export interface FlowEvent {
  event_type: string;
  timestamp: string;
  session_id: string;
  metadata?: Record<string, any>;
  // Event-specific fields
  node_id?: string;
  node_type?: string;
  node_name?: string;
  from_node_id?: string;
  to_node_id?: string;
  connection_id?: string;
  connection_label?: string;
  reasoning?: string;
  confidence_score?: number;
  available_pathways?: PathwayOption[];
  llm_response?: string;
  variable_name?: string;
  variable_value?: any;
  all_variables?: Record<string, any>;
  response_text?: string;
  message?: string;
  error_message?: string;
  error_type?: string;
  tokens_used?: number;
  // DecisionStepEvent fields
  step_name?: string;
  node_prompt?: {
    context: string;
    objective: string;
    notes: string;
    examples: string;
  };
  previous_node_id?: string;
  previous_node_name?: string;
  chosen_pathway?: string;
  pathway_confidence?: number;
  llm_reasoning?: string;
  variables_extracted?: Record<string, any>;
  variables_status?: Record<string, boolean>;
  assistant_response?: string;
  timing_ms?: number;
  cost_usd?: number;
  model_name?: string;
}

export interface DecisionLog {
  id: string; // timestamp-based unique ID
  timestamp: string;
  stepName: string;
  nodeId: string;
  nodeName?: string;
  nodePrompt?: {
    context: string;
    objective: string;
    notes: string;
    examples: string;
  };
  previousNodeId?: string;
  previousNodeName?: string;
  availablePathways: PathwayOption[];
  chosenPathway?: string;
  pathwayConfidence?: number;
  llmReasoning?: string;
  variablesExtracted?: Record<string, any>;
  variablesStatus?: Record<string, boolean>;
  assistantResponse?: string;
  timingMs?: number;
  tokensUsed?: number;
  costUsd?: number;
  modelName?: string;
}

export interface FlowExecutionState {
  session_id: string;
  current_node_id?: string;
  variables: Record<string, any>;
  message_history: Array<{ role: string; content: string }>;
  is_active: boolean;
}

interface UseFlowWebSocketOptions {
  sessionId: string;
  flowId?: string;
  onEvent?: (event: FlowEvent) => void;
  onStateUpdate?: (state: FlowExecutionState) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
  autoReconnect?: boolean; // Enable automatic reconnection on disconnect
  maxReconnectAttempts?: number; // Maximum reconnection attempts
  reconnectDelay?: number; // Initial delay before reconnecting (ms)
}

export function useFlowWebSocket({
  sessionId,
  flowId,
  onEvent,
  onStateUpdate,
  onError,
  enabled = true,
  autoReconnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000,
}: UseFlowWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<FlowEvent | null>(null);
  const [executionState, setExecutionState] =
    useState<FlowExecutionState | null>(null);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Don't connect if disabled, no sessionId, or already connected
    if (!enabled || !sessionId) {
      return;
    }

    // Check if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    // Clear any pending reconnect attempts
    clearReconnectTimeout();

    // Determine WebSocket URL - use environment variable or default to engine port
    const enginePort = import.meta.env.VITE_ENGINE_PORT || "8081";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const flowParam = flowId ? `?flow_id=${flowId}` : "";
    const wsUrl = `${protocol}//${host}:${enginePort}/ws/session/${sessionId}${flowParam}`;

    console.log("Connecting to WebSocket:", wsUrl, "attempt:", reconnectAttemptsRef.current + 1);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        isManualDisconnectRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          // Handle plain text ping (backend can send both JSON and plain text)
          if (typeof event.data === "string" && event.data.trim() === "ping") {
            console.log("Received plain text ping, sending pong");
            ws.send("pong");
            return;
          }

          const data = JSON.parse(event.data);

          // Handle JSON ping/pong heartbeat
          if (data.type === "ping") {
            console.log("Received JSON ping, sending pong");
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }

          // Check if it's a state update or an event
          if (data.is_active !== undefined) {
            // It's a FlowExecutionState
            const state = data as FlowExecutionState;
            setExecutionState(state);
            onStateUpdate?.(state);
          } else if (data.event_type) {
            // It's a FlowEvent
            const flowEvent = data as FlowEvent;
            setLastEvent(flowEvent);
            onEvent?.(flowEvent);

            console.log(
              "Received WebSocket event:",
              flowEvent.event_type,
              flowEvent,
            );
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error, "data:", event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        onError?.(error);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          isManual: isManualDisconnectRef.current,
        });
        setIsConnected(false);
        wsRef.current = null;

        // Only attempt reconnect if:
        // 1. Auto-reconnect is enabled
        // 2. It wasn't a manual disconnect
        // 3. We haven't exceeded max attempts
        // 4. Connection is still enabled
        // 5. Close code indicates it's worth retrying (not 1000 Normal Closure or 1001 Going Away)
        const shouldReconnect =
          autoReconnect &&
          !isManualDisconnectRef.current &&
          enabled &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          event.code !== 1000 && // Normal closure
          event.code !== 1001; // Going away (usually intentional)

        if (shouldReconnect) {
          reconnectAttemptsRef.current += 1;
          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff
          console.log(
            `Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`
          );
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error("Max reconnection attempts reached");
          onError?.(new Event("max_reconnect_attempts"));
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setIsConnected(false);
      onError?.(error as Event);

      // Retry connection on error
      if (autoReconnect && enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current += 1;
        const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [
    sessionId,
    flowId,
    enabled,
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    onEvent,
    onStateUpdate,
    onError,
    clearReconnectTimeout,
  ]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    clearReconnectTimeout();
    reconnectAttemptsRef.current = 0;

    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect"); // Normal closure
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [clearReconnectTimeout]);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      console.warn("Cannot send message: WebSocket is not open");
    }
  }, []);

  useEffect(() => {
    if (enabled && sessionId) {
      console.log(
        "WebSocket effect running - session:",
        sessionId.substring(0, 8),
        "enabled:",
        enabled,
      );
      console.log("Current WebSocket state:", wsRef.current?.readyState);

      // Disconnect existing connection if any before connecting with new sessionId
      if (wsRef.current) {
        console.log("Disconnecting existing WebSocket before reconnect");
        disconnect();
      }

      // Small delay to ensure clean disconnect before reconnecting
      const timer = setTimeout(() => {
        console.log(
          "Attempting to connect to new session:",
          sessionId.substring(0, 8),
        );
        connect();
      }, 50);

      return () => {
        console.log("WebSocket effect cleanup timer - clearing timeout");
        clearTimeout(timer);
        clearReconnectTimeout();
      };
    } else if (!enabled) {
      console.log("WebSocket disabled, disconnecting");
      disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      clearReconnectTimeout();
    };
  }, [disconnect, clearReconnectTimeout]);

  return {
    isConnected,
    lastEvent,
    executionState,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}
