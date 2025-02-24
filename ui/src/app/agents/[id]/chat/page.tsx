import { Suspense } from "react";
import { getChatData } from "@/app/actions/chat";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import ChatPageClient from "./ChatPageClient";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const data = await getChatData(id, null);
    if (data.notFound || !data.agent) {
      return <ErrorState message="Agent not found" />;
    }

    return (
      <Suspense fallback={<LoadingState />}>
        <ChatPageClient 
          initialData={data}
          agentId={id}
        />
      </Suspense>
    );
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "An unexpected error occurred"} />;
  }
}