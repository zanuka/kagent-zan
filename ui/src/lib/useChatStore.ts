import { create } from "zustand";
import { ChatStatus, setupWebSocket, WebSocketManager } from "./ws";
import { AgentMessageConfig, InitialMessage, Message, Run, Session, Team, WebSocketMessage, SessionWithRuns } from "@/types/datamodel";
import { loadExistingChat, sendMessage, startNewChat } from "@/app/actions/chat";

interface ChatState {
  session: Session | null;
  sessions: SessionWithRuns[];
  run: Run | null;
  messages: Message[];
  status: ChatStatus;
  error: string | null;
  websocketManager: WebSocketManager | null;
  team: Team | null;

  // Actions
  initializeNewChat: (agentId: number) => Promise<void>;
  sendUserMessage: (content: string, agentId: number) => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  cleanup: () => void;
  handleWebSocketMessage: (message: WebSocketMessage) => void;
  setSessions: (sessions: SessionWithRuns[]) => void;
  addSession: (session: Session, runs: Run[]) => void;
  removeSession: (sessionId: number) => void;
}

const useChatStore = create<ChatState>((set, get) => ({
  session: null,
  sessions: [],
  run: null,
  messages: [],
  status: "ready",
  error: null,
  websocketManager: null,
  team: null,

  setSessions: (sessions) => {
    set({ sessions });
  },

  addSession: (session, runs) => {
    set((state) => ({
      sessions: [{ session, runs }, ...state.sessions],
    }));
  },

  removeSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.session.id !== sessionId),
    }));
  },


  initializeNewChat: async (agentId) => {
    try {
      // Clean up any existing websocket
      get().cleanup();
  
      const { team, session, run } = await startNewChat(agentId);
  
      // Add the new session to sessions list
      get().addSession(session, [run]);
  
      set({
        team,
        session,
        run,
        messages: [],
        status: "ready",
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

    if (!run || !session?.id) return;

    if (!message.data) {
      console.warn("Received message without data", message);
      return;
    }

    const messageConfig = message.data as AgentMessageConfig;
    const newMessage = {
      config: messageConfig,
      session_id: session.id,
      run_id: run.id,
      message_meta: {},
    };
    const isDuplicate = state.messages.some((msg) => msg.config.content === messageConfig.content && msg.config.source === messageConfig.source);
    if (isDuplicate) return;

    // Update the run in both the current session and sessions list
    const updatedRun = {
      ...run,
      messages: [...run.messages, newMessage],
      status: message.status || run.status,
    };

    set((state) => {
      // Update the sessions list with the new run
      const updatedSessions = state.sessions.map((s) => {
        if (s.session.id === session.id) {
          return {
            ...s,
            runs: s.runs.map((r) => (r.id === run.id ? updatedRun : r)),
          };
        }
        return s;
      });

      return {
        messages: [...state.messages, newMessage],
        run: updatedRun,
        sessions: updatedSessions,
        // Status will already be set to "ready" by the WebSocket handler
      };
    });
    
    // Don't explicitly set status here since the WebSocket handler takes care of it
  },

  sendUserMessage: async (content, agentId) => {
    const state = get();
    
    // Immediately set status to "thinking"
    set({ status: "thinking" });
    
    try {
      // If no session exists, create one
      if (!state.session || !state.run) {
        await get().initializeNewChat(agentId);
        set({ status: "thinking" });
      }
  
      const currentState = get();
      const { session, run, team } = currentState;
      if (!session?.id || !run) {
        throw new Error("Failed to create session");
      }

      if (!team) {
        throw new Error("Failed to get team details");
      }
      // Create and store message on server
      const userMessage = await sendMessage(content, run.id, session.id);
      
      // Update both local state and sessions list regardless of whether this is the first message
      set((state) => {
        const updatedRun = {
          ...run,
          messages: [...run.messages, userMessage],
        };
  
        const updatedSessions = state.sessions.map((s) => {
          if (s.session.id === session.id) {
            return {
              ...s,
              runs: s.runs.map((r) => (r.id === run.id ? updatedRun : r)),
            };
          }
          return s;
        });
  
        return {
          messages: [...state.messages, userMessage],
          run: updatedRun,
          sessions: updatedSessions,
        };
      });
      
      // Check if we already have a websocket manager
      let manager = currentState.websocketManager;
      
      if (!manager) {
        // First message - setup WebSocket with initial message
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
            onClose: () => {
              const currentStatus = get().status;
              if (currentStatus !== "error") {
                set({ status: "ready" });
              }
            },
            onStatusChange: (status) => {
              set({ status });
            },
          },
          startMessage
        );
  
        set({ websocketManager: manager });
        // Return here because the first message is sent via the startMessage
        return;
      } else {
        // Subsequent messages - send as input_response
        const messagePayload = {
          type: "input_response",
          response: content,
          runId: run.id,
          sessionId: session.id,
        };
        manager.send(JSON.stringify(messagePayload));
      }
    } catch (error) {
      set({ 
        error: `Failed to send message: ${error}`, 
        status: "error" 
      });
    }
  },

  loadChat: async (chatId) => {
    set({ status: "ready" });
    try {
      // Clean up existing websocket
      get().cleanup();

      const { session, run, team, messages } = await loadExistingChat(chatId);

      // Update sessions list
      if (session && run) {
        get().addSession(session, [run]);
      }

      // Determine initial status based on run status
      let initialStatus: ChatStatus = "ready";
      
      if (run.status === "error" || run.status === "timeout") {
        initialStatus = "error";
      }
      
      set({
        session,
        run,
        team,
        messages,
        status: initialStatus,
        error: run.error_message || null,
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
      status: "ready",
      websocketManager: null,
      error: null,
      team: null,
    });
  },
}));

export default useChatStore;