/**
 * Shared utilities for submission post history display and status derivation.
 */

import {
    EntityId,
    IUnitOfWork,
    UnitOfWorkState,
} from '@postybirb/types';
import type { SubmissionRecord } from '../../../../stores/records';

/**
 * Possible per-account post status values.
 */
export type AccountPostStatus =
  | 'success'
  | 'failed'
  | 'running'
  | 'waiting'
  | 'rate-limited'
  | 'cancelled'
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
 * Display metadata for a unit of work state.
 */
export interface UnitStateInfo {
  color: string;
  cssColor: string;
  label: string;
}

/**
 * Get color and label information for a unit of work state.
 */
export function getUnitStateInfo(state: UnitOfWorkState): UnitStateInfo {
  switch (state) {
    case UnitOfWorkState.SUCCEEDED:
      return {
        color: 'green',
        cssColor: 'var(--mantine-color-green-5)',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        label: 'Succeeded',
      };
    case UnitOfWorkState.FAILED:
      return {
        color: 'red',
        cssColor: 'var(--mantine-color-red-5)',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        label: 'Failed',
      };
    case UnitOfWorkState.EXECUTING:
      return {
        color: 'blue',
        cssColor: 'var(--mantine-color-blue-5)',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        label: 'Posting',
      };
    case UnitOfWorkState.VALIDATING:
      return {
        color: 'blue',
        cssColor: 'var(--mantine-color-blue-5)',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        label: 'Validating',
      };
    case UnitOfWorkState.RATE_LIMITED:
      return {
        color: 'yellow',
        cssColor: 'var(--mantine-color-yellow-6)',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        label: 'Rate limited',
      };
    case UnitOfWorkState.CANCELLED:
      return {
        color: 'gray',
        cssColor: 'var(--mantine-color-gray-6)',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        label: 'Cancelled',
      };
    case UnitOfWorkState.NEW:
    case UnitOfWorkState.PENDING:
    default:
      return {
        color: 'gray',
        cssColor: 'var(--mantine-color-gray-5)',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        label: 'Waiting',
      };
  }
}

function readStringField(
  source: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = source[field];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/**
 * Extract human readable error messages from a unit of work's website response.
 */
export function getUnitErrorMessages(unit: IUnitOfWork): string[] {
  const { response } = unit;
  if (!response) return [];

  const messages: string[] = [];
  const exception = response.exception as Record<string, unknown> | undefined;

  if (exception) {
    const exceptionMessage =
      readStringField(exception, 'message') ??
      readStringField(exception, 'name');
    if (exceptionMessage) {
      messages.push(exceptionMessage);
    }
  }

  const error = readStringField(response, 'error');
  if (error) messages.push(error);

  const message = readStringField(response, 'message');
  if (message) messages.push(message);

  return [...new Set(messages)];
}

/**
 * Extract the full stack trace from a unit of work's website response.
 */
export function getUnitErrorStack(unit: IUnitOfWork): string | undefined {
  const exception = unit.response?.exception as
    | Record<string, unknown>
    | undefined;
  return exception ? readStringField(exception, 'stack') : undefined;
}

function classifyAccountStatus(units: IUnitOfWork[]): AccountPostStatus {
  const has = (state: UnitOfWorkState) =>
    units.some((unit) => unit.state === state);

  if (has(UnitOfWorkState.FAILED)) return 'failed';
  if (has(UnitOfWorkState.EXECUTING) || has(UnitOfWorkState.VALIDATING)) {
    return 'running';
  }
  if (has(UnitOfWorkState.RATE_LIMITED)) return 'rate-limited';
  if (has(UnitOfWorkState.NEW) || has(UnitOfWorkState.PENDING)) return 'waiting';
  if (has(UnitOfWorkState.SUCCEEDED)) return 'success';
  if (has(UnitOfWorkState.CANCELLED)) return 'cancelled';
  return 'waiting';
}

/**
 * Derive a per-account post status map from the submission's units of work.
 *
 * Status is aggregated across every active unit belonging to an account, using
 * the priority failed > running > rate-limited > waiting > success > cancelled
 * so the most actionable state wins.
 */
export function getAccountPostStatusMap(
  submission: SubmissionRecord,
): Map<EntityId, AccountPostStatusEntry> {
  const result = new Map<EntityId, AccountPostStatusEntry>();

  for (const [accountId, units] of submission.unitsOfWorkByAccount) {
    const activeUnits = units.filter((unit) => !unit.evicted);
    if (activeUnits.length === 0) continue;

    const errors = activeUnits.flatMap(getUnitErrorMessages);
    const waitUntil = activeUnits
      .filter((unit) => unit.state === UnitOfWorkState.RATE_LIMITED)
      .map((unit) => unit.rateLimitedUntil)
      .filter((value): value is string => Boolean(value))
      .sort()[0];

    result.set(accountId, {
      status: classifyAccountStatus(activeUnits),
      errors: [...new Set(errors)],
      waitUntil,
    });
  }

  // Accounts configured on the submission with no units yet are queued for a later batch.
  for (const option of submission.options) {
    if (!option.isDefault && !result.has(option.accountId)) {
      result.set(option.accountId, { status: 'waiting', errors: [] });
    }
  }

  return result;
}

/**
 * Resolve a display name for the file a unit of work targets.
 */
export function getUnitFileName(
  submission: SubmissionRecord,
  unit: IUnitOfWork,
): string | undefined {
  if (!unit.fileId) return undefined;
  return submission.files.find((file) => file.id === unit.fileId)?.fileName;
}

/**
 * Count units by state for a single account's group.
 */
export function getAccountUnitCounts(units: IUnitOfWork[]): {
  succeeded: number;
  failed: number;
  running: number;
  pending: number;
  evicted: number;
} {
  const counts = {
    succeeded: 0,
    failed: 0,
    running: 0,
    pending: 0,
    evicted: 0,
  };

  for (const unit of units) {
    if (unit.evicted) {
      counts.evicted += 1;
      continue;
    }

    switch (unit.state) {
      case UnitOfWorkState.SUCCEEDED:
        counts.succeeded += 1;
        break;
      case UnitOfWorkState.FAILED:
        counts.failed += 1;
        break;
      case UnitOfWorkState.EXECUTING:
      case UnitOfWorkState.VALIDATING:
        counts.running += 1;
        break;
      default:
        counts.pending += 1;
        break;
    }
  }

  return counts;
}
