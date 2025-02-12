"use client";

import { useState, useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import { AgentDetailsPanel } from "@/components/AgentDetailsPanel";
import type { Team, Session, Run, GetSessionRunsResponse, SessionWithRuns } from "@/types/datamodel";
import { fetchApi, getBackendUrl } from "@/lib/utils";
import SessionsSidebar from "@/components/sidebar/SessionsSidebar";
import { useUserStore } from "@/lib/userStore";
import TeamSelector from "@/components/TeamSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ViewState {
  session: Session;
  run: Run;
  team: Team;
}

export default function Home() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [sessions, setSessions] = useState<SessionWithRuns[]>([]);
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [agentTeams, setAgentTeams] = useState<Team[]>([]);
  const [showTeamSelector, setShowTeamSelector] = useState(true);

  const { userId } = useUserStore();

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch teams first
        const teams = await fetchApi<Team[]>("/teams", userId);
        if (!mounted) return;
        setAgentTeams(teams);

        // Fetch all sessions
        const response = await fetchApi<Session[]>("/sessions", userId);
        if (!mounted) return;

        if (response.length === 0) {
          // If no sessions exist, show team selector
          setShowTeamSelector(true);
          setIsLoading(false);
          return;
        }

        // Get the most recent session's team
        const mostRecentSession = response[0];
        const team = teams.find((t) => t.id === mostRecentSession.team_id);
        if (team) {
          setSelectedTeam(team);
        }

        // Fetch runs for each session
        const sessionsWithRuns = await Promise.all(
          response.map(async (session) => {
            const { runs } = await fetchApi<GetSessionRunsResponse>(`/sessions/${session.id}/runs`, userId);
            return { session, runs };
          })
        );

        if (!mounted) return;
        setSessions(sessionsWithRuns);

        // If we have sessions, set the view state to the most recent one
        if (sessionsWithRuns.length > 0 && team) {
          const mostRecent = sessionsWithRuns[0];
          setViewState({
            session: mostRecent.session,
            run: mostRecent.runs[0],
            team,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error instanceof Error ? error.message : "An unexpected error occurred");
        setShowTeamSelector(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData().catch((error) => {
      console.error("Error fetching data:", error);
      setShowTeamSelector(true);
    });

    return () => {
      mounted = false;
    };
  }, [userId]);

  // Effect to filter sessions when team changes
  useEffect(() => {
    if (selectedTeam) {
      setSessions((prev) => prev.filter((s) => s.session.team_id === selectedTeam.id));
    }
  }, [selectedTeam]);

  const handleNewSession = (newSession: Session, newRun: Run) => {
    setSessions((prevSessions) => [
      {
        session: newSession,
        runs: [newRun],
      },
      ...prevSessions,
    ]);
  };

  const handleTeamSelection = async (team: Team | null, teamJson: string | null = null) => {
    // TODO: I don't really like how this is done, there should be a separate 'handleTeamCreation' function instead
    if (teamJson) {
      const response = await fetch(getBackendUrl() + "/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(teamJson),
      });

      if (!response.ok) {
        throw new Error("Failed to create team");
      }
    }

    setSelectedTeam(team);
    setShowTeamSelector(false);
  };

  const handleViewRun = async (sessionId: number, runId: string) => {
    const sessionWithRuns = sessions.find((s) => s.session.id === sessionId);
    if (!sessionWithRuns) return;

    const run = sessionWithRuns.runs.find((r) => r.id === runId);
    if (!run) return;

    const team = agentTeams.find((t) => t.id === sessionWithRuns.session.team_id);
    if (!team) return;

    setViewState({
      session: sessionWithRuns.session,
      run,
      team,
    });

    setSelectedTeam(team);
    setShowTeamSelector(false);
  };

  const handleDeleteRun = async (sessionId: number, runId: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/sessions/${sessionId}/?user_id=${userId}`, { method: "DELETE" });

      if (response.ok) {
        // Update local state to remove the deleted run
        setSessions((prevSessions) =>
          prevSessions.map((sessionWithRuns) => {
            if (sessionWithRuns.session.id === sessionId) {
              return {
                ...sessionWithRuns,
                runs: sessionWithRuns.runs.filter((run) => run.id !== runId),
              };
            }
            return sessionWithRuns;
          })
        );

        // If the deleted run was being viewed, clear the view state
        if (viewState?.run.id === runId) {
          setViewState(null);
        }
      }
    } catch (error) {
      console.error("Error deleting run:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  if (showTeamSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">kagent</h2>
            <p className="text-white/50 text-sm mb-8">Choose an AI agent team to start your conversation</p>
          </div>
          <TeamSelector agentTeams={agentTeams} onTeamSelect={handleTeamSelection} />
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <SessionsSidebar
        isOpen={isLeftSidebarOpen}
        onToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        sessions={sessions}
        onDeleteRun={handleDeleteRun}
        onViewRun={handleViewRun}
        setShowTeamSelector={setShowTeamSelector}
      />
      <div
        className={`transition-all duration-300 ease-in-out
        ${isLeftSidebarOpen ? "ml-64" : "ml-12"}
        ${isRightSidebarOpen ? "mr-96" : "mr-12"}`}
      >
        <div className="mx-auto max-w-5xl">
          <ChatInterface selectedAgentTeam={viewState?.team || selectedTeam} selectedRun={viewState?.run} selectedSession={viewState?.session} onNewSession={handleNewSession} />
        </div>
      </div>
      <AgentDetailsPanel selectedTeam={viewState?.team || selectedTeam} isOpen={isRightSidebarOpen} onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)} />
    </>
  );
}
