import { Suspense } from "react";
import { getChatData } from "@/app/actions/chat";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { redirect } from "next/navigation";
import ChatDetailClient from "./ChatDetailClient";

export default async function ChatDetailPage({ params }: { params: Promise<{ id: string; chatId: string }>}) {
  const { id, chatId } = await params;
  try {
    const data = await getChatData(id, chatId);

    if (data.notFound) {
      redirect(`/agents/${id}/chat`);
    }

    if (!data.agent || !data.sessions || !data.viewState) {
      throw new Error("Incomplete data received");
    }

    return (
      <Suspense fallback={<LoadingState />}>
        <ChatDetailClient initialData={data} agentId={id} chatId={chatId} />
      </Suspense>
    );
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : "An unexpected error occurred"} />;
  }
}
