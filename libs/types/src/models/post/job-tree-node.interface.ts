import { NodeStatus } from '../../enums';

/**
 * The compact, recursive shape the UI renders for live posting state.
 * Produced by projecting a job tree (job → tasks → units). Pushed as deltas
 * over WebSocket and fetched as a snapshot on reload.
 * @interface JobTreeNode
 */
export interface JobTreeNode {
  /** Node id (job/task/unit id). */
  id: string;

  /** Which level of the tree this node is. */
  kind: 'job' | 'task' | 'unit';

  /**
   * The submission this node belongs to (present on job nodes). Lets the UI
   * correlate a job tree back to its submission.
   */
  submissionId?: string;

  /** The account this node targets (present on task nodes). */
  accountId?: string;

  /** Human-readable label (submission title / account / batch number). */
  label: string;

  /** Lifecycle status. */
  status: NodeStatus;

  /** Completion progress (e.g. units done / total). */
  progress?: { done: number; total: number };

  /** ISO timestamp until which this node is waiting (rate-limit/dependency). */
  waitingUntil?: string;

  /** Source URL once posted. */
  sourceUrl?: string;

  /** Error summary when failed. */
  error?: { kind: string; stage: string; message: string };

  /** Child nodes. */
  children?: JobTreeNode[];
}
