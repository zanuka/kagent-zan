"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import { AgentDetailsPanel } from "@/components/AgentDetailsPanel";
import type { Team, Session, Run, GetSessionRunsResponse, SessionWithRuns } from "@/types/datamodel";
import { fetchApi, getBackendUrl } from "@/lib/utils";
import { useUserStore } from "@/lib/userStore";
import SessionsSidebar from "@/components/sidebar/SessionsSidebar";

interface ViewState {
  session: Session;
  run: Run;
  team: Team;
}

export default function AgentChatLayout() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useUserStore();
  const agentId = params.id as string;
  const chatId = params.chatId as string;

  const [agent, setAgent] = useState<Team | null>(null);
  const [sessions, setSessions] = useState<SessionWithRuns[]>([]);
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);

  useEffect(() => {
    // Clean up the stored session/run data after they're loaded by AgentChatLayout
    return () => {
      window.localStorage.removeItem("currentSession");
      window.localStorage.removeItem("currentRun");
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch agent details first
        const agentData = await fetchApi<Team>(`/teams/${agentId}`, userId);
        setAgent(agentData);

        // Check if we have stored session/run from a new chat creation
        const storedSession = window.localStorage.getItem("currentSession");
        const storedRun = window.localStorage.getItem("currentRun");

        if (storedSession && storedRun && chatId === JSON.parse(storedSession).id.toString()) {
          // Use the stored data for a newly created chat
          const session = JSON.parse(storedSession);
          const run = JSON.parse(storedRun);
          setSessions([{ session, runs: [run] }]);
          setViewState({
            session,
            run,
            team: agentData,
          });
        } else {
          // Fetch all sessions for this agent
          const response = await fetchApi<Session[]>(`/sessions`, userId);

          // Filter sessions for this agent
          const agentSessions = response.filter((session) => session.team_id === parseInt(agentId));

          // Fetch runs for each session
          const sessionsWithRuns = await Promise.all(
            agentSessions.map(async (session) => {
              const { runs } = await fetchApi<GetSessionRunsResponse>(`/sessions/${session.id}/runs`, userId);
              return { session, runs };
            })
          );

          setSessions(sessionsWithRuns);

          // Load the requested chat
          if (chatId) {
            const session = sessionsWithRuns.find((s) => s.session.id?.toString() === chatId);
            if (session) {
              setViewState({
                session: session.session,
                run: session.runs[0],
                team: agentData,
              });
            } else {
              setError("Chat not found");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error instanceof Error ? error.message : "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [agentId, chatId, userId]);

  interface NewSessionOptions {
    navigate?: boolean;
  }

  const handleNewSession = async (newSession: Session, newRun: Run, options: NewSessionOptions = {}) => {
    setSessions((prevSessions) => [
      {
        session: newSession,
        runs: [newRun],
      },
      ...prevSessions,
    ]);

    if (options.navigate) {
      // Navigate to the new chat URL
      router.push(`/agents/${agentId}/chat/${newSession.id}`);
    }
  };

  const handleViewRun = async (sessionId: number, runId: string) => {
    const sessionWithRuns = sessions.find((s) => s.session.id === sessionId);
    if (!sessionWithRuns || !agent) return;

    const run = sessionWithRuns.runs.find((r) => r.id === runId);
    if (!run) return;

    setViewState({
      session: sessionWithRuns.session,
      run,
      team: agent,
    });

    router.push(`/agents/${agentId}/chat/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      const response = await fetch(`${getBackendUrl()}/sessions/${sessionId}/?user_id=${userId}`, { method: "DELETE" });

      if (response.ok) {
        setSessions((prevSessions) => prevSessions.filter((s) => s.session.id !== sessionId));

        // If we deleted the current session, navigate to new chat
        if (viewState?.session.id === sessionId) {
          router.push(`/agents/${agentId}/chat`);
        }
      }
    } catch (error) {
      console.error("Error deleting run:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
        <div className="text-white/50">Loading chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <>
      <SessionsSidebar isOpen={isLeftSidebarOpen} onToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} sessions={sessions} onDeleteSession={handleDeleteSession} onViewRun={handleViewRun} />
      <div
        className={`transition-all duration-300 ease-in-out
        ${isLeftSidebarOpen ? "ml-64" : "ml-12"}
        ${isRightSidebarOpen ? "mr-96" : "mr-12"}`}
      >
        <div className="mx-auto max-w-5xl">
          <ChatInterface selectedAgentTeam={agent} selectedRun={viewState?.run} selectedSession={viewState?.session} onNewSession={handleNewSession} />
        </div>
      </div>
      <AgentDetailsPanel selectedTeam={agent} isOpen={isRightSidebarOpen} onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)} />
    </>
  );
}
