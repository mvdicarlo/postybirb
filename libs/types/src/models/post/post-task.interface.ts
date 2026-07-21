import { NodeStatus } from '../../enums';
import { AccountId } from '../account/account.interface';
import { EntityId, IEntity } from '../database/entity.interface';
import { Dependency } from './dependency.type';
import { IPostUnit } from './post-unit.interface';
import { ITaskError } from './task-error.interface';

export type TaskId = EntityId;

/**
 * Snapshot of account info captured at posting time, so history survives
 * account deletion.
 * @interface IPostAccountSnapshot
 */
export interface IPostAccountSnapshot {
  /** Account display name. */
  name: string;
  /** Website identifier (e.g. 'furaffinity'). */
  website: string;
}

/**
 * One posting destination within a {@link IPostJob}: a single account on a
 * single website. Owns the units that actually dispatch.
 * @interface IPostTask
 * @extends {IEntity}
 */
export interface IPostTask extends IEntity {
  /** The parent job. */
  jobId: EntityId;

  /** The account posted to (null if the account was later deleted). */
  accountId?: AccountId;

  /** The website identifier (stable name, e.g. 'weasyl'). */
  websiteId: string;

  /** Lifecycle status. */
  status: NodeStatus;

  /** Source-URL dependency gate (undefined = runs immediately). */
  dependency?: Dependency;

  /** Number of attempts consumed so far. */
  attempts: number;

  /** Maximum retry attempts before terminal failure. */
  maxAttempts: number;

  /** The canonical source URL for this task (its post page). */
  sourceUrl?: string;

  /** Any response message from the website. */
  message?: string;

  /** Error details when this task failed. */
  error?: ITaskError;

  /** Epoch ms until which this task is parked (rate-limit/dependency). */
  waitingUntil?: number;

  /** Account snapshot captured at posting time (survives deletion). */
  accountSnapshot?: IPostAccountSnapshot;

  /** The dispatch units (file batches or a single message). */
  units?: IPostUnit[];
}
