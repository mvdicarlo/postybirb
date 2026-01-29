/**
 * useVisibility - Custom hook for detecting element visibility within a scroll container.
 * Uses IntersectionObserver with proper lifecycle management to avoid excessive re-renders.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useScrollContainer } from '../context/scroll-container-context';

interface UseVisibilityOptions {
  /** Margin around the root (e.g., '300px' to pre-load before entering view) */
  rootMargin?: string;
  /** Threshold for visibility (0 = any part visible, 1 = fully visible) */
  threshold?: number;
}

interface UseVisibilityResult<T extends HTMLElement> {
  /** Ref callback to attach to the element */
  ref: (node: T | null) => void;
  /** Whether the element is currently visible */
  isVisible: boolean;
}

/**
 * Hook to detect when an element is visible within the scroll container.
 * Returns a ref callback to attach to the element and a boolean indicating visibility.
 */
export function useVisibility<T extends HTMLElement = HTMLDivElement>(
  options: UseVisibilityOptions = {}
): UseVisibilityResult<T> {
  const { rootMargin = '300px', threshold = 0 } = options;
  const { scrollContainerRef } = useScrollContainer();
  
  // Track the observed element
  const elementRef = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // Start as NOT visible - images won't load until observer confirms visibility
  // This prevents loading all images on initial render before observer fires
  const [isVisible, setIsVisible] = useState(false);

  // Create or recreate the observer
  const setupObserver = useCallback(() => {
    // Clean up existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const element = elementRef.current;
    const root = scrollContainerRef?.current ?? null;

    // Need both element and root to create a useful observer
    if (!element || !root) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observerRef.current.observe(element);
  }, [scrollContainerRef, rootMargin, threshold]);

  // Ref callback - called when element mounts/unmounts
  const refCallback = useCallback(
    (node: T | null) => {
      // Clean up observer for old element
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      elementRef.current = node;

      if (node) {
        setupObserver();
      }
    },
    [setupObserver]
  );

  // Re-setup observer when scroll container becomes available
  useEffect(() => {
    const root = scrollContainerRef?.current;
    
    // If we have an element but the observer was created with wrong/no root, recreate it
    if (elementRef.current && root) {
      setupObserver();
    }

    // Poll for scroll container if not available
    if (!root) {
      const interval = setInterval(() => {
        if (scrollContainerRef?.current) {
          setupObserver();
          clearInterval(interval);
        }
      }, 50);
      
      const timeout = setTimeout(() => clearInterval(interval), 2000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    // Cleanup on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [scrollContainerRef, setupObserver]);

  return { ref: refCallback, isVisible };
}
