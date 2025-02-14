"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchApi } from "@/lib/utils";
import { useUserStore } from "@/lib/userStore";
import { Loader2 } from "lucide-react";
import type { Team } from "@/types/datamodel";

export default function AgentPage() {
  const router = useRouter();
  const params = useParams();
  const { userId } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAgent = async () => {
      try {
        // Try to fetch the agent
        await fetchApi<Team>(`/teams/${params.id}`, userId);
        // If successful, redirect to chat
        router.replace(`/agents/${params.id}/chat`);
      } catch (error) {
        console.error("Error checking agent:", error);
        setError("Agent not found");
        // Redirect to main agents page after a short delay
        setTimeout(() => {
          router.replace("/");
        }, 2000);
      }
    };

    checkAgent();
  }, [router, params.id, userId]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#1A1A1A] gap-2">
        <div className="text-red-500">{error}</div>
        <div className="text-white/50 text-sm">Redirecting to agents list...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
      <div className="flex items-center gap-2 text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    </div>
  );
}