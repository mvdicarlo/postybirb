/**
 * SubmissionEditCardContext - Context provider for individual submission edit cards.
 * Each card has its own context to manage its submission state and actions.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { SubmissionRecord } from '../../../../../stores/records';

/**
 * Context value for a submission edit card.
 */
export interface SubmissionEditCardContextValue {
  /** The submission being edited */
  submission: SubmissionRecord;
  /** Whether the card can be collapsed (multiple selections, not mass edit) */
  isCollapsible: boolean;
  /** Target submission IDs for mass edit mode (to pre-populate Save To Many) */
  targetSubmissionIds?: string[];
}

const SubmissionEditCardContext =
  createContext<SubmissionEditCardContextValue | null>(null);

/**
 * Props for the SubmissionEditCardProvider.
 */
interface SubmissionEditCardProviderProps {
  children: ReactNode;
  submission: SubmissionRecord;
  isCollapsible: boolean;
  targetSubmissionIds?: string[];
}

/**
 * Provider component for submission edit card context.
 */
export function SubmissionEditCardProvider({
  children,
  submission,
  isCollapsible,
  targetSubmissionIds,
}: SubmissionEditCardProviderProps) {
  const value = useMemo<SubmissionEditCardContextValue>(
    () => ({
      submission,
      isCollapsible,
      targetSubmissionIds,
    }),
    [submission, isCollapsible, targetSubmissionIds],
  );

  return (
    <SubmissionEditCardContext.Provider value={value}>
      {children}
    </SubmissionEditCardContext.Provider>
  );
}

/**
 * Hook to access the submission edit card context.
 * Throws if used outside of a SubmissionEditCardProvider.
 */
export function useSubmissionEditCardContext(): SubmissionEditCardContextValue {
  const context = useContext(SubmissionEditCardContext);
  if (!context) {
    throw new Error(
      // eslint-disable-next-line lingui/no-unlocalized-strings
      'useSubmissionEditCardContext must be used within a SubmissionEditCardProvider',
    );
  }
  return context;
}

/**
 * Hook to access the submission edit card context (optional).
 * Returns null if used outside of a SubmissionEditCardProvider.
 */
export function useSubmissionEditCardContextOptional(): SubmissionEditCardContextValue | null {
  return useContext(SubmissionEditCardContext);
}
