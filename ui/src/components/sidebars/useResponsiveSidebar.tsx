import { useEffect, useState } from 'react';
import { useSidebarContext } from './SidebarContext';

interface UseResponsiveSidebarProps {
  breakpoint: number;
  side: 'left' | 'right';
}

export function useResponsiveSidebar({ breakpoint, side }: UseResponsiveSidebarProps) {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    setLeftSidebarOpen,
    setRightSidebarOpen
  } = useSidebarContext();
  
  const isOpen = side === 'left' ? leftSidebarOpen : rightSidebarOpen;
  const setIsOpen = side === 'left' ? setLeftSidebarOpen : setRightSidebarOpen;
  
  // Track window width for responsive behavior
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close on small screens
  useEffect(() => {
    if (windowWidth < breakpoint) {
      setIsOpen(false);
    }
  }, [windowWidth, breakpoint, setIsOpen]);

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  return { isOpen, toggle };
}