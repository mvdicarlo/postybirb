/**
 * Shared utilities for submission post history display and status derivation.
 */

import {
  EntityId,
  PostEventDto,
  PostEventType,
  PostRecordDto,
  PostRecordState,
} from '@postybirb/types';
import type { SubmissionRecord } from '../../../../stores/records';

/**
 * Lifecycle status for an individual website post within a post record.
 * - 'pending'  : account appears in events (or is expected) but no START yet
 * - 'running'  : POST_ATTEMPT_STARTED received, no terminal event yet
 * - 'success'  : POST_ATTEMPT_COMPLETED received
 * - 'failed'   : POST_ATTEMPT_FAILED received
 */
export type DerivedWebsitePostStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed';

/**
 * Derived website post information from events.
 */
export interface DerivedWebsitePost {
  accountId: EntityId;
  accountName: string;
  websiteName: string;
  status: DerivedWebsitePostStatus;
  sourceUrls: string[];
  errors: string[];
}

// =============================================================================
// Shared per-account event accumulator (used by both extractWebsitePostsFromEvents
// and getAccountPostStatusMap to avoid duplicating the event classification logic).
// =============================================================================

interface AccountEventAccumulator {
  started: boolean;
  completed: boolean;
  failed: boolean;
  errors: string[];
  sourceUrls: string[];
  accountName: string;
  websiteName: string;
}

/**
 * Accumulate per-account lifecycle flags from a list of post events.
 */
function accumulateAccountEvents(
  events: PostEventDto[],
): Map<EntityId, AccountEventAccumulator> {
  const map = new Map<EntityId, AccountEventAccumulator>();

  for (const event of events) {
    if (!event.accountId) continue;

    let entry = map.get(event.accountId);
    if (!entry) {
      const snap = event.metadata?.accountSnapshot;
      entry = {
        started: false,
        completed: false,
        failed: false,
        errors: [],
        sourceUrls: [],
        // eslint-disable-next-line lingui/no-unlocalized-strings
        accountName: snap?.name ?? 'Unknown',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        websiteName: snap?.website ?? '?',
      };
      map.set(event.accountId, entry);
    }

    switch (event.eventType) {
      case PostEventType.POST_ATTEMPT_STARTED:
        entry.started = true;
        break;
      case PostEventType.POST_ATTEMPT_COMPLETED:
        entry.completed = true;
        break;
      case PostEventType.POST_ATTEMPT_FAILED:
        entry.failed = true;
        if (event.error?.message) {
          entry.errors.push(event.error.message);
        }
        break;
      case PostEventType.MESSAGE_POSTED:
      case PostEventType.FILE_POSTED:
        if (event.sourceUrl) {
          entry.sourceUrls.push(event.sourceUrl);
        }
        break;
      case PostEventType.MESSAGE_FAILED:
      case PostEventType.FILE_FAILED:
        if (event.error?.message) {
          entry.errors.push(event.error.message);
        }
        break;
      default:
        break;
    }
  }

  return map;
}

/**
 * Classify lifecycle flags into a single status.
 * Priority: completed > failed > started > pending.
 */
function classifyStatus(entry: {
  started: boolean;
  completed: boolean;
  failed: boolean;
}): DerivedWebsitePostStatus {
  if (entry.completed) return 'success';
  if (entry.failed) return 'failed';
  if (entry.started) return 'running';
  return 'pending';
}

/**
 * Extract website post results from post events.
 * Aggregates events per account to determine lifecycle status and source URLs.
 * An account that has only POST_ATTEMPT_STARTED is reported as 'running'
 * (rather than incorrectly defaulting to 'failed').
 */
export function extractWebsitePostsFromEvents(
  events: PostEventDto[] | undefined,
): DerivedWebsitePost[] {
  if (!events || events.length === 0) return [];

  const accumulated = accumulateAccountEvents(events);

  return Array.from(accumulated.entries()).map(([accountId, entry]) => ({
    accountId,
    accountName: entry.accountName,
    websiteName: entry.websiteName,
    status: classifyStatus(entry),
    sourceUrls: entry.sourceUrls,
    errors: entry.errors,
  }));
}

/**
 * Export post record to a JSON file (browser download).
 */
