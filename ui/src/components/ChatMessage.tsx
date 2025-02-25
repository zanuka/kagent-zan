import { messageUtils } from "@/lib/utils";
import type {  Message, Run } from "@/types/datamodel";
import { TruncatableText } from "./TruncatableText";
import ToolCallDisplay from "./ToolCallDisplay";
import LLMCallModal from "./LLMCallModal";

interface ChatMessageProps {
  message: Message;
  run: Run | null;
}

export default function ChatMessage({ message, run }: ChatMessageProps) {
  if (!message || !message.config) {
    return null;
  }

  const messageObject = message.config;
  const messageContent = messageObject.content; 


  if (messageUtils.isTeamResult(messageObject)) {
    return (
      <div className="text-sm text-white/80 bg-neutral-800 border border-white/50 p-4">
        <span className="font-semibold">Task completed</span>
        <ul className="mt-2 text-white/60 ">
          <li>Duration: {Math.floor(messageObject.duration)} seconds </li>
          <li>Messages sent: {messageObject.task_result.messages.length}</li>
        </ul>
      </div>
    )
  }

  if (messageUtils.isFunctionExecutionResult(messageContent) || 
      messageUtils.isToolCallContent(messageContent) && run) { 
        return <ToolCallDisplay currentMessage={message} currentRun={run} />
  }

  if (messageUtils.isLlmCallEvent(messageContent)) {
    return <LLMCallModal content={String(messageContent)} />
  }

  const source = message.config.source;
  const isUser = source === "user";

  if (source === "system" || source === "kagent_user") {
    // kagent_user is the user proxy, but we're already displaying the user message, so no need to show it twice
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-white/50 ${isUser ? "border-l-blue-500 bg-neutral-800 border border-[#3A3A3A]" : "border-l-violet-500 bg-transparent"} border-l-2 py-2 px-4`}>
      <div className="flex flex-col gap-1 w-full">
        <div className="text-xs font-bold text-white/80">{isUser ? "User" : message.config.source}</div>
          <TruncatableText className="break-all" content={String(messageObject.content)} />
      </div>
    </div>
  );
}
