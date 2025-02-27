"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChatLayout } from "@/components/ChatLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import { Run, Session, SessionWithRuns, Team } from "@/types/datamodel";
import useChatStore from "@/lib/useChatStore";
import { deleteSession } from "@/app/actions/sessions";
import { ChatStatus } from "@/lib/ws";

interface ChatDetailClientProps {
  initialData: {
    agent: Team;
    sessions: SessionWithRuns[];
    viewState: { session: Session; run: Run } | null;
  };
  agentId: string;
  chatId: string;
}

export default function ChatDetailClient({ initialData, agentId, chatId }: ChatDetailClientProps) {
  const router = useRouter();
  const { loadChat, cleanup } = useChatStore();

  useEffect(() => {
    // Initialize the chat store with the initial data
    useChatStore.setState({
      team: initialData.agent,
      session: initialData.viewState?.session || null,
      run: initialData.viewState?.run || null,
      messages: initialData.viewState?.run?.messages || [],
      status: initialData.viewState?.run?.status as ChatStatus || "ready",
    });

    // Load the chat to set up WebSocket connection if needed
    loadChat(chatId);

    return () => cleanup();
  }, [chatId, initialData, loadChat, cleanup]);

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await deleteSession(sessionId);

      if (sessionId.toString() === chatId) {
        router.push(`/agents/${agentId}/chat`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleViewRun = async (sessionId: number) => {
    router.push(`/agents/${agentId}/chat/${sessionId}`);
  };

  const onNewSession = async () => {
    cleanup(); // Clean up current session before navigating
    router.push(`/agents/${agentId}/chat`);
  };

  return (
    <ChatLayout
      selectedTeam={initialData.agent}
      sidebarProps={{
        sessions: initialData.sessions,
        onDeleteSession: handleDeleteSession,
        onViewRun: handleViewRun,
      }}
    >
      <ChatInterface
        selectedAgentTeam={initialData.agent}
        selectedRun={initialData.viewState?.run}
        selectedSession={initialData.viewState?.session}
        onNewSession={onNewSession}
      />
    </ChatLayout>
  );
}
