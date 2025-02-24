"use client";

import { getTeams } from "@/app/actions/teams";
import AgentList from "@/components/AgentList";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Team } from "@/types/datamodel";
import { useEffect, useState } from "react";

export default function AgentListPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
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

    fetchTeams();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return <AgentList teams={teams} />;
}
