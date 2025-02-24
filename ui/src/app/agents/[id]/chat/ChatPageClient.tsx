'use client';

import { useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import { ChatLayout } from "@/components/ChatLayout";
import useChatStore from "@/lib/useChatStore";
import { Team, Session, Run, SessionWithRuns } from "@/types/datamodel";
import { useRouter } from "next/navigation";
import { deleteSession } from "@/app/actions/sessions";

interface ChatPageClientProps {
  initialData: {
    agent: Team;
    sessions: SessionWithRuns[];
    viewState: {
        session: Session;
        run: Run;
    } | null;
  };
  agentId: string;
}


export default function ChatPageClient({
  initialData,
  agentId,
}: ChatPageClientProps) {
  const router = useRouter();
  const { cleanup, initializeNewChat } = useChatStore();

  // Initialize store with initial data
  useEffect(() => {
    useChatStore.setState({
      team: initialData.agent,
      sessions: initialData.sessions,
      status: "ready",
    });
  }, [initialData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await deleteSession(sessionId);
      router.refresh();
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleViewRun = async (sessionId: number) => {
    router.push(`/agents/${agentId}/chat/${sessionId}`);
  };

  const onNewSession = async () => {
    try {
      await initializeNewChat(parseInt(agentId));
      const { session } = useChatStore.getState();
      
      if (session?.id) {
        router.push(`/agents/${agentId}/chat/${session.id}`);
      }
    } catch (error) {
      console.error("Error creating new session:", error);
    }
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
        isReadOnly={false}
        onNewSession={onNewSession}
      />
    </ChatLayout>
  );
}