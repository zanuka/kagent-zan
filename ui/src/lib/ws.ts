import { getBackendUrl } from "@/lib/utils";
import { AgentMessageConfig, CreateRunResponse, Message, Session, Team, WebSocketMessage } from "@/types/datamodel";

export interface RunWithSession {
  run: CreateRunResponse;
  session: Session;
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
  return {
    run: runResponse.data as CreateRunResponse,
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
  message_meta: {
  },
});

export const setupWebSocket = (runId: string, query: string, team_config: Team | null, onMessage: (message: WebSocketMessage) => void): WebSocket => {
  if (!team_config) {
    throw new Error("Team config is required");
  }
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProtocol}//localhost:8081/api/ws/runs/${runId}`;

  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    socket.send(
      JSON.stringify({
        type: "start",
        task: query,
        team_config: team_config.component,
      })
    );
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      onMessage(message);
    } catch (error) {
      console.error("WebSocket message parsing error:", error);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket closed");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return socket;
};
