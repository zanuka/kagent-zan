import { getBackendUrl } from "@/lib/utils";
import { AgentMessageConfig, Message, Run, Session } from "@/types/datamodel";

interface RunWithSession {
  run: Run;
  session: Session;
}

import { getWebSocketUrl } from "@/lib/utils";
import type { InitialMessage, TextMessageConfig, WebSocketMessage } from "@/types/datamodel";

interface WebSocketHandlers {
  onMessage: (message: WebSocketMessage) => void;
  onError: (error: string) => void;
  onClose: () => void;
  onStatusChange?: (status: "connecting" | "connected" | "reconnecting" | "closed") => void;
}

export interface WebSocketManager {
  socket: WebSocket | null;
  messageQueue: string[];
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectTimeout: number | null;
  isReconnecting: boolean;
  send: (message: string) => void;
  cleanup: () => void;
}

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function setupWebSocket(runId: string, handlers: WebSocketHandlers, initialMessage?: InitialMessage): WebSocketManager {
  const manager: WebSocketManager = {
    socket: null,
    messageQueue: [],
    reconnectAttempts: 0,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectTimeout: null,
    isReconnecting: false,
    send: () => {},
    cleanup: () => {},
  };

  function connect() {
    try {
      const wsUrl = `${getWebSocketUrl()}/ws/runs/${runId}`;
      const socket = new WebSocket(wsUrl);
      manager.socket = socket;

      handlers.onStatusChange?.("connecting");

      socket.onopen = () => {
        handlers.onStatusChange?.("connected");
        manager.reconnectAttempts = 0;
        manager.isReconnecting = false;

        // Send initial message if provided
        if (initialMessage) {
          socket.send(JSON.stringify(initialMessage));
        }

        // Process any queued messages
        while (manager.messageQueue.length > 0) {
          const message = manager.messageQueue.shift();
          if (message && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
          }
        }
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log("WebSocket message:", message);
          switch (message.type) {
            case "message":
            case "result":
            case "completion":
              if (message.data) {
                handlers.onMessage(message);
              }
              break;
            case "error":
              handlers.onError((message.data as TextMessageConfig).content || "Unknown error occurred");
              break;
            case "system":
              console.log("System message:", message);
              break;
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
          handlers.onError("Failed to parse message");
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        handlers.onError("WebSocket connection error");
        maybeReconnect();
      };

      socket.onclose = (event) => {
        handlers.onStatusChange?.("closed");

        if (!event.wasClean) {
          console.log("WebSocket connection lost. Attempting to reconnect...");
          maybeReconnect();
        }

        handlers.onClose();
      };

      return socket;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      handlers.onError("Failed to create WebSocket connection");
      maybeReconnect();
      return null;
    }
  }

  function maybeReconnect() {
    if (manager.isReconnecting || manager.reconnectAttempts >= manager.maxReconnectAttempts) {
      handlers.onError("Maximum reconnection attempts reached");
      return;
    }

    manager.isReconnecting = true;
    handlers.onStatusChange?.("reconnecting");

    // Exponential backoff with jitter
    const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, manager.reconnectAttempts) + Math.random() * 1000, MAX_RETRY_DELAY);

    manager.reconnectTimeout = window.setTimeout(() => {
      manager.reconnectAttempts++;
      connect();
    }, delay);
  }

  function send(message: string) {
    if (manager.socket?.readyState === WebSocket.OPEN) {
      manager.socket.send(message);
    } else {
      manager.messageQueue.push(message);

      if (manager.socket?.readyState === WebSocket.CLOSED) {
        maybeReconnect();
      }
    }
  }

  function cleanup() {
    if (manager.reconnectTimeout) {
      clearTimeout(manager.reconnectTimeout);
    }

    if (manager.socket) {
      manager.socket.onclose = null; // Prevent reconnection attempts
      manager.socket.close();
    }

    manager.messageQueue = [];
    manager.isReconnecting = false;
  }

  // Create initial connection
  connect();

  // Return manager interface
  return {
    ...manager,
    send,
    cleanup,
  };
}

export const createRunWithSession = async (teamId: number, userId: string): Promise<RunWithSession> => {
  // Create a session
  const sessionResponse = await fetch(`${getBackendUrl()}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, team_id: teamId }),
  }).then((res) => res.json());

  const session = sessionResponse.data as Session;

  const payload = { session_id: session.id, user_id: userId };
  const response = await fetch(`${getBackendUrl()}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create run");
  }

  const runResponse = await response.json();

  // Ensure we're getting the correct ID from the response
  const run: Run = {
    id: runResponse.data.run_id || runResponse.data.id,
    created_at: new Date().toISOString(),
    status: "created",
    task: { content: "", source: "user" },
    team_result: null,
    messages: [],
  };

  // Verify we have a run ID
  if (!run.id) {
    throw new Error("No run ID in response");
  }

  return {
    run,
    session,
  };
};

export const createMessage = (config: AgentMessageConfig, runId: string, sessionId: number, userId: string): Message => ({
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  config,
  session_id: sessionId,
  run_id: runId,
  user_id: userId,
  message_meta: {},
});
