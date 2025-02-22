"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRightFromLine, ArrowBigUp, AlertTriangle, CheckCircle, Loader2, MessageSquare, StopCircle, X, Bot, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Team, Message, RunStatus, Session, Run } from "@/types/datamodel";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "./ChatMessage";
import useChatStore from "@/lib/useChatStore";

interface TokenStats {
  total: number;
  input: number;
  output: number;
}

function calculateTokenStats(messages: Message[]): TokenStats {
  return messages.reduce(
    (stats, message) => {
      const usage = message.config?.models_usage;
      if (usage) {
        return {
          total: stats.total + (usage.prompt_tokens + usage.completion_tokens),
          input: stats.input + usage.prompt_tokens,
          output: stats.output + usage.completion_tokens,
        };
      }
      return stats;
    },
    { total: 0, input: 0, output: 0 }
  );
}

interface ChatInterfaceProps {
  selectedAgentTeam?: Team | null;
  selectedSession?: Session | null;
  selectedRun?: Run | null;
  isReadOnly?: boolean;
  onNewSession?: () => void;
}

export default function ChatInterface({ selectedAgentTeam, selectedSession, selectedRun, isReadOnly, onNewSession }: ChatInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [tokenStats, setTokenStats] = useState<TokenStats>({
    total: 0,
    input: 0,
    output: 0,
  });

  const { status, messages, run, sendUserMessage, cleanup } = useChatStore();

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      const newStats = calculateTokenStats(messages);
      setTokenStats(newStats);
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly || !message.trim() || !selectedAgentTeam?.id) {
      return;
    }

    try {
      await sendUserMessage(message, selectedAgentTeam.id);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    cleanup();
    setMessage("");
  };

  const getStatusIcon = (status: RunStatus | "ready") => {
    switch (status) {
      case "ready":
        return (
          <div className="text-white/50 text-xs justify-center items-center flex">
            <Bot size={16} className="mr-2 text-violet-500" />
            <span>Ready</span>
          </div>
        );
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
            {run?.error_message || "An error occurred"}
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
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (message.trim() && selectedAgentTeam) {
        handleSendMessage(e);
      }
    }
  };

  // show messages from selected run if available
  const displayMessages = selectedRun ? selectedRun.messages : messages;
  const actualRun = selectedRun || run || null;

  return (
    <div className="w-full h-screen flex flex-col justify-center transition-all duration-300 ease-in-out pt-[1.5rem]">
      {isReadOnly && selectedSession && (
        <div className="px-4 py-2 bg-black/10 text-violet-500 rounded-lg mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-white/80 text-xs">Viewing chat history</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onNewSession} className="hover:text-violet-600 hover:bg-transparent">
            Start New Chat
          </Button>
        </div>
      )}
      <div ref={containerRef} className="flex-1 overflow-y-auto my-8 transition-all duration-300 p-4 -translate-y-[1.5rem]">
        <ScrollArea>
          <div className="flex flex-col space-y-5">
            {displayMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <MessageSquarePlus className="mb-4 h-8 w-8 text-violet-500" />
                <h3 className="mb-2 text-xl font-medium text-white/90">Ready to start chatting?</h3>
                <p className="text-base text-white/60">
                  Begin a new conversation with <span className="font-medium text-white/90">{selectedAgentTeam?.component.label}</span>
                </p>
              </div>
            )}
            {displayMessages.map((msg, index) => (
              <ChatMessage key={index} message={msg} run={actualRun} />
            ))}
          </div>
        </ScrollArea>
      </div>

      {!isReadOnly && (
        <div className="rounded-lg bg-[#2A2A2A] border border-[#3A3A3A] overflow-hidden transition-all duration-300 ease-in-out -translate-y-[1.5rem]">
          <form className="p-4">
            <div className="flex items-center justify-between mb-4">
              {getStatusIcon(status)}
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
              disabled={status === "active" || status === "complete"}
              onKeyDown={handleKeyDown}
              className="min-h-[100px] bg-transparent border-0 p-0 focus-visible:ring-0 resize-none text-white placeholder:text-white/40"
            />

            <div className="flex items-center justify-end mt-4">
              <Button
                onClick={status === "active" ? handleCancel : handleSendMessage}
                className={`${status === "active" ? "bg-white/60 hover:bg-white/90" : "bg-white hover:bg-white/60"} text-black`}
                disabled={!selectedAgentTeam || run?.status === "awaiting_input" || status === "complete"}
              >
                {status === "active" ? (
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
