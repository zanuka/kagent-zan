"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createRunWithSession } from "@/lib/ws";
import { useUserStore } from "@/lib/userStore";
import { Loader2 } from "lucide-react";

export default function NewChatPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useUserStore();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const createNewSession = async () => {
      try {
        const { session, run } = await createRunWithSession(parseInt(params.id as string), userId);
        
        // Log to verify we're getting the correct data
        console.log('Created session:', session.id, 'run:', run.id);
        
        // Only navigate if we have both session and run
        if (session?.id) {
          // Store the session and run in localStorage temporarily
          window.localStorage.setItem('currentSession', JSON.stringify(session));
          window.localStorage.setItem('currentRun', JSON.stringify(run));
          
          router.push(`/agents/${params.id}/chat/${session.id}`);
        } else {
          setError("Failed to create new session - no session ID returned");
        }
      } catch (error) {
        console.error("Error creating new session:", error);
        setError("Failed to create new chat session");
      }
    };

    createNewSession();
  }, [params.id, userId, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
      <div className="flex items-center gap-2 text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        Creating new chat...
      </div>
    </div>
  );
}