"use client";

import AgentList from "@/components/AgentList";
import { AgentsProvider, useAgents } from "@/components/AgentsProvider";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function AgentListContent() {
  const { teams, loading, error } = useAgents();

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return <AgentList teams={teams} />;
}

export default function AgentListPage() {
  return (
    <AgentsProvider>
      <AgentListContent />
    </AgentsProvider>
  );
}
