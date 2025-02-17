"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUserStore } from "@/lib/userStore";
import ChatInterface from "@/components/ChatInterface";
import { ChatLayout } from "@/components/ChatLayout";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useChatData } from "@/lib/useChatData";
import useChatStore from "@/lib/useChatStore";

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useUserStore();
  const agentId = params.id as string;
  const chatId = params.chatId as string;

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);

  // Get chat data and actions from custom hook
  const [{ agent, sessions, viewState, isLoading, error }, { handleDeleteSession, handleViewRun }] = useChatData({
    agentId,
    chatId,
    userId,
  });

  // Get chat store state and actions
  const { loadExistingChat, cleanup } = useChatStore();

  // Load existing chat on mount and cleanup on unmount
  useEffect(() => {
    loadExistingChat(chatId, userId);
    return () => cleanup();
  }, [chatId, userId, loadExistingChat, cleanup]);

  if (error) return <ErrorState message={error} />;

  // Handle navigation to new chat
  const onNewSession = async () => {
    router.push(`/agents/${agentId}/chat`);
  };

  return (
    <>
      {isLoading && <LoadingState />}
      <ChatLayout
        isLeftSidebarOpen={isLeftSidebarOpen}
        isRightSidebarOpen={isRightSidebarOpen}
        onLeftSidebarToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onRightSidebarToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        selectedTeam={agent}
        sidebarProps={{
          selectedTeam: agent,
          sessions,
          onDeleteSession: handleDeleteSession,
          onViewRun: handleViewRun,
        }}
      >
        <ChatInterface selectedAgentTeam={agent} selectedRun={viewState?.run} selectedSession={viewState?.session} isReadOnly={true} onNewSession={onNewSession} />
      </ChatLayout>
    </>
  );
}
