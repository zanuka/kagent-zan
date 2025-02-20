"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useUserStore } from "@/lib/userStore";
import ChatInterface from "@/components/ChatInterface";
import { ChatLayout } from "@/components/ChatLayout";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { useChatData } from "@/lib/useChatData";
import useChatStore from "@/lib/useChatStore";

export default function ChatPage() {
  const params = useParams();
  const { userId } = useUserStore();
  const agentId = params.id as string;

  // Get chat data and actions from custom hook
  const [{ agent, sessions, viewState, isLoading, error }, { handleNewSession, handleDeleteSession, handleViewRun }] = useChatData({
    agentId,
    userId,
  });

  // Get chat store state and actions
  const { cleanup, startNewChat } = useChatStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Handle loading states
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // Handle starting a new chat session
  const onNewSession = async () => {
    await startNewChat(parseInt(agentId), userId);

    // Get the current session and run from the chat store
    const currentSession = useChatStore.getState().session;
    const currentRun = useChatStore.getState().run;

    if (currentSession) {
      // Update the sessions list with the new session
      await handleNewSession(currentSession, currentRun || undefined);
    }
  };

  return (
    <>
      {isLoading && <LoadingState />}

      <ChatLayout
        selectedTeam={agent}
        sidebarProps={{
          sessions,
          onDeleteSession: handleDeleteSession,
          onViewRun: handleViewRun,
        }}
      >
        <ChatInterface selectedAgentTeam={agent} isReadOnly={false} selectedSession={viewState?.session} selectedRun={viewState?.run} onNewSession={onNewSession} />
      </ChatLayout>
    </>
  );
}
