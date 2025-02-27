import { Message } from "@/types/datamodel";
import { TruncatableText } from "./TruncatableText";

interface StreamingMessageProps {
  message: Message;
}

export default function StreamingMessage({ message }: StreamingMessageProps) {
  if (!message?.config) {
    return null;
  }

  const { content: messageContent, source } = message.config;

  if (source === "system" || source === "kagent_user") {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-white/50 border-l-violet-500 bg-neutral-900 border-l-2 py-2 px-4">
      <div className="flex flex-col gap-1 w-full">
        <div className="text-xs font-bold text-white/80">{source}</div>
        <TruncatableText content={String(messageContent)} isStreaming={true} className="break-all" />
      </div>
    </div>
  );
}
