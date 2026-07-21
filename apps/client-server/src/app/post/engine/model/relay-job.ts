/**
 * Relay engine — RelayJob working-tree root + its status roll-up.
 */

import { EntityId, NodeStatus, PostRecordResumeMode } from '@postybirb/types';
import { v4 } from 'uuid';
import type { RelayTask } from './relay-task';

/**
 * Top-level unit of work tracked by the scheduler: one posting attempt of one
 * submission. Owns the full tree of tasks/units that materialize the post and
 * carries the resume mode that controls how a re-run treats previously-
 * succeeded units.
 */
export class RelayJob {
  id: EntityId;
  submissionId: EntityId;
  attemptOf?: EntityId;
  resumeMode: PostRecordResumeMode;
  status: NodeStatus;
  createdAt: number;
  completedAt?: number;
  tasks: RelayTask[];

  constructor(init: {
    id?: EntityId;
    submissionId: EntityId;
    resumeMode?: PostRecordResumeMode;
    attemptOf?: EntityId;
  }) {
    this.id = init.id ?? v4();
    this.submissionId = init.submissionId;
    this.resumeMode = init.resumeMode ?? PostRecordResumeMode.NEW;
    this.attemptOf = init.attemptOf;
    this.status = NodeStatus.QUEUED;
    this.createdAt = Date.now();
    this.tasks = [];
  }

  /**
   * Roll up the task statuses into the job's effective status. The order of
   * checks below encodes a priority — earlier branches win:
   *  1. RUNNING wins so the UI shows live progress as long as anything is on
   *     the wire.
   *  2. WAITING surfaces "parked on a rate-limit/dependency gate" even when
   *     other tasks are still queued, so the UI can show a wait countdown.
   *  3. QUEUED/READY ⇒ RUNNING: from the user's perspective there's still
   *     active work to do, even if no task happens to be mid-dispatch right now.
   *  4. Any FAILED ⇒ the whole job is FAILED (one bad website fails the post).
   *  5. CANCELLED only wins if *every* task was cancelled; a mix of cancelled +
   *     succeeded is reported as SUCCEEDED so a single late cancel can't mask a
   *     post that already went out.
   *  6. Default: SUCCEEDED (only SUCCEEDED + SKIPPED remain).
   */
  computeStatus(): NodeStatus {
    const statuses = this.tasks.map((t) => t.status);
    if (statuses.length === 0) return NodeStatus.SUCCEEDED;
    if (statuses.some((s) => s === NodeStatus.RUNNING)) {
      return NodeStatus.RUNNING;
    }
    if (statuses.some((s) => s === NodeStatus.WAITING)) {
      return NodeStatus.WAITING;
    }
    if (statuses.some((s) => s === NodeStatus.QUEUED || s === NodeStatus.READY)) {
      return NodeStatus.RUNNING;
    }
    if (statuses.some((s) => s === NodeStatus.FAILED)) return NodeStatus.FAILED;
    if (statuses.every((s) => s === NodeStatus.CANCELLED)) {
      return NodeStatus.CANCELLED;
    }
    return NodeStatus.SUCCEEDED;
  }
}
