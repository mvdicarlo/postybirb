import { NodeStatus, PostRecordResumeMode } from '../../enums';
import { EntityId, IEntity } from '../database/entity.interface';
import { ISubmission, SubmissionId } from '../submission/submission.interface';
import { IPostTask } from './post-task.interface';

export type JobId = EntityId;

/**
 * One posting attempt for a submission: the root of a job tree.
 * The tree (job → tasks → units) IS the persisted state; resume re-runs any
 * node not in a terminal-done status.
 * @interface IPostJob
 * @extends {IEntity}
 */
export interface IPostJob extends IEntity {
  /** App version that created the job (for diagnostics). */
  version?: string;

  /** The submission being posted. */
  submissionId: SubmissionId;

  /** The resolved submission relation. */
  submission?: ISubmission;

  /**
   * The job this one is a retry/continuation of (null if it is the origin).
   * Replaces the legacy originPostRecordId chain.
   */
  attemptOf?: EntityId;

  /** Lifecycle status (derived from task statuses on completion). */
  status: NodeStatus;

  /** How this job resumes prior work. */
  resumeMode: PostRecordResumeMode;

  /** When the job reached a terminal state. */
  completedAt?: string;

  /** The posting destinations (one per account+website). */
  tasks?: IPostTask[];
}
