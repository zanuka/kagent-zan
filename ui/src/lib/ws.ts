import { getBackendUrl } from "@/lib/utils";
import { AgentMessageConfig, CreateRunResponse, Message, Session } from "@/types/datamodel";

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
