/**
 * Submission Store - Zustand store for submission entities.
 */

import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import type { ISubmissionDto, SubmissionId, SubmissionType, ValidationResult } from '@postybirb/types';
import { useShallow } from 'zustand/react/shallow';
import submissionApi from '../../api/submission.api';
import { createEntityStore, type EntityStore } from '../create-entity-store';
import { SubmissionRecord } from '../records';

// ============================================================================
// Submission-specific change detection
// ============================================================================

/**
 * Build a cheap fingerprint of a validation result's errors and warnings.
 * Skips the `account` field (large, stable) — only stringifies the small
 * error/warning arrays which are the actual changing content.
 */
function validationFingerprint(v: ValidationResult): string {
  return `${v.id}:${JSON.stringify(v.errors ?? [])}|${JSON.stringify(v.warnings ?? [])}`;
}

/**
 * Find the maximum `updatedAt` ISO string in an array of entities.
 * Returns an empty string when the array is empty.
 */
function maxUpdatedAt(items: { updatedAt: string }[]): string {
  if (items.length === 0) return '';
  let max = items[0].updatedAt;
  for (let i = 1; i < items.length; i++) {
    if (items[i].updatedAt > max) max = items[i].updatedAt;
  }
  return max;
}

/**
 * Deep change-detection for submissions.
 *
 * A submission's root `updatedAt` does NOT reflect changes to nested entities
 * (files, options, posts are separate DB tables) and `ValidationResult` has no
 * `updatedAt` at all. This comparator checks all dimensions:
 *
 * - Root `updatedAt`
 * - File count + max file `updatedAt`
 * - Option count + max option `updatedAt`
 * - Post count + max post `updatedAt` + latest post state
 * - PostQueueRecord presence / id
 * - Validation fingerprint (JSON of errors/warnings arrays, excluding account)
 */
function submissionHasChanged(existing: SubmissionRecord, dto: ISubmissionDto): boolean {
  // 1. Root entity changed
  if (dto.updatedAt !== existing.updatedAt.toISOString()) return true;

  // 2. Files changed
  const dtoFiles = dto.files ?? [];
  if (dtoFiles.length !== existing.files.length) return true;
  if (dtoFiles.length > 0 && maxUpdatedAt(dtoFiles) !== maxUpdatedAt(existing.files)) return true;

  // 3. Options changed
  const dtoOptions = dto.options ?? [];
  if (dtoOptions.length !== existing.options.length) return true;
  if (dtoOptions.length > 0 && maxUpdatedAt(dtoOptions) !== maxUpdatedAt(existing.options)) return true;

  // 4. Posts changed (count, timestamps, or state)
  const dtoPosts = dto.posts ?? [];
  if (dtoPosts.length !== existing.posts.length) return true;
  if (dtoPosts.length > 0) {
    if (maxUpdatedAt(dtoPosts) !== maxUpdatedAt(existing.posts)) return true;
    // Check if any post state changed (e.g. RUNNING → DONE)
    const dtoLatestState = dtoPosts[dtoPosts.length - 1]?.state;
    const existingLatestState = existing.posts[existing.posts.length - 1]?.state;
    if (dtoLatestState !== existingLatestState) return true;
  }

  // 5. PostQueueRecord changed
  const dtoQueueId = dto.postQueueRecord?.id ?? null;
  const existingQueueId = existing.postQueueRecord?.id ?? null;
  if (dtoQueueId !== existingQueueId) return true;

  // 6. Validations changed (ephemeral — no updatedAt, use fingerprint)
  const dtoValidations = dto.validations ?? [];
  if (dtoValidations.length !== existing.validations.length) return true;
  for (let i = 0; i < dtoValidations.length; i++) {
    if (validationFingerprint(dtoValidations[i]) !== validationFingerprint(existing.validations[i])) {
      return true;
    }
  }

  return false;
}

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
    hasChanged: submissionHasChanged,
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
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useSubmissions = (): SubmissionRecord[] =>
  useSubmissionStore(useShallow((state: SubmissionStoreState) => state.records));

/**
 * Select submissions map for O(1) lookup.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useSubmissionsMap = () =>
  useSubmissionStore(useShallow((state: SubmissionStoreState) => state.recordsMap));

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
 * Select submissions with a schedule (scheduledFor or cron, not archived/template).
 * Used by ScheduleCalendar to avoid subscribing to all submissions.
 */
export const useSubmissionsWithSchedule = (): SubmissionRecord[] =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) =>
      state.records.filter(
        (s) =>
          !s.isArchived &&
          !s.isTemplate &&
          (s.schedule.scheduledFor || s.schedule.cron)
      )
    )
  );

/**
 * Select unscheduled, non-archived, non-template, non-multi submissions.
 * Used by SubmissionList in the schedule drawer.
 */
export const useUnscheduledSubmissions = (): SubmissionRecord[] =>
  useSubmissionStore(
    useShallow((state: SubmissionStoreState) =>
      state.records.filter(
        (s) =>
          !s.isArchived &&
          !s.isTemplate &&
          !s.isMultiSubmission &&
          !s.schedule.scheduledFor &&
          !s.schedule.cron
      )
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
 * No useShallow needed — action function refs are stable.
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
