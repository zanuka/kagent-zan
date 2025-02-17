import { ReactNode } from 'react';
import { Team } from '@/types/datamodel';
import SessionsSidebar from '@/components/sidebar/SessionsSidebar';
import { AgentDetailsPanel } from '@/components/agent-details/AgentDetailsPanel';

interface ChatLayoutProps {
  children: ReactNode;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;
  selectedTeam: Team | null;
  sidebarProps: Omit<React.ComponentProps<typeof SessionsSidebar>, 'isOpen' | 'onToggle'>;
}

export function ChatLayout({
  children,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  onLeftSidebarToggle,
  onRightSidebarToggle,
  selectedTeam,
  sidebarProps,
}: ChatLayoutProps) {
  return (
    <>
      <SessionsSidebar
        isOpen={isLeftSidebarOpen}
        onToggle={onLeftSidebarToggle}
        {...sidebarProps}
      />
      <div
        className={`transition-all duration-300 ease-in-out
        ${isLeftSidebarOpen ? "ml-64" : "ml-12"}
        ${isRightSidebarOpen ? "mr-64" : "mr-12"}`}
      >
        <div className="mx-auto max-w-5xl">
          {children}
        </div>
      </div>
      <AgentDetailsPanel
        selectedTeam={selectedTeam}
        isOpen={isRightSidebarOpen}
        onToggle={onRightSidebarToggle}
      />
    </>
  );
}