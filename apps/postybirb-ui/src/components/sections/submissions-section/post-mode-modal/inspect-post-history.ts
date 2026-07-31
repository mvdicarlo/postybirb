import { JobTreeNode, NodeStatus, SubmissionFileId } from '@postybirb/types';
import postApi from '../../../../api/post.api';

export interface PostHistoryProbe {
  hasHistory: boolean;
  newestStatus?: NodeStatus;
  hasNewFiles: boolean;
}

function plannedFileIds(attempt: JobTreeNode): Set<SubmissionFileId> {
  const planned = new Set<SubmissionFileId>();
  for (const task of attempt.children ?? []) {
    for (const unit of task.children ?? []) {
      for (const fileId of unit.fileIds ?? []) planned.add(fileId);
    }
  }
  return planned;
}

export async function inspectPostHistory(
  submissionId: string,
  fileIds: SubmissionFileId[],
): Promise<PostHistoryProbe> {
  const { body } = await postApi.getJobHistory(submissionId);
  const [newest] = body ?? [];
  if (!newest) {
    return { hasHistory: false, hasNewFiles: false };
  }

  const planned = plannedFileIds(newest);
  return {
    hasHistory: true,
    newestStatus: newest.status,
    hasNewFiles: fileIds.some((fileId) => !planned.has(fileId)),
  };
}
