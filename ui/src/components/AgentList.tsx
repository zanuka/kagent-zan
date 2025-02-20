"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Bot, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { fetchApi } from "@/lib/utils";
import { useUserStore } from "@/lib/userStore";
import type { AssistantAgentConfig, Component, Team } from "@/types/datamodel";

export default function AgentList() {
  const router = useRouter();
  const { userId } = useUserStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const teamsResult = await fetchApi<Team[]>("/teams", userId);
      setTeams(teamsResult);
    } catch (error) {
      console.error("Error fetching agents:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleDeleteClick = (e: React.MouseEvent, teamId: string) => {
    e.stopPropagation(); // Prevent card click navigation
    setDeleteTeamId(teamId);
  };

  const handleDelete = async () => {
    if (!deleteTeamId) return;

    try {
      setIsDeleting(true);
      await fetchApi(`/teams/${deleteTeamId}`, userId, {
        method: "DELETE",
      });
      // Fetch fresh data instead of updating local state
      await fetchAgents();
    } catch (error) {
      console.error("Error deleting agent:", error);
      setError(error instanceof Error ? error.message : "Failed to delete agent");
    } finally {
      setIsDeleting(false);
      setDeleteTeamId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
        <Loader2 className="h-6 w-6 text-white/50 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Your Agents</h1>
          <Button onClick={() => router.push("/agents/new")} className="bg-violet-500 hover:bg-violet-600">
            <Plus className="h-4 w-4 mr-2" />
            Create New Agent
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No agents yet</h3>
            <p className="text-white/50 mb-6">Create your first agent to get started</p>
            <Button onClick={() => router.push("/agents/new")} className="bg-violet-500 hover:bg-violet-600">
              <Plus className="h-4 w-4 mr-2" />
              Create New Agent
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => {
              const agent = getUsersAgentFromTeam(team);
              return (
                <Card key={team.id} className="bg-[#2A2A2A] border-[#3A3A3A] hover:border-violet-500 transition-colors cursor-pointer" onClick={() => router.push(`/agents/${team.id}/chat`)}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Bot className="h-5 w-5 text-violet-500" />
                      {agent.label}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0"
                      onClick={(e) => handleDeleteClick(e, String(team.id))}
                      disabled={isDeleting}
                    >
                      {isDeleting && deleteTeamId === String(team.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-sm">{agent.description}</p>
                    <div className="mt-4 flex items-center text-xs text-white/50">
                      <span>Model: {agent.config.model_client.config.model}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AlertDialog open={deleteTeamId !== null} onOpenChange={() => setDeleteTeamId(null)}>
          <AlertDialogContent className="bg-[#2A2A2A] border-[#3A3A3A] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Agent</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">Are you sure you want to delete this agent? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#3A3A3A] text-white hover:bg-[#4A4A4A]" disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function getUsersAgentFromTeam(team: Team): Component<AssistantAgentConfig> {
  // Pick the participant that's not the kagent_ planner
  const agent = team.component?.config.participants.find((p) => !p.label?.startsWith("kagent_"));
  if (!agent) {
    throw new Error("No agent found in team");
  }
  return agent as Component<AssistantAgentConfig>;
}
