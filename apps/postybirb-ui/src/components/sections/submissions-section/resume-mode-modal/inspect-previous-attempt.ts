import { JobTreeNode, NodeStatus, SubmissionFileId } from '@postybirb/types';
import postApi from '../../../../api/post.api';

/** Outcomes of a previous attempt that a resume can build on. */
const RESUMABLE_STATUSES: NodeStatus[] = [
  NodeStatus.FAILED,
  NodeStatus.CANCELLED,
];

export interface PreviousAttemptProbe {
  /**
   * The submission's most recent post attempt ended without fully succeeding,
   * so the user should be asked how to treat it before starting another.
   */
  resumable: boolean;

  /**
   * The submission has files that attempt never planned to post. Websites it
   * already finished will receive those files as a separate post rather than
   * folding them into the one that already went out.
   */
  hasNewFiles: boolean;
}

/** Every file id the attempt planned to post, across all of its destinations. */
function plannedFileIds(attempt: JobTreeNode): Set<SubmissionFileId> {
  const planned = new Set<SubmissionFileId>();
  for (const task of attempt.children ?? []) {
    for (const unit of task.children ?? []) {
      for (const fileId of unit.fileIds ?? []) planned.add(fileId);
    }
  }
  return planned;
}

/**
 * Inspect the submission's most recent post attempt to decide whether the user
 * needs to be prompted before posting again. Throws if the history cannot be
 * read: posting blind would re-send destinations that already went out.
 */
export async function inspectPreviousAttempt(
  submissionId: string,
  fileIds: SubmissionFileId[],
): Promise<PreviousAttemptProbe> {
  const { body } = await postApi.getJobHistory(submissionId);
  const [newest] = body ?? [];
  if (!newest || !RESUMABLE_STATUSES.includes(newest.status)) {
    return { resumable: false, hasNewFiles: false };
  }

  const planned = plannedFileIds(newest);
  return {
    resumable: true,
    hasNewFiles: fileIds.some((fileId) => !planned.has(fileId)),
  };
}
