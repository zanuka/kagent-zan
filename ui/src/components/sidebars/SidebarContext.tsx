import { createContext, useContext, ReactNode, useState } from 'react';

interface SidebarState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarState | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  return (
    <SidebarContext.Provider
      value={{
        leftSidebarOpen,
        rightSidebarOpen,
        setLeftSidebarOpen,
        setRightSidebarOpen
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}