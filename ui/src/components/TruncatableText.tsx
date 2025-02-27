import React, { memo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronUp, ChevronDown, Maximize2, Bot } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@radix-ui/react-scroll-area";

interface TruncatableTextProps {
  content: string;
  isJson?: boolean;
  className?: string;
  jsonThreshold?: number;
  textThreshold?: number;
  showFullscreen?: boolean;
  isStreaming?: boolean;
}

export const TruncatableText = memo(({ content, isJson = false, className = "", jsonThreshold = 1000, textThreshold = 500, showFullscreen = true, isStreaming = false }: TruncatableTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const threshold = isJson ? jsonThreshold : textThreshold;
  const shouldTruncate = !isStreaming && content.length > threshold;

  const toggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const displayContent = shouldTruncate && !isExpanded ? content.slice(0, threshold) + "..." : content;

  const renderContent = () => {
    if (isJson) {
      return <pre className="whitespace-pre-wrap">{displayContent.trim()}</pre>;
    }

    return <ReactMarkdown className="prose-md prose prose-invert max-w-none">{displayContent.trim()}</ReactMarkdown>;
  };

  return (
    <div className="relative">
      <div
        className={`
          overflow-auto scroll w-full
          ${shouldTruncate && !isExpanded ? "max-h-[300px]" : "max-h-[10000px]"}
          ${className}
        `}
      >
        {renderContent()}
        {isStreaming && (
          <span className="ml-1 animate-pulse">
            <Bot />
          </span>
        )}
      </div>

      {shouldTruncate && !isStreaming && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <button type="button" onClick={toggleExpand} className="inline-flex items-center justify-center p-2 hover:text-white/90 rounded z-10" aria-label={isExpanded ? "Show less" : "Show more"}>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showFullscreen && (
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="inline-flex items-center justify-center p-2 rounded hover:text-white/90 z-10" aria-label="Toggle fullscreen">
                  <Maximize2 size={18} />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-neutral-900 text-white border border-neutral-700 max-w-3xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Details</DialogTitle>
                </DialogHeader>
                <ScrollArea className="mt-4 w-full max-h-[60vh] overflow-y-auto">
                  <div className="px-6 pb-6">
                    <ReactMarkdown className="prose-md prose prose-invert max-w-none">{content}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
});

TruncatableText.displayName = "TruncatableText";
