/**
 * Relay engine — NodeStatus state-machine helpers.
 *
 * Generic predicates over a status (or any job/task/unit node that carries
 * one).
 */

import { NodeStatus } from '@postybirb/types';

/** Statuses that mean "do not run again on resume". */
export const TERMINAL_DONE: ReadonlySet<NodeStatus> = new Set([
  NodeStatus.SUCCEEDED,
  NodeStatus.SKIPPED,
]);

/** Statuses that mean "fully finished" (no more work). */
export const TERMINAL_ALL: ReadonlySet<NodeStatus> = new Set([
  NodeStatus.SUCCEEDED,
  NodeStatus.SKIPPED,
  NodeStatus.FAILED,
  NodeStatus.CANCELLED,
]);

/** A status, or any node (job/task/unit) that carries one. */
export type StatusLike = NodeStatus | { status: NodeStatus };

function statusOf(value: StatusLike): NodeStatus {
  return typeof value === 'string' ? value : value.status;
}

/**
 * True when a node has reached a fully-terminal state (succeeded, skipped,
 * failed or cancelled) — there is no further work to do for it.
 */
export function isTerminal(value: StatusLike): boolean {
  return TERMINAL_ALL.has(statusOf(value));
}

/**
 * True when a node is "done" for resume purposes (succeeded or skipped) and so
 * must not be re-run on a CONTINUE resume.
 */
export function isDone(value: StatusLike): boolean {
  return TERMINAL_DONE.has(statusOf(value));
}
