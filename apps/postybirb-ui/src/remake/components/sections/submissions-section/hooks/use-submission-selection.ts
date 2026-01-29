/**
 * Hook for managing submission selection with multi-select support.
 */

import { useCallback, useMemo, useRef } from 'react';
import type { SubmissionRecord } from '../../../../stores/records';
import { useNavigationStore } from '../../../../stores/ui/navigation-store';
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
  /** Handle selecting a submission (supports shift+click, ctrl+click, checkbox toggle, and keyboard) */
  handleSelect: (id: string, event: React.MouseEvent | React.KeyboardEvent, isCheckbox?: boolean) => void;
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

      const newParams = {
        ...viewState.params,
        selectedIds: newSelectedIds,
        mode: newSelectedIds.length > 1 ? 'multi' : 'single',
      };

      setViewState({
        ...viewState,
        params: newParams,
      } as ViewState);
    },
    [viewState, setViewState],
  );

  // Handle selecting a submission
  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent | React.KeyboardEvent, isCheckbox = false) => {
      if (!isSubmissionsViewState(viewState)) return;

      let newSelectedIds: string[];

      // If no anchor exists yet, set it to the clicked item
      if (!lastSelectedIdRef.current) {
        lastSelectedIdRef.current = id;
      }

      if (event.shiftKey) {
        // Shift+click: select range from anchor to current
        const anchorIndex = orderedSubmissions.findIndex(
          (s) => s.id === lastSelectedIdRef.current,
        );
        const currentIndex = orderedSubmissions.findIndex((s) => s.id === id);

        if (anchorIndex !== -1 && currentIndex !== -1) {
          const startIndex = Math.min(anchorIndex, currentIndex);
          const endIndex = Math.max(anchorIndex, currentIndex);
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
          // Note: Don't update anchor on shift-click - keep it stable for range extension
        } else {
          // Fallback to single selection if indices not found
          newSelectedIds = [id];
          lastSelectedIdRef.current = id;
        }
      } else if (event.ctrlKey || event.metaKey || isCheckbox) {
        // Toggle selection with Ctrl/Cmd click OR checkbox click
        // Checkbox clicks should always toggle, not replace selection
        if (selectedIds.includes(id)) {
          newSelectedIds = selectedIds.filter((sid: string) => sid !== id);
        } else {
          newSelectedIds = [...selectedIds, id];
        }
        // Update anchor on ctrl-click/checkbox to enable shift-extending from this item
        lastSelectedIdRef.current = id;
      } else {
        // Single selection (card click without modifiers)
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
