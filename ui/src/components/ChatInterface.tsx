"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRightFromLine, ArrowBigUp, AlertTriangle, CheckCircle, Loader2, MessageSquare, StopCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getWebSocketUrl } from "@/lib/utils";
import type { Run, Session, Team, RunStatus, AgentMessageConfig, Message, WebSocketMessage, TeamResult } from "@/types/datamodel";
import { createMessage, createRunWithSession } from "@/lib/ws";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "./ChatMessage";
import { useUserStore } from "@/lib/userStore";

interface TokenStats {
  total: number;
  input: number;
  output: number;
}

function calculateTokenStats(messages: Message[]): TokenStats {
  return messages.reduce(
    (stats, message) => {
      const usage = message.config.models_usage;
      if (usage) {
        return {
          total: stats.total + (usage.prompt_tokens + usage.completion_tokens),
          input: stats.input + usage.prompt_tokens,
          output: stats.output + usage.completion_tokens,
        };
      }
      return stats;
    },
    {
      total: 0,
      input: 0,
      output: 0,
    }
  );
}

interface ChatInterfaceProps {
  selectedAgentTeam?: Team | null;
  selectedSession?: Session;
  selectedRun?: Run;
  onNewSession: (session: Session, run: Run) => void;
  isReadOnly?: boolean
}

