/**
 * Custom hook for managing sidenav collapse state with localStorage persistence.
 * Uses Mantine's useLocalStorage hook for automatic serialization.
 */

import { useLocalStorage } from '@mantine/hooks';
import { useCallback } from 'react';

const STORAGE_KEY = 'postybirb_sidenav-collapsed';

/**
 * Hook for managing sidenav collapse state.
 * State persists across browser sessions via localStorage.
 *
 * @returns Object with collapsed state and control functions
 */
export function useSideNav() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>({
    key: STORAGE_KEY,
    defaultValue: false,
    getInitialValueInEffect: true,
  });

  const toggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, [setCollapsed]);

  return {
    /** Whether the sidenav is currently collapsed */
    collapsed,
    /** Toggle the collapsed state */
    toggle,
    /** Set the collapsed state directly */
    setCollapsed,
  };
}
