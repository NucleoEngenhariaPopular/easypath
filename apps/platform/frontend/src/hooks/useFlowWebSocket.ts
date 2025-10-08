import { useEffect, useRef, useState, useCallback } from 'react';

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
  variable_name?: string;
  variable_value?: any;
  all_variables?: Record<string, any>;
  response_text?: string;
  message?: string;
  error_message?: string;
  error_type?: string;
  tokens_used?: number;
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
}

export function useFlowWebSocket({
  sessionId,
  flowId,
  onEvent,
  onStateUpdate,
  onError,
  enabled = true,
}: UseFlowWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<FlowEvent | null>(null);
  const [executionState, setExecutionState] = useState<FlowExecutionState | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !sessionId || wsRef.current?.readyState === WebSocket.OPEN) return;

    // Determine WebSocket URL (ws:// for http, wss:// for https)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '8081'; // Engine port
    const flowParam = flowId ? `?flow_id=${flowId}` : '';
    const wsUrl = `${protocol}//${host}:${port}/ws/session/${sessionId}${flowParam}`;

    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Check if it's a state update or an event
        if (data.is_active !== undefined) {
          // It's a FlowExecutionState
          const state = data as FlowExecutionState;
          setExecutionState(state);
          onStateUpdate?.(state);
        } else {
          // It's a FlowEvent
          const flowEvent = data as FlowEvent;
          setLastEvent(flowEvent);
          onEvent?.(flowEvent);

          console.log('Received WebSocket event:', flowEvent.event_type, flowEvent);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;
    };

    wsRef.current = ws;
  }, [sessionId, flowId, enabled, onEvent, onStateUpdate, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    }
  }, []);

  useEffect(() => {
    if (enabled && sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionId]);

  return {
    isConnected,
    lastEvent,
    executionState,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}
