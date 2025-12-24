/**
 * SubmissionsContext - Provides submission data and actions to child components.
 * Eliminates prop drilling by making handlers and state available via context.
 */

import {
    ISubmissionScheduleInfo,
    IWebsiteFormFields,
    SubmissionType,
} from '@postybirb/types';
import { createContext, ReactNode, useContext, useMemo } from 'react';

/**
 * Shape of the submissions context value
 */
export interface SubmissionsContextValue {
  // Data
  /** The type of submissions being displayed */
  submissionType: SubmissionType;
  /** Currently selected submission IDs */
  selectedIds: string[];
  /** Whether drag-to-reorder is enabled */
  isDragEnabled: boolean;

  // Selection
  /** Handle selection of a submission (supports shift+click for range) */
  onSelect: (id: string, event: React.MouseEvent) => void;

  // Actions
  /** Delete a submission */
  onDelete: (id: string) => void;
  /** Duplicate a submission */
  onDuplicate: (id: string) => void;
  /** Open submission for editing */
  onEdit: (id: string) => void;
  /** Post a submission immediately */
  onPost: (id: string) => void;
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

const SubmissionsContext = createContext<SubmissionsContextValue | null>(null);

/**
 * Hook to access the submissions context.
 * Must be used within a SubmissionsProvider.
 * @throws Error if used outside of SubmissionsProvider
 */
export function useSubmissionsContext(): SubmissionsContextValue {
  const context = useContext(SubmissionsContext);
  if (!context) {
    // Developer error message - not shown to users
    throw new Error(
      // eslint-disable-next-line lingui/no-unlocalized-strings
      'useSubmissionsContext must be used within a SubmissionsProvider'
    );
  }
  return context;
}

/**
 * Optional hook that returns undefined if not within a provider.
 * Useful for components that can optionally use context.
 */
export function useSubmissionsContextOptional(): SubmissionsContextValue | null {
  return useContext(SubmissionsContext);
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
  onSelect: (id: string, event: React.MouseEvent) => void;
  /** Delete handler */
  onDelete: (id: string) => void;
  /** Duplicate handler */
  onDuplicate: (id: string) => void;
  /** Edit handler */
  onEdit: (id: string) => void;
  /** Post handler */
  onPost: (id: string) => void;
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
 * Wrap submission lists and cards with this to enable context-based access.
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
  onArchive,
  onViewHistory,
  onDefaultOptionChange,
  onScheduleChange,
}: SubmissionsProviderProps) {
  const value = useMemo<SubmissionsContextValue>(
    () => ({
      submissionType,
      selectedIds,
      isDragEnabled,
      onSelect,
      onDelete,
      onDuplicate,
      onEdit,
      onPost,
      onArchive,
      onViewHistory,
      onDefaultOptionChange,
      onScheduleChange,
    }),
    [
      submissionType,
      selectedIds,
      isDragEnabled,
      onSelect,
      onDelete,
      onDuplicate,
      onEdit,
      onPost,
      onArchive,
      onViewHistory,
      onDefaultOptionChange,
      onScheduleChange,
    ]
  );

  return (
    <SubmissionsContext.Provider value={value}>
      {children}
    </SubmissionsContext.Provider>
  );
}
