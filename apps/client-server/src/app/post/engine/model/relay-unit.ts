/**
 * Relay engine — RelayUnit working-tree node.
 */

import {
    EntityId,
    ITaskError,
    NodeStatus,
    SubmissionFileId,
    UnitKind,
} from '@postybirb/types';
import { v4 } from 'uuid';

/**
 * Smallest unit of dispatchable work inside a task: either one file batch
 * (a single onPostFileSubmission call carrying `fileBatchSize` files) or the
 * one-shot message body for a message website. A task may own many BATCH
 * units when a file submission is sharded across multiple posts; message
 * tasks always have exactly one MESSAGE unit.
 *
 * Units own their own status so a partial failure mid-task (e.g. batch 2 of 4
 * is rate-limited or errors) can be resumed without re-posting the batches
 * that already succeeded — the cornerstone of the engine's idempotency.
 */
export class RelayUnit {
  id: EntityId;
  taskId: EntityId;
  kind: UnitKind;
  ordinal: number;
  status: NodeStatus;
  fileIds: SubmissionFileId[];
  sourceUrl?: string;
  error?: ITaskError;

  constructor(init: {
    id?: EntityId;
    taskId: EntityId;
    kind: UnitKind;
    ordinal: number;
    fileIds?: SubmissionFileId[];
  }) {
    this.id = init.id ?? v4();
    this.taskId = init.taskId;
    this.kind = init.kind;
    this.ordinal = init.ordinal;
    this.status = NodeStatus.QUEUED;
    this.fileIds = init.fileIds ?? [];
  }
}
