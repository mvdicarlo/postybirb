/**
 * Per-account posting status derivation from the Relay job tree.
 */

import { EntityId, JobTreeNode } from '@postybirb/types';

/** Possible per-account post status values. */
export type AccountPostStatus =
  | 'success'
  | 'failed'
  | 'running'
  | 'waiting'
  | 'rate-limited'
  | null;

/** Per-account post status entry. */
export interface AccountPostStatusEntry {
  status: AccountPostStatus;
  errors: string[];
  /** ISO timestamp for when a rate-limit wait ends (only set when 'rate-limited'). */
  waitUntil?: string;
}

/**
 * Derive a per-account status map from a Relay {@link JobTreeNode}
 unit). Each task node targets one account; its status maps:
 *
 * | Task status            | AccountPostStatus |
 * |------------------------|-------------------|
 * | SUCCEEDED              | 'success'         |
 * | FAILED / CANCELLED     | 'failed'          |
 * | RUNNING                | 'running'         |
 * | WAITING                | 'rate-limited'    |
 * | QUEUED / READY / other | 'waiting'         |
 *
 * Returns an empty map when no job is provided.
 */
export function getAccountStatusFromJob(
  job: JobTreeNode | undefined,
): Map<EntityId, AccountPostStatusEntry> {
  const result = new Map<EntityId, AccountPostStatusEntry>();
  if (!job?.children) return result;

  for (const task of job.children) {
    if (!task.accountId) continue;
    let status: AccountPostStatus;
    switch (task.status) {
      case 'SUCCEEDED':
        status = 'success';
        break;
      case 'FAILED':
      case 'CANCELLED':
        status = 'failed';
        break;
      case 'RUNNING':
        status = 'running';
        break;
      case 'WAITING':
        status = 'rate-limited';
        break;
      default:
        status = 'waiting';
    }
    result.set(task.accountId, {
      status,
      errors: task.error ? [task.error.message] : [],
      waitUntil: task.waitingUntil,
    });
  }

  return result;
}
