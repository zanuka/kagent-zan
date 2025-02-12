import { messageUtils } from "@/lib/utils";
import type { Run, Message } from "@/types/datamodel";
import LLMCallModal from "./LLMCallModal";
import ToolCallDisplay from "./ToolCallDisplay";
import { TruncatableText } from "./TruncatableText";

interface ChatMessageProps {
  message: Message;
  currentRun: Run;
}

export default function ChatMessage({ message, currentRun }: ChatMessageProps) {
  if (!message) {
    return null;
  }

  const isUser = message.config.source === "user";
  const content = message.config.content;

  // Skip rendering result messages entirely since they're handled by ToolCallDisplay
  if (messageUtils.isFunctionExecutionResult(content)) {
    return null;
  }

  if (message.config.source === "llm_call_event") {
    return <LLMCallModal content={String(content)} />;
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-white/50 ${isUser ? "border-l-blue-500 bg-neutral-800 border border-[#3A3A3A]" : "border-l-violet-500 bg-transparent"} border-l-2 py-2 px-4`}>
      <div className="flex flex-col gap-1 w-full">
        <div className="text-xs font-bold text-white/80">{isUser ? "User" : message.config.source}</div>
        <div>
          {messageUtils.isToolCallContent(content) || messageUtils.isFunctionExecutionResult(content) ? (
            <ToolCallDisplay currentMessage={message} currentRun={currentRun} />
          ) : message.config.source === "llm_call_event" ? (
            <LLMCallModal content={String(content)} />
          ) : (
            <TruncatableText className="break-all" content={String(content)} />
          )}
        </div>
      </div>
    </div>
  );
}
