import { Run, Session } from "@/types/datamodel";
import type { InitialMessage, TextMessageConfig, WebSocketMessage } from "@/types/datamodel";
import { createSession } from "@/app/actions/sessions";
import { createRun } from "@/app/actions/runs";
import { getWsUrl } from "./utils";

interface RunWithSession {
  run: Run;
  session: Session;
}

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
      const wsUrl = `${getWsUrl()}/runs/${runId}`;
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
  const sessionResponse = await createSession({ userId, teamId });
  if (!sessionResponse.success || !sessionResponse.data) {
    throw new Error("Failed to create session");
  }

  const session = sessionResponse.data;
  const payload = { session_id: session.id, user_id: userId };

  const runResponse = await createRun(payload);
  if (!runResponse.success || !runResponse.data) {
    throw new Error("Failed to create run");
  }

  // Ensure we're getting the correct ID from the response
  const run: Run = {
    id: runResponse.data.run_id,
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
