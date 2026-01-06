/**
 * Hook for managing submission selection with multi-select support.
 */

import { useCallback, useMemo, useRef } from 'react';
import { useNavigationStore } from '../../../../stores/navigation-store';
import type { SubmissionRecord } from '../../../../stores/records';
import { type ViewState } from '../../../../types/view-state';
import type { SelectionState } from '../submission-section-header';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionSelectionProps {
  /** Current view state */
  viewState: ViewState;
  /** Ordered submissions list */
  orderedSubmissions: SubmissionRecord[];
}

interface UseSubmissionSelectionResult {
  /** Currently selected IDs */
  selectedIds: string[];
  /** Selection state for checkbox (none/partial/all) */
  selectionState: SelectionState;
  /** Handle selecting a submission (supports shift+click, ctrl+click, and keyboard) */
  handleSelect: (id: string, event: React.MouseEvent | React.KeyboardEvent) => void;
  /** Toggle select all/none */
  handleToggleSelectAll: () => void;
  /** Update selection programmatically */
  setSelectedIds: (ids: string[]) => void;
}

/**
 * Hook for managing submission selection with support for:
 * - Single click selection
 * - Ctrl/Cmd+click multi-select toggle
 * - Shift+click range selection
 * - Select all/none toggle
 */
export function useSubmissionSelection({
  viewState,
  orderedSubmissions,
}: UseSubmissionSelectionProps): UseSubmissionSelectionResult {
  const setViewState = useNavigationStore((state) => state.setViewState);

  // Get selected IDs from view state (memoized to prevent unnecessary rerenders)
  const selectedIds = useMemo(() => {
    if (isSubmissionsViewState(viewState)) {
      return viewState.params.selectedIds;
    }
    return [];
  }, [viewState]);

  // Track the last selected item for shift+click range selection
  const lastSelectedIdRef = useRef<string | null>(null);

  // Compute selection state for the header checkbox
  const selectionState: SelectionState = useMemo(() => {
    if (selectedIds.length === 0) return 'none';
    if (
      selectedIds.length === orderedSubmissions.length &&
      orderedSubmissions.length > 0
    )
      return 'all';
    return 'partial';
  }, [selectedIds.length, orderedSubmissions.length]);

  // Update view state with new selection
  const updateSelection = useCallback(
    (newSelectedIds: string[]) => {
      if (!isSubmissionsViewState(viewState)) return;

      setViewState({
        ...viewState,
        params: {
          ...viewState.params,
          selectedIds: newSelectedIds,
          mode: newSelectedIds.length > 1 ? 'multi' : 'single',
        },
      } as ViewState);
    },
    [viewState, setViewState],
  );

  // Handle selecting a submission
  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent | React.KeyboardEvent) => {
      if (!isSubmissionsViewState(viewState)) return;

      let newSelectedIds: string[];

      if (event.shiftKey && lastSelectedIdRef.current) {
        // Shift+click: select range from last selected to current
        const lastIndex = orderedSubmissions.findIndex(
          (s) => s.id === lastSelectedIdRef.current,
        );
        const currentIndex = orderedSubmissions.findIndex((s) => s.id === id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const startIndex = Math.min(lastIndex, currentIndex);
          const endIndex = Math.max(lastIndex, currentIndex);
          const rangeIds = orderedSubmissions
            .slice(startIndex, endIndex + 1)
            .map((s) => s.id);

          // Merge with existing selection if Ctrl is also held
          if (event.ctrlKey || event.metaKey) {
            const combined = new Set([...selectedIds, ...rangeIds]);
            newSelectedIds = [...combined];
          } else {
            newSelectedIds = rangeIds;
          }
        } else {
          // Fallback to single selection if indices not found
          newSelectedIds = [id];
          lastSelectedIdRef.current = id;
        }
      } else if (event.ctrlKey || event.metaKey) {
        // Toggle selection with Ctrl/Cmd click
        if (selectedIds.includes(id)) {
          newSelectedIds = selectedIds.filter((sid: string) => sid !== id);
        } else {
          newSelectedIds = [...selectedIds, id];
        }
        lastSelectedIdRef.current = id;
      } else {
        // Single selection
        newSelectedIds = [id];
        lastSelectedIdRef.current = id;
      }

      updateSelection(newSelectedIds);
    },
    [viewState, orderedSubmissions, selectedIds, updateSelection],
  );

  // Handle toggling select all/none
  const handleToggleSelectAll = useCallback(() => {
    const newSelectedIds =
      selectionState === 'all'
        ? [] // Deselect all
        : orderedSubmissions.map((s) => s.id); // Select all

    updateSelection(newSelectedIds);
  }, [selectionState, orderedSubmissions, updateSelection]);

  // Set selected IDs programmatically
  const setSelectedIds = useCallback(
    (ids: string[]) => {
      updateSelection(ids);
    },
    [updateSelection],
  );

  return {
    selectedIds,
    selectionState,
    handleSelect,
    handleToggleSelectAll,
    setSelectedIds,
  };
}
