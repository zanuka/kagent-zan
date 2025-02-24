import { ReactNode } from "react";
import { Team } from "@/types/datamodel";
import SessionsSidebar from "@/components/sidebars/SessionsSidebar";
import { AgentDetailsSidebar } from "@/components/sidebars/AgentDetailsSidebar";
import { SidebarProvider, useSidebarContext } from "./sidebars/SidebarContext";

interface ChatLayoutProps {
  children: ReactNode;
  selectedTeam: Team | null;
  sidebarProps: Omit<React.ComponentProps<typeof SessionsSidebar>, "selectedTeam">;
}

function ChatLayoutContent({ children, selectedTeam, sidebarProps }: ChatLayoutProps) {
  const { leftSidebarOpen, rightSidebarOpen } = useSidebarContext();

  const leftMargin = leftSidebarOpen ? "ml-96" : "ml-12";
  const rightMargin = rightSidebarOpen ? "mr-96" : "mr-12";

  return (
    <>
      <SessionsSidebar {...sidebarProps} selectedTeam={selectedTeam} />
      <div className={`min-h-screen transition-all duration-300 ease-in-out ${leftMargin} ${rightMargin}`}>
        <div className="mx-auto max-w-none px-4 md:px-8 h-screen overflow-hidden">
          <div className="h-full overflow-y-auto">{children}</div>
        </div>
      </div>
      <AgentDetailsSidebar selectedTeam={selectedTeam} />
    </>
  );
}

export function ChatLayout(props: ChatLayoutProps) {
  return (
    <SidebarProvider>
      <ChatLayoutContent {...props} />
    </SidebarProvider>
  );
}