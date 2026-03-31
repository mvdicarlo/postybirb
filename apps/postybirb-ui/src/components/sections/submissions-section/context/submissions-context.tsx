/**
 * SubmissionsContext - Split into Data and Actions contexts for performance.
 * Data context changes on selection; Actions context is stable across selections.
 * This prevents action-only consumers (cards) from re-rendering on every selection change.
 */

import {
    ISubmissionScheduleInfo,
    IWebsiteFormFields,
    SubmissionType,
} from '@postybirb/types';
import { createContext, ReactNode, useContext, useMemo } from 'react';

/**
 * Data portion of submissions context — changes frequently (e.g. on selection).
 */
export interface SubmissionsDataValue {
  /** The type of submissions being displayed */
  submissionType: SubmissionType;
  /** Currently selected submission IDs */
  selectedIds: string[];
  /** Whether drag-to-reorder is enabled */
  isDragEnabled: boolean;
}

/**
 * Actions portion of submissions context — stable across selection changes.
 */
export interface SubmissionsActionsValue {
  /** Handle selection of a submission (supports shift+click for range, ctrl+click toggle, checkbox toggle) */
  onSelect: (id: string, event: React.MouseEvent | React.KeyboardEvent, isCheckbox?: boolean) => void;
  /** Delete a submission */
  onDelete: (id: string) => void;
  /** Duplicate a submission */
  onDuplicate: (id: string) => void;
  /** Open submission for editing */
  onEdit: (id: string) => void;
  /** Post a submission immediately */
  onPost: (id: string) => void;
  /** Cancel a queued/posting submission */
  onCancel?: (id: string) => void;
  /** Archive a submission */
  onArchive?: (id: string) => void;
  /** View submission history (optional - only available when drawer is configured) */
  onViewHistory?: (id: string) => void;
  /** Update submission's default option fields */
  onDefaultOptionChange: (id: string, update: Partial<IWebsiteFormFields>) => void;
  /** Update submission's schedule */
  onScheduleChange: (
    id: string,
    schedule: ISubmissionScheduleInfo,
    isScheduled: boolean
  ) => void;
}

const SubmissionsDataContext = createContext<SubmissionsDataValue | null>(null);
const SubmissionsActionsContext = createContext<SubmissionsActionsValue | null>(null);

/**
 * Hook to access submission data (selectedIds, submissionType, isDragEnabled).
 * Re-renders when data changes (e.g. selection).
 * @throws Error if used outside of SubmissionsProvider
 */
export function useSubmissionsData(): SubmissionsDataValue {
  const context = useContext(SubmissionsDataContext);
  if (!context) {
    throw new Error(
      // eslint-disable-next-line lingui/no-unlocalized-strings
      'useSubmissionsData must be used within a SubmissionsProvider'
    );
  }
  return context;
}

/**
 * Hook to access submission action handlers.
 * Does NOT re-render when selection changes.
 * @throws Error if used outside of SubmissionsProvider
 */
export function useSubmissionsActions(): SubmissionsActionsValue {
  const context = useContext(SubmissionsActionsContext);
  if (!context) {
    throw new Error(
      // eslint-disable-next-line lingui/no-unlocalized-strings
      'useSubmissionsActions must be used within a SubmissionsProvider'
    );
  }
  return context;
}

export interface SubmissionsProviderProps {
  children: ReactNode;
  /** The type of submissions (FILE or MESSAGE) */
  submissionType: SubmissionType;
  /** Currently selected submission IDs */
  selectedIds: string[];
  /** Whether drag-to-reorder is enabled */
  isDragEnabled: boolean;
  /** Selection handler */
  onSelect: (id: string, event: React.MouseEvent | React.KeyboardEvent, isCheckbox?: boolean) => void;
  /** Delete handler */
  onDelete: (id: string) => void;
  /** Duplicate handler */
  onDuplicate: (id: string) => void;
  /** Edit handler */
  onEdit: (id: string) => void;
  /** Post handler */
  onPost: (id: string) => void;
  /** Cancel handler (optional) */
  onCancel?: (id: string) => void;
  /** Archive handler (optional) */
  onArchive?: (id: string) => void;
  /** View history handler (optional) */
  onViewHistory?: (id: string) => void;
  /** Default option change handler */
  onDefaultOptionChange: (id: string, update: Partial<IWebsiteFormFields>) => void;
  /** Schedule change handler */
  onScheduleChange: (
    id: string,
    schedule: ISubmissionScheduleInfo,
    isScheduled: boolean
  ) => void;
}

/**
 * Provider component that supplies submission context to children.
 * Uses two separate contexts so action-only consumers don't re-render on selection changes.
 */
export function SubmissionsProvider({
  children,
  submissionType,
  selectedIds,
  isDragEnabled,
  onSelect,
  onDelete,
  onDuplicate,
  onEdit,
  onPost,
  onCancel,
  onArchive,
  onViewHistory,
  onDefaultOptionChange,
  onScheduleChange,
}: SubmissionsProviderProps) {
  const dataValue = useMemo<SubmissionsDataValue>(
    () => ({
      submissionType,
      selectedIds,
      isDragEnabled,
    }),
    [submissionType, selectedIds, isDragEnabled]
  );

  const actionsValue = useMemo<SubmissionsActionsValue>(
    () => ({
      onSelect,
      onDelete,
      onDuplicate,
      onEdit,
      onPost,
      onCancel,
      onArchive,
      onViewHistory,
      onDefaultOptionChange,
      onScheduleChange,
    }),
    [
      onSelect,
      onDelete,
      onDuplicate,
      onEdit,
      onPost,
      onCancel,
      onArchive,
      onViewHistory,
      onDefaultOptionChange,
      onScheduleChange,
    ]
  );

  return (
    <SubmissionsActionsContext.Provider value={actionsValue}>
      <SubmissionsDataContext.Provider value={dataValue}>
        {children}
      </SubmissionsDataContext.Provider>
    </SubmissionsActionsContext.Provider>
  );
}
