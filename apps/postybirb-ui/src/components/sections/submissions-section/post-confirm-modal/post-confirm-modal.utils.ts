import type {
    IUnitOfWork,
    SubmissionId,
    UnitOfWorkId,
} from '@postybirb/types';
import type { PostingRequest } from '../../../../api/posting.api';
import { buildUnitOfWorkEvictions } from '../post-preview-modal/post-preview-modal.utils';

export function buildBulkPostingRequests(
  orderedSubmissionIds: SubmissionId[],
  completedUnitsBySubmission: ReadonlyMap<SubmissionId, IUnitOfWork[]>,
  selectedUnitIds: ReadonlySet<UnitOfWorkId>,
): PostingRequest[] {
  return orderedSubmissionIds.map((submissionId) => ({
    submissionId,
    evictions: buildUnitOfWorkEvictions(
      completedUnitsBySubmission.get(submissionId) ?? [],
      selectedUnitIds,
    ),
  }));
}