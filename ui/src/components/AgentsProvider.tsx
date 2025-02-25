"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getTeams } from "@/app/actions/teams";
import { Team } from "@/types/datamodel";

interface AgentsContextType {
  teams: Team[];
  loading: boolean;
  error: string;
  refreshTeams: () => Promise<void>;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export function useAgents() {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error("useAgents must be used within an AgentsProvider");
  }
  return context;
}

interface AgentsProviderProps {
  children: ReactNode;
}

export function AgentsProvider({ children }: AgentsProviderProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const teamsResult = await getTeams();

      if (!teamsResult.data || teamsResult.error) {
        throw new Error(teamsResult.error || "Failed to fetch teams");
      }

      setTeams(teamsResult.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchTeams();
  }, []);

  const value = {
    teams,
    loading,
    error,
    refreshTeams: fetchTeams
  };

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
}