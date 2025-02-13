import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, User, Settings, Zap } from "lucide-react";
import { isToday, isYesterday } from "date-fns";
import { SessionWithRuns } from "@/types/datamodel";
import { SettingsModal } from "@/components/SettingsModal";
import { useUserStore } from "@/lib/userStore";
import { ActionButtons, EmptyState } from "@/components/sidebar/EmptyState";
import SessionGroup from "@/components/sidebar/SessionGroup";

interface SessionsSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions?: SessionWithRuns[];
  onDeleteRun: (sessionId: number, runId: string) => Promise<void>;
  onViewRun: (sessionId: number, runId: string) => Promise<void>;
  setShowTeamSelector: (show: boolean) => void;
}

export default function SessionsSidebar({ isOpen, onToggle, sessions = [], onDeleteRun, onViewRun, setShowTeamSelector }: SessionsSidebarProps) {
  const { userId } = useUserStore();
  const [showSettings, setShowSettings] = useState(false);

  const groupedSessions = useMemo(() => {
    const groups: {
      today: SessionWithRuns[];
      yesterday: SessionWithRuns[];
      older: SessionWithRuns[];
    } = {
      today: [],
      yesterday: [],
      older: [],
    };

    sessions.forEach((sessionWithRuns) => {
      const mostRecentRun = [...sessionWithRuns.runs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (!mostRecentRun) return;

      const date = new Date(mostRecentRun.created_at);
      if (isToday(date)) {
        groups.today.push(sessionWithRuns);
      } else if (isYesterday(date)) {
        groups.yesterday.push(sessionWithRuns);
      } else {
        groups.older.push(sessionWithRuns);
      }
    });

    const sortSessions = (sessions: SessionWithRuns[]) =>
      sessions.sort((a, b) => {
        const getLatestTimestamp = (session: SessionWithRuns) => {
          const latestRun = [...session.runs].sort((r1, r2) => new Date(r2.created_at).getTime() - new Date(r1.created_at).getTime())[0];
          return latestRun ? new Date(latestRun.created_at).getTime() : 0;
        };

        return getLatestTimestamp(b) - getLatestTimestamp(a);
      });

    return {
      today: sortSessions(groups.today),
      yesterday: sortSessions(groups.yesterday),
      older: sortSessions(groups.older),
    };
  }, [sessions]);

  const hasNoSessions = !groupedSessions.today.length && !groupedSessions.yesterday.length && !groupedSessions.older.length;

  return (
    <div
      className={`fixed top-0 left-0 h-screen transition-all duration-300 ease-in-out 
            bg-[#2A2A2A] border-r border-t border-b border-[#3A3A3A] 
            ${isOpen ? "w-96" : "w-12"}`}
    >
      <div className="h-full flex flex-col text-white">
        <div className="p-4 flex items-center gap-2 border-b border-[#3A3A3A]">
          {isOpen && <h1 className="text-sm font-semibold flex-1">Chat History</h1>}
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 hover:bg-[#3A3A3A] text-white hover:text-white transition-colors">
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        <div className={`h-full flex flex-col ${isOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}>
          <div className="flex-1 flex flex-col">
            {!hasNoSessions && (
              <div className="p-4">
                <ActionButtons setShowTeamSelector={setShowTeamSelector} />
              </div>
            )}

            <ScrollArea className="flex-1 overflow-y-auto">
              {hasNoSessions ? (
                <EmptyState setShowTeamSelector={setShowTeamSelector} />
              ) : (
                <div className="space-y-8 p-2">
                  {groupedSessions.today.length > 0 && <SessionGroup title="Today" sessions={groupedSessions.today} onViewRun={onViewRun} onDeleteRun={onDeleteRun} />}
                  {groupedSessions.yesterday.length > 0 && <SessionGroup title="Yesterday" sessions={groupedSessions.yesterday} onViewRun={onViewRun} onDeleteRun={onDeleteRun} />}
                  {groupedSessions.older.length > 0 && <SessionGroup title="Older" sessions={groupedSessions.older} onViewRun={onViewRun} onDeleteRun={onDeleteRun} />}
                </div>
              )}
            </ScrollArea>
          </div>

          {isOpen && (
            <>
              <div className="border-t border-[#3A3A3A] p-4 space-y-2">
                <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-[#3A3A3A] gap-2" onClick={() => setShowSettings(true)}>
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <div className="w-full flex items-center text-sm justify-start text-white/70 hover:text-white gap-2 px-3">
                  <User className="h-4 w-4" />
                  {userId}
                </div>
              </div>

              <div className="p-4 border-t border-[#3A3A3A]">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-violet-500" />
                  <span className="font-semibold text-white">kagent</span>
                </div>
                <div className="text-xs text-center text-white/50">© {new Date().getFullYear()} Solo.io. All rights reserved.</div>
              </div>
            </>
          )}
        </div>
        <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
      </div>
    </div>
  );
}
