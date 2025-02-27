import { create } from "zustand";
import { ChatStatus, setupWebSocket, WebSocketManager } from "./ws";
import { AgentMessageConfig, InitialMessage, Message, Run, Session, Team, WebSocketMessage, SessionWithRuns } from "@/types/datamodel";
import { loadExistingChat, sendMessage, startNewChat } from "@/app/actions/chat";
import { messageUtils } from "./utils";

interface ChatState {
  session: Session | null;
  sessions: SessionWithRuns[];
  run: Run | null;
  messages: Message[];
  status: ChatStatus;
  error: string | null;
  websocketManager: WebSocketManager | null;
  team: Team | null;
  currentStreamingContent: string;
  currentStreamingMessage: Message | null; // Add this to track the current streaming message

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
  currentStreamingContent: "",
  currentStreamingMessage: null,

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
        currentStreamingContent: "",
        currentStreamingMessage: null,
      });
    } catch (error) {
      set({
        error: `Failed to start chat: ${error}`,
        status: "error",
        session: null,
        run: null,
        messages: [],
        websocketManager: null,
        currentStreamingContent: "",
        currentStreamingMessage: null,
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
    if (message.type === "message" && !messageUtils.isUserTextMessageContent(messageConfig)) {
      if (
        messageUtils.isTextMessageContent(messageConfig.content) ||
        messageUtils.isFunctionExecutionResult(messageConfig.content) ||
        messageUtils.isToolCallContent(messageConfig.content) ||
        messageUtils.isMultiModalContent(messageConfig.content) ||
        messageUtils.isLlmCallEvent(messageConfig.content)
      ) {
        const completeMessage = {
          config: messageConfig,
          session_id: session.id,
          run_id: run.id,
          message_meta: {},
        };

        // Check for duplicates
        const isDuplicate = state.messages.some((msg) =>
          msg.config.content === messageConfig.content &&
          msg.config.source === messageConfig.source);

        if (isDuplicate) return;

        // If we have a streaming message in progress, finalize it first
        if (state.currentStreamingContent && state.currentStreamingMessage) {
          // Create a finalized version of the streaming message
          const finalizedStreamingMessage = {
            ...state.currentStreamingMessage,
            config: {
              ...state.currentStreamingMessage.config,
              content: state.currentStreamingContent,
            },
          };

          // Update the messages array with the finalized streaming message
          set((state) => {
            // Find and replace the streaming message if it exists
            const messagesWithFinalizedStreaming = state.messages.map(msg => 
              msg === state.currentStreamingMessage ? finalizedStreamingMessage : msg
            );
            
            // If it wasn't in the array, add it
            if (state.currentStreamingMessage && !state.messages.includes(state.currentStreamingMessage)) {
              messagesWithFinalizedStreaming.push(finalizedStreamingMessage);
            }

            return { messages: messagesWithFinalizedStreaming };
          });
        }

        // Update run with the new message
        const updatedRun = {
          ...run,
          messages: [...run.messages, completeMessage],
          status: message.status || run.status,
        };

        set((state) => {
          // Update sessions list with the new run
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
            messages: [...state.messages, completeMessage],
            currentStreamingContent: "", // Clear streaming content
            currentStreamingMessage: null, // Clear streaming message reference
            run: updatedRun,
            sessions: updatedSessions,
          };
        });
      } else {
        // We're getting a chunk of a streaming message
        // Create or update the streaming message
        const streamingMessage = state.currentStreamingMessage || {
          config: {
            ...messageConfig,
            content: "",
          },
          session_id: session.id,
          run_id: run.id,
          message_meta: {},
        };

        // Update the content with the new chunk
        const updatedContent = state.currentStreamingContent + messageConfig.content;
        
        set({
          currentStreamingContent: updatedContent,
          currentStreamingMessage: streamingMessage,
        });
      }
    } else {
      // For non-streaming messages (e.g. from user or system)
      const newMessage = {
        config: messageConfig,
        session_id: session.id,
        run_id: run.id,
        message_meta: {},
      };

      // Check for duplicates
      const isDuplicate = state.messages.some((msg) => msg.config.content === messageConfig.content && msg.config.source === messageConfig.source);
      if (isDuplicate) return;

      // Update run with the new message
      const updatedRun = {
        ...run,
        messages: [...run.messages, newMessage],
        status: message.status || run.status,
      };

      set((state) => {
        // Update sessions list with the new run
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
        };
      });
    }
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

      // Finalize any streaming message before sending a new one
      if (currentState.currentStreamingContent && currentState.currentStreamingMessage) {
        // Create a finalized version of the streaming message
        const finalizedStreamingMessage = {
          ...currentState.currentStreamingMessage,
          config: {
            ...currentState.currentStreamingMessage.config,
            content: currentState.currentStreamingContent,
          },
        };

        // Update the messages array with the finalized streaming message
        set((state) => {
          // Replace the streaming message if it exists in the array
          const messagesWithFinalizedStreaming = state.messages.map(msg =>
            msg === state.currentStreamingMessage ? finalizedStreamingMessage : msg
          );
          

          // If it wasn't in the array, add it
          if (state.currentStreamingMessage && !state.messages.includes(state.currentStreamingMessage)) {
            messagesWithFinalizedStreaming.push(finalizedStreamingMessage);
          }

          // Clear streaming state
          return { 
            messages: messagesWithFinalizedStreaming,
            currentStreamingContent: "",
            currentStreamingMessage: null,
          };
        });
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
        status: "error",
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
        currentStreamingContent: "",
        currentStreamingMessage: null,
      });
    } catch (error) {
      set({
        error: `Failed to load chat: ${error}`,
        status: "error",
        session: null,
        run: null,
        messages: [],
        websocketManager: null,
        currentStreamingContent: "",
        currentStreamingMessage: null,
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
      currentStreamingContent: "",
      currentStreamingMessage: null,
    });
  },
}));

export default useChatStore;