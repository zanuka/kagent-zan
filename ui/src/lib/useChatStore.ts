import { AgentMessageConfig, InitialMessage, Message, Run, RunStatus, Session, Team, WebSocketMessage } from "@/types/datamodel";
import { create } from "zustand";
import { createMessage, createRunWithSession, setupWebSocket, WebSocketManager } from "./ws";
import { fetchApi } from "./utils";

interface ChatState {
  session: Session | null;
  run: Run | null;
  messages: Message[];
  status: RunStatus | "ready";
  error: string | null;
  websocketManager: WebSocketManager | null;
  team: Team | null;
  userId: string;

  // Actions
  startNewChat: (agentId: number, userId: string) => Promise<void>;
  sendMessage: (content: string, agentId: number, userId: string) => Promise<void>;
  loadExistingChat: (chatId: string, userId: string) => Promise<void>;
  cleanup: () => void;
  handleWebSocketMessage: (message: WebSocketMessage) => void;
}

const useChatStore = create<ChatState>((set, get) => ({
  session: null,
  run: null,
  messages: [],
  status: "ready",
  error: null,
  websocketManager: null,
  team: null,
  userId: "",

  startNewChat: async (agentId, userId) => {
    set({ status: "created" });
    try {
      // Clean up any existing websocket
      const currentManager = get().websocketManager;
      if (currentManager) {
        currentManager.cleanup();
      }

      set({ userId });

      // Fetch agent details if not already present
      if (!get().team) {
        const team = await fetchApi<Team>(`/teams/${agentId}`, userId);
        set({ team });
      }

      const { session, run } = await createRunWithSession(agentId, userId);
      set({
        session,
        run,
        messages: [],
        status: "created",
        error: null,
        websocketManager: null,
      });
    } catch (error) {
      set({
        error: `Failed to start chat: ${error}`,
        status: "error",
        session: null,
        run: null,
        messages: [],
        websocketManager: null,
      });
    }
  },

  handleWebSocketMessage: (message: WebSocketMessage) => {
    const state = get();
    const { run, session } = state;

    if (!run) {
      console.warn("Received WebSocket message but no current run exists");
      return;
    }

    if (!session?.id) {
      console.warn("No session ID available");
      return;
    }

    const newMessage = createMessage(
      message.data as AgentMessageConfig,
      run.id,
      session.id,
      get().userId
    );

    // Check for duplicates
    const isDuplicate = state.messages.some((existingMsg) => existingMsg.config.content === newMessage.config.content && existingMsg.config.source === newMessage.config.source);

    if (isDuplicate) return;

    const newStatus = message.status || run.status;

    set({
      messages: [...state.messages, newMessage],
      run: {
        ...run,
        messages: [...run.messages, newMessage],
        status: newStatus,
      },
      status: newStatus,
    });
  },

  sendMessage: async (content, agentId, userId) => {
    const state = get();

    try {
      // If no session exists, create one
      if (!state.session || !state.run) {
        await get().startNewChat(agentId, userId);
      }

      const currentState = get();
      const session = currentState.session;
      const run = currentState.run;
      const team = currentState.team;

      if (!session || !run) {
        throw new Error("Failed to create session");
      }

      let manager = currentState.websocketManager;
      if (!manager) {
        const startMessage: InitialMessage = {
          type: "start",
          task: content,
          team_config: team?.component,
        };

        manager = setupWebSocket(
          run.id,
          {
            onMessage: (message) => get().handleWebSocketMessage(message),
            onError: (error) => set({ error, status: "error" }),
            onClose: () => set({ status: "complete" }),
            onStatusChange: (status) => {
              set({ status: status === "connected" ? "active" : "created" });
            },
          },
          // Initial config for new chats
          startMessage
        );

        set({ websocketManager: manager });
      }

      const userMessage = createMessage({ content, source: "user" }, run.id, session.id || -1, userId);
      set({
        messages: [...currentState.messages, userMessage],
        run: {
          ...run,
          messages: [...run.messages, userMessage],
        },
      });

      // Send message
      manager.send(
        JSON.stringify({
          type: "message",
          content,
          runId: run.id,
          sessionId: session.id,
        })
      );
    } catch (error) {
      set({ error: `Failed to send message: ${error}`, status: "error" });
    }
  },

  loadExistingChat: async (chatId, userId) => {
    set({ status: "complete" });
    try {
      // Clean up any existing websocket
      const currentManager = get().websocketManager;
      if (currentManager) {
        currentManager.cleanup();
      }

      const session = await fetchApi<Session>(`/sessions/${chatId}`, userId);
      const { runs } = await fetchApi<{ runs: Run[] }>(`/sessions/${chatId}/runs`, userId);

      if (!runs || runs.length === 0) {
        throw new Error("No runs found for this chat");
      }

      // Fetch agent details if not present
      if (!get().team && session.team_id) {
        const team = await fetchApi<Team>(`/teams/${session.team_id}`, userId);
        set({ team });
      }

      set({
        session,
        run: runs[0],
        messages: runs[0].messages || [],
        status: runs[0].status,
        error: null,
        websocketManager: null,
      });
    } catch (error) {
      set({
        error: `Failed to load chat: ${error}`,
        status: "error",
        session: null,
        run: null,
        messages: [],
        websocketManager: null,
      });
    }
  },

  cleanup: () => {
    const { websocketManager } = get();
    if (websocketManager) {
      websocketManager.cleanup();
    }
    set({
      session: null,
      run: null,
      messages: [],
      status: "stopped",
      websocketManager: null,
      error: null,
      team: null,
    });
  },
}));

export default useChatStore;
