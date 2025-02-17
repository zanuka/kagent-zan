import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-2 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <div className="text-sm font-medium">Loading chat...</div>
      </div>
    </div>
  );
}
