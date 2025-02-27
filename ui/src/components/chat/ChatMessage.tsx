import { messageUtils } from "@/lib/utils";
import { Message, Run } from "@/types/datamodel";
import { TruncatableText } from "@/components/chat/TruncatableText";
import LLMCallModal from "@/components/chat/LLMCallModal";
import ToolCallDisplay from "@/components/chat/ToolCallDisplay";

interface ChatMessageProps {
  message: Message;
  run: Run | null;
}

export default function ChatMessage({ message, run }: ChatMessageProps) {
  if (!message?.config) {
    return null;
  }

  const { content: messageContent, source } = message.config;

  // Filter out system messages
  if (source === "system" || source === "kagent_user") {
    return null;
  }

  // Handle user messages
  if (source === "user") {
    return (
      <div className="flex items-center gap-2 text-sm text-white/50 border-l-blue-500 bg-neutral-800 border border-[#3A3A3A] border-l-2 py-2 px-4">
        <div className="flex flex-col gap-1 w-full">
          <div className="text-xs font-bold text-white/80">User</div>
          <TruncatableText content={String(messageContent)} isStreaming={false} className="break-all" />
        </div>
      </div>
    );
  }

  // Handle special message types
  if (messageUtils.isTeamResult(message.config)) {
    return (
      <div className="text-sm text-white/80 bg-neutral-800 border border-white/50 p-4">
        <span className="font-semibold">Task completed</span>
        <ul className="mt-2 text-white/60">
          <li>Duration: {Math.floor(message.config.duration)} seconds</li>
          <li>Messages sent: {message.config.task_result.messages.length}</li>
        </ul>
      </div>
    );
  }

  if (messageUtils.isFunctionExecutionResult(messageContent) || (messageUtils.isToolCallContent(messageContent) && run)) {
    return <ToolCallDisplay currentMessage={message} currentRun={run} />;
  }

  if (messageUtils.isLlmCallEvent(messageContent)) {
    return <LLMCallModal content={String(messageContent)} />;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-white/50 border-l-violet-500 bg-transparent border-l-2 py-2 px-4">
      <div className="flex flex-col gap-1 w-full">
        <div className="text-xs font-bold text-white/80">{source}</div>
        <TruncatableText content={String(messageContent)} isStreaming={false} className="break-all" />
      </div>
    </div>
  );
}
