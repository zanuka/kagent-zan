"use client";

import { AgentGrid } from "@/components/AgentGrid";
import { Button } from "@/components/ui/button";
import { Team } from "@/types/datamodel";
import { Bot, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAgents } from "./AgentsProvider";

interface AgentListProps {
  teams: Team[];
}

export default function AgentList({ teams }: AgentListProps) {
  const router = useRouter();
  const { refreshTeams } = useAgents();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshTeams();
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-primary-foreground">Your Agents</h1>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button onClick={() => router.push("/agents/new")} className="bg-violet-500 hover:bg-violet-600">
            <Plus className="h-4 w-4 mr-2" />
            Create New Agent
          </Button>
        </div>

        {teams?.length === 0 ? (
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
          <AgentGrid teams={teams || []} />
        )}
      </div>
    </div>
  );
}