export default function ChatInterface({ selectedAgentTeam, selectedSession, selectedRun, onNewSession, isReadOnly }: ChatInterfaceProps) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [tokenStats, setTokenStats] = useState<TokenStats>({
    total: 0,
    input: 0,
    output: 0,
  });

  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeSocket, setActiveSocket] = useState<WebSocket | null>(null);
  const activeSocketRef = useRef<WebSocket | null>(null);

  const { userId } = useUserStore();

  useEffect(() => {
    return () => {
      const timeoutId = inputTimeoutRef.current;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      activeSocket?.close();
    };
  }, [activeSocket]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [containerRef]);

  useEffect(() => {
    if (selectedSession) {
      setCurrentSession(selectedSession);
    }
  }, [selectedSession]);

  useEffect(() => {
    if (currentRun?.messages) {
      const newStats = calculateTokenStats(currentRun.messages);
      setTokenStats(newStats);
    }
  }, [currentRun?.messages]);

  useEffect(() => {
    if (selectedRun) {
      setCurrentRun(selectedRun);
        setMessage("");
        setLoading(false);
      
      // Close any active WebSocket connection if it's not a newly created run
      if (activeSocket && selectedRun.id !== currentRun?.id) {
        activeSocket.close();
        setActiveSocket(null);
        activeSocketRef.current = null;
      }
    }
  }, [selectedRun, activeSocket, currentRun?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      return;
    }

    setLoading(true);

    if (activeSocket) {
      activeSocket.close();
      setActiveSocket(null);
      activeSocketRef.current = null;
    }

    if (!selectedAgentTeam || selectedAgentTeam.id === undefined) {
      console.error("No team selected");
      setLoading(false);
      return;
    }

    try {
      const { run, session: newSession } = await createRunWithSession(selectedAgentTeam.id, userId);
      if (!currentSession) {
        setCurrentSession(newSession);
      }

      const initialMessage = createMessage({ content: message, source: "user" }, run.run_id, currentSession?.id || newSession.id || 0, userId);

      const newRun = {
        id: run.run_id,
        created_at: new Date().toISOString(),
        status: "active" as RunStatus,
        task: initialMessage.config,
        team_result: null,
        messages: [initialMessage],
        error_message: undefined,
      };

      // signal back so we can update the sidebar
      onNewSession(newSession, newRun);
      setCurrentRun(newRun);

      // Setup the websocket
      const wsUrl = `${getWebSocketUrl()}/ws/runs/${run.run_id}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setActiveSocket(socket);
        activeSocketRef.current = socket;

        socket.send(
          JSON.stringify({
            type: "start",
            task: message,
            team_config: selectedAgentTeam?.component,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message, currentSession?.id || newSession.id);
        } catch (error) {
          console.error("WebSocket message parsing error:", error);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket closed");
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        // TODO: Show the error message in the chat
      };
    } catch (error) {
      console.error("Error setting up websocket:", error);
      // TODO: show the error message in the chat
    } finally {
      setLoading(false);
    }
  };

  const handleWebSocketMessage = (message: WebSocketMessage, sessionId?: number) => {
    setCurrentRun((current) => {
      // Never return null if we have a current run
      if (!current) {
        console.warn("Received WebSocket message but no current run exists");
        return current;
      }

      const effectiveSessionId = sessionId || currentSession?.id;

      if (!effectiveSessionId) {
        console.warn("No session ID available");
        return current;
      }

      switch (message.type) {
        case "message":
          if (!message.data) {
            console.warn("Received message without data");
            return current;
          }

          const newMessage = createMessage(message.data as AgentMessageConfig, current.id, effectiveSessionId, userId);

          // Check for duplicates
          const isDuplicate = current.messages.some((existingMsg) => existingMsg.config.content === newMessage.config.content && existingMsg.config.source === newMessage.config.source);

          if (isDuplicate) {
            return current;
          }

          // Always return a new object with preserved messages
          return {
            ...current,
            messages: [...current.messages, newMessage],
            status: current.status === "stopped" ? "stopped" : current.status,
          };

        case "result":
        case "completion":
          const newStatus: RunStatus = current.status === "stopped" ? "stopped" : message.status === "complete" ? "complete" : message.status === "error" ? "error" : "stopped";

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isTeamResult = (data: any): data is TeamResult => {
            return data && "task_result" in data && "usage" in data && "duration" in data;
          };

          const teamResult = message.data && isTeamResult(message.data) ? message.data : current.team_result;

          // Only close socket on completion, not on stop
          if (newStatus === "complete" && activeSocket) {
            console.log("Closing socket after completion");
            activeSocket.close();
            setActiveSocket(null);
            activeSocketRef.current = null;
          }

          // Always preserve messages
          return {
            ...current,
            status: newStatus,
            team_result: teamResult,
            messages: current.messages,
          };

        case "input_request":
          return {
            ...current,
            status: current.status === "stopped" ? "stopped" : "awaiting_input",
            messages: current.messages,
          };

        default:
          console.warn("Unhandled message type:", message.type);
          return current;
      }
    });
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSocketRef.current || !currentRun) return;

    try {
      activeSocketRef.current.send(
        JSON.stringify({
          type: "stop",
          reason: "Cancelled by user",
        })
      );

      setCurrentRun((current) => {
        if (!current) {
          console.warn("No current run to cancel");
          return current;
        }

        console.log("Updating run status to stopped:", current);

        return {
          ...current,
          status: "stopped",
          messages: [...current.messages],
          team_result: current.team_result,
          task: current.task,
          error_message: current.error_message,
          id: current.id,
          created_at: current.created_at,
        };
      });

      if (activeSocketRef.current) {
        activeSocketRef.current.close();
      }
      setActiveSocket(null);
      activeSocketRef.current = null;

      // Only clear the input message
      setMessage("");

      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
        inputTimeoutRef.current = null;
      }

      // Don't set loading to false since we're preserving state
      setLoading(false);
    } catch (error) {
      console.error("Error cancelling task:", error);
    }
  };

  const getStatusIcon = (status: Run["status"] | undefined) => {
    switch (status) {
      case "active":
      case "created":
        return (
          <div className="text-white/50 text-xs justify-center items-center flex">
            <Loader2 size={16} className="mr-2 animate-spin" />
            <span>Processing</span>
          </div>
        );
      case "awaiting_input":
        return (
          <div className="text-white/50 text-xs justify-center items-center flex">
            <MessageSquare size={16} className="mr-2 text-yellow-500" />
            <span>Waiting for your input</span>
          </div>
        );
      case "complete":
        return (
          <div className="text-white/50 text-xs justify-center items-center flex">
            <CheckCircle size={16} className="mr-2 text-green-500" />
            <span>Task completed</span>
          </div>
        );
      case "error":
      case "timeout":
        return (
          <div className="text-white/50 text-xs justify-center items-center flex">
            <AlertTriangle size={16} className="mr-2 text-red-500" />
            {currentRun?.error_message || "An error occurred"}
          </div>
        );
      case "stopped":
        return (
          <div className="text-white/50 text-xs justify-center items-center flex">
            <StopCircle size={16} className="mr-2 text-red-500" />
            Task was stopped
          </div>
        );
      default:
        return null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for CMD + Return (Mac) or Ctrl + Return (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault(); // Prevent default newline behavior
      if (!loading && message.trim() && selectedAgentTeam) {
        handleSendMessage(e);
      }
    }
  };

  return (
    <div className="w-full h-screen flex flex-col justify-center transition-all duration-300 ease-in-out pt-[1.5rem]">
      <div ref={containerRef} className={`flex-1 overflow-y-auto my-8 transition-all duration-300 p-4 -translate-y-[1.5rem]`}>
        <div className="overflow-visible">
          <div className="p-4">
            <ScrollArea>
              <div className="flex flex-col space-y-5">
                {currentRun?.messages.map((msg, index) => (
                  <ChatMessage key={index} message={msg} currentRun={currentRun} />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <div className={`rounded-lg bg-[#2A2A2A] border border-[#3A3A3A] overflow-hidden transition-all duration-300 ease-in-out -translate-y-[1.5rem]`}>
          <form className="p-4">
            <div className="flex items-center justify-between mb-4">
              {getStatusIcon(currentRun?.status)}
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span>Usage: </span>
                <span>{tokenStats.total}</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" />
                    <span>{tokenStats.input}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowRightFromLine className="h-3 w-3" />
                    <span>{tokenStats.output}</span>
                  </div>
                </div>
              </div>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message AI Agent..."
              disabled={loading || currentRun?.status === "active"}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] bg-transparent border-0 p-0 focus-visible:ring-0 resize-none text-white placeholder:text-white/40"
            />

            <div className="flex items-center justify-end mt-4">
              <Button
                onClick={loading || currentRun?.status === "active" ? handleCancel : handleSendMessage}
                className={`${loading ? "bg-red-500 hover:bg-red-600" : "bg-white hover:bg-white/60"} text-black`}
                disabled={!selectedAgentTeam || currentRun?.status === "awaiting_input"}
              >
                {loading || currentRun?.status === "active" ? (
                  <>
                    Cancel
                    <X className="h-10 w-10 ml-2" />
                  </>
                ) : (
                  <>
                    Send
                    <ArrowBigUp className="h-10 w-10 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {isReadOnly && <div className="text-center text-white/50 text-sm mb-4">Viewing chat history</div>}
    </div>
  );
}
