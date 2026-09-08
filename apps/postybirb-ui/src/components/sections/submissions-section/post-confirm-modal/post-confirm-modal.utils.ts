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
  targeted = false,
): PostingRequest[] {
  return orderedSubmissionIds.flatMap((submissionId) => {
    const selection = buildUnitOfWorkEvictions(
      completedUnitsBySubmission.get(submissionId) ?? [],
      selectedUnitIds,
    );
    if (targeted && Object.keys(selection).length === 0) return [];
    return [{
      submissionId,
      evictions: targeted ? {} : selection,
      ...(targeted ? { targets: selection } : {}),
    }];
  });
}