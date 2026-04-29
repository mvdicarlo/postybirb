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
 * Derived website post information from events.
 */
export interface DerivedWebsitePost {
  accountId: EntityId;
  accountName: string;
  websiteName: string;
  isSuccess: boolean;
  sourceUrls: string[];
  errors: string[];
}

/**
 * Extract website post results from post events.
 * Aggregates events per account to determine success/failure and source URLs.
 */
export function extractWebsitePostsFromEvents(
  events: PostEventDto[] | undefined,
): DerivedWebsitePost[] {
  if (!events || events.length === 0) return [];

  const postsByAccount = new Map<EntityId, DerivedWebsitePost>();

  for (const event of events) {
    if (!event.accountId) continue;

    // Get or create post entry for this account
    let post = postsByAccount.get(event.accountId);
    if (!post) {
      const accountSnapshot = event.metadata?.accountSnapshot;
      post = {
        accountId: event.accountId,
        // eslint-disable-next-line lingui/no-unlocalized-strings
        accountName: accountSnapshot?.name ?? 'Unknown',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        websiteName: accountSnapshot?.website ?? '?',
        isSuccess: false,
        sourceUrls: [],
        errors: [],
      };
      postsByAccount.set(event.accountId, post);
    }

    // Process event based on type
    switch (event.eventType) {
      case PostEventType.POST_ATTEMPT_COMPLETED:
        post.isSuccess = true;
        break;

      case PostEventType.POST_ATTEMPT_FAILED:
        post.isSuccess = false;
        if (event.error?.message) {
          post.errors.push(event.error.message);
        }
        break;

      case PostEventType.MESSAGE_POSTED:
      case PostEventType.FILE_POSTED:
        if (event.sourceUrl) {
          post.sourceUrls.push(event.sourceUrl);
        }
        break;

      case PostEventType.MESSAGE_FAILED:
      case PostEventType.FILE_FAILED:
        if (event.error?.message) {
          post.errors.push(event.error.message);
        }
        break;

      default:
        break;
    }
  }

  return Array.from(postsByAccount.values());
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

  // Build per-account event state
  const accountEvents = new Map<
    EntityId,
    { started: boolean; completed: boolean; failed: boolean; errors: string[] }
  >();

  for (const event of events) {
    if (!event.accountId) continue;

    let entry = accountEvents.get(event.accountId);
    if (!entry) {
      entry = { started: false, completed: false, failed: false, errors: [] };
      accountEvents.set(event.accountId, entry);
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

  // Classify each account that has events
  for (const [accountId, entry] of accountEvents) {
    if (entry.completed) {
      result.set(accountId, { status: 'success', errors: [] });
    } else if (entry.failed) {
      result.set(accountId, { status: 'failed', errors: entry.errors });
    } else if (entry.started) {
      result.set(accountId, { status: 'running', errors: [] });
    } else {
      result.set(accountId, { status: 'waiting', errors: [] });
    }
  }

  // Accounts with options but no events yet are "waiting" (later batch)
  for (const option of submission.options) {
    if (!option.isDefault && !result.has(option.accountId)) {
      result.set(option.accountId, { status: 'waiting', errors: [] });
    }
  }

  return result;
}
