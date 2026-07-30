import { NodeStatus } from '@postybirb/types';
import postApi from '../../../../api/post.api';

/** Outcomes of a previous attempt that a resume can build on. */
const RESUMABLE_STATUSES: NodeStatus[] = [
  NodeStatus.FAILED,
  NodeStatus.CANCELLED,
];

/**
 * True when the submission's most recent post attempt ended without fully
 * succeeding, meaning the user should be asked how to treat that attempt
 * before starting another. Throws if the history cannot be read: posting blind
 * would re-send destinations that already went out.
 */
export async function hasResumableAttempt(
  submissionId: string,
): Promise<boolean> {
  const { body } = await postApi.getJobHistory(submissionId);
  const [newest] = body ?? [];
  return !!newest && RESUMABLE_STATUSES.includes(newest.status);
}
