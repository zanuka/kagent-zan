"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchApi } from "@/lib/utils";
import { useUserStore } from "@/lib/userStore";
import type { Team } from "@/types/datamodel";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function AgentPage() {
  const router = useRouter();
  const params = useParams();
  const { userId } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateAndRedirect = async () => {
      try {
        // Verify the agent exists before redirecting
        await fetchApi<Team>(`/teams/${params.id}`, userId);
        // If successful, redirect to the chat page
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

    validateAndRedirect();
  }, [params.id, userId, router]);

  if (error) {
    return <ErrorState message={error} />;
  }

  return <LoadingState />;
}