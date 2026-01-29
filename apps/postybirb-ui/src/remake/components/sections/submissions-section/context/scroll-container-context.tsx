/**
 * ScrollContainerContext - Provides the scroll container ref for IntersectionObserver.
 * Used by SubmissionThumbnail to detect visibility within the ScrollArea, not the browser viewport.
 */

import { createContext, ReactNode, RefObject, useContext, useMemo } from 'react';

/**
 * Context value containing the scroll container element ref.
 * Used as the `root` option for IntersectionObserver to detect visibility
 * within a scroll container rather than the browser viewport.
 */
interface ScrollContainerContextValue {
  /** Ref to the scrollable container element */
  scrollContainerRef: RefObject<HTMLDivElement | null> | null;
}

const ScrollContainerContext = createContext<ScrollContainerContextValue>({
  scrollContainerRef: null,
});

/**
 * Hook to access the scroll container context.
 * Returns null ref if used outside of provider (will fall back to viewport).
 */
export function useScrollContainer() {
  return useContext(ScrollContainerContext);
}

interface ScrollContainerProviderProps {
  /** Ref to the scrollable container element */
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * Provider that makes the scroll container ref available to child components.
 * Used by SubmissionList to provide the ScrollArea viewport to SubmissionThumbnail.
 */
export function ScrollContainerProvider({
  scrollContainerRef,
  children,
}: ScrollContainerProviderProps) {
  const value = useMemo(
    () => ({ scrollContainerRef }),
    [scrollContainerRef]
  );

  return (
    <ScrollContainerContext.Provider value={value}>
      {children}
    </ScrollContainerContext.Provider>
  );
}