export function exportPostRecordToFile(record: PostRecordDto): string {
  const jsonString = JSON.stringify(record, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const formattedDate = new Date(record.createdAt).toISOString().split('T')[0];
  const filename = `post-record-${record.id}-${formattedDate}.json`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Format duration in human-readable format.
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    return `${minutes}m ${seconds % 60}s`;
  }
  if (seconds < 1) {
    // eslint-disable-next-line lingui/no-unlocalized-strings
    return '< 1s';
  }
  // eslint-disable-next-line lingui/no-unlocalized-strings
  return `${seconds}s`;
}

/**
 * Get icon for post record state (used in PostRecordCard).
 * Returns a React element — import from React consumers only.
 */
export function getPostRecordStateInfo(state: PostRecordState): {
  color: string;
  label: string;
} {
  switch (state) {
    case PostRecordState.DONE:
      // eslint-disable-next-line lingui/no-unlocalized-strings
      return { color: 'var(--mantine-color-green-5)', label: 'Done' };
    case PostRecordState.FAILED:
      // eslint-disable-next-line lingui/no-unlocalized-strings
      return { color: 'var(--mantine-color-red-5)', label: 'Failed' };
    case PostRecordState.RUNNING:
      // eslint-disable-next-line lingui/no-unlocalized-strings
      return { color: 'var(--mantine-color-blue-5)', label: 'Running' };
    case PostRecordState.PENDING:
    default:
      // eslint-disable-next-line lingui/no-unlocalized-strings
      return { color: 'var(--mantine-color-gray-5)', label: 'Pending' };
  }
}

// =============================================================================
// Per-account post status derivation (Phase 3)
// =============================================================================

/**
 * Possible per-account post status values.
 */
export type AccountPostStatus =
  | 'success'
  | 'failed'
  | 'running'
  | 'waiting'
  | 'rate-limited'
  | null;

/**
 * Per-account post status entry.
 */
export interface AccountPostStatusEntry {
  status: AccountPostStatus;
  errors: string[];
  /** ISO timestamp for when a rate-limit wait ends (only set when status is 'rate-limited'). */
  waitUntil?: string;
}

/**
 * Derive a per-account post status map from the submission's latest post record.
 *
 * Uses `latestPost` (not `latestCompletedPost`) so that RUNNING and PENDING
 * states are surfaced. Status is derived purely from the event lifecycle:
 *
 * | Events for account                                  | Status    |
 * |-----------------------------------------------------|-----------|
 * | Post record is PENDING (no events)                  | 'waiting' |
 * | POST_ATTEMPT_STARTED only (no terminal event)       | 'running' |
 * | POST_ATTEMPT_COMPLETED present                      | 'success' |
 * | POST_ATTEMPT_FAILED present                         | 'failed'  |
 * | Account not in events at all (later batch)          | 'waiting' |
 * | No latestPost exists                                | empty map |
 */
export function getAccountPostStatusMap(
  submission: SubmissionRecord,
): Map<EntityId, AccountPostStatusEntry> {
  const result = new Map<EntityId, AccountPostStatusEntry>();
  const { latestPost } = submission;

  if (!latestPost) return result;

  // If the post record is PENDING, no events have been created yet.
  // All accounts that have options in this submission are "waiting".
  if (latestPost.state === PostRecordState.PENDING) {
    for (const option of submission.options) {
      if (!option.isDefault) {
        result.set(option.accountId, { status: 'waiting', errors: [] });
      }
    }
    return result;
  }

  // For RUNNING, DONE, or FAILED records — inspect events
  const { events } = latestPost;
  if (!events || events.length === 0) {
    // Record exists but no events yet — treat all accounts as waiting
    for (const option of submission.options) {
      if (!option.isDefault) {
        result.set(option.accountId, { status: 'waiting', errors: [] });
      }
    }
    return result;
  }

  // Reuse the shared accumulator and classifier
  const accumulated = accumulateAccountEvents(events);

  for (const [accountId, entry] of accumulated) {
    const status = classifyStatus(entry);
    // Map DerivedWebsitePostStatus to AccountPostStatus
    const mappedStatus: AccountPostStatus =
      status === 'pending' ? 'waiting' : status;
    result.set(accountId, { status: mappedStatus, errors: entry.errors });
  }

  // Accounts with options but no events yet are "waiting" (later batch)
  for (const option of submission.options) {
    if (!option.isDefault && !result.has(option.accountId)) {
      result.set(option.accountId, { status: 'waiting', errors: [] });
    }
  }

  return result;
}
