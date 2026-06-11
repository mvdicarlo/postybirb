import { NodeStatus, UnitKind } from '../../enums';
import { EntityId, IEntity } from '../database/entity.interface';
import { SubmissionFileId } from '../submission/submission-file.interface';
import { ITaskError } from './task-error.interface';

export type UnitId = EntityId;

/**
 * An atomic dispatch unit within a {@link IPostTask}.
 *  - For FILE submissions: one BATCH unit per file batch (sized by the
 *    website's fileBatchSize). Each batch is independently resumable.
 *  - For MESSAGE submissions: a single MESSAGE unit.
 * @interface IPostUnit
 * @extends {IEntity}
 */
export interface IPostUnit extends IEntity {
  /** The parent task. */
  taskId: EntityId;

  /** Whether this is a file batch or a message. */
  kind: UnitKind;

  /** Ordering within the task (batch index). */
  ordinal: number;

  /** Lifecycle status. */
  status: NodeStatus;

  /** The files in this batch (empty for MESSAGE units). */
  fileIds: SubmissionFileId[];

  /** The source URL produced when this unit posted successfully. */
  sourceUrl?: string;

  /** Error details when this unit failed. */
  error?: ITaskError;
}
