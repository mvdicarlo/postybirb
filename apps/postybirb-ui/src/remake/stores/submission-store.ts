/**
 * Submission Store - Zustand store for submission entities.
 */

import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import type { ISubmissionDto, SubmissionId, SubmissionType } from '@postybirb/types';
import { useShallow } from 'zustand/shallow';
import submissionApi from '../api/submission.api';
import { createEntityStore, type EntityStore } from './create-entity-store';
import { SubmissionRecord } from './records';

/**
 * Fetch all submissions from the API.
 */
const fetchSubmissions = async (): Promise<ISubmissionDto[]> => {
  const response = await submissionApi.getAll();
  return response.body;
};

/**
 * Submission store instance.
 */
export const useSubmissionStore = createEntityStore<ISubmissionDto, SubmissionRecord>(
  fetchSubmissions,
  (dto) => new SubmissionRecord(dto),
  {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    storeName: 'SubmissionStore',
    websocketEvent: SUBMISSION_UPDATES,
  }
);

/**
 * Type alias for the submission store.
 */
export type SubmissionStoreState = EntityStore<SubmissionRecord>;

/** @deprecated Use SubmissionStoreState instead */
export type SubmissionStore = SubmissionStoreState;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all submissions.
 */
export const useSubmissions = (): SubmissionRecord[] =>
  useSubmissionStore((state: SubmissionStoreState) => state.records);

/**
 * Select submissions map for O(1) lookup.
 */
export const useSubmissionsMap = () =>
  useSubmissionStore((state: SubmissionStoreState) => state.recordsMap);

/**
 * Select submission loading state.
 */
export const useSubmissionsLoading = () =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select a specific submission by ID.
 */
export const useSubmission = (id: SubmissionId) =>
  useSubmissionStore((state: SubmissionStoreState) => state.recordsMap.get(id));

/**
 * Select submissions by type (FILE or MESSAGE).
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useSubmissionsByType = (type: SubmissionType): SubmissionRecord[] =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) =>
      state.records.filter((s) => s.type === type)
    )
  );

/**
 * Select non-template, non-multi submissions (regular submissions).
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useRegularSubmissions = (): SubmissionRecord[] =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) =>
      state.records.filter((s) => !s.isTemplate && !s.isMultiSubmission)
    )
  );

/**
 * Select template submissions.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useTemplateSubmissions = (): SubmissionRecord[] =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) =>
      state.records.filter((s) => s.isTemplate)
    )
  );

/**
 * Select scheduled submissions.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useScheduledSubmissions = (): SubmissionRecord[] =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) =>
      state.records.filter((s) => s.isScheduled && !s.isArchived)
    )
  );

/**
 * Select archived submissions.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useArchivedSubmissions = (): SubmissionRecord[] =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) =>
      state.records.filter((s) => s.isArchived)
    )
  );

/**
 * Select queued submissions.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useQueuedSubmissions = (): SubmissionRecord[] =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) =>
      state.records.filter((s) => s.isQueued)
    )
  );

/**
 * Select submissions with errors.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useSubmissionsWithErrors = (): SubmissionRecord[] =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) =>
      state.records.filter((s) => s.hasErrors)
    )
  );

/**
 * Select submission store actions.
 */
export const useSubmissionActions = () =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
