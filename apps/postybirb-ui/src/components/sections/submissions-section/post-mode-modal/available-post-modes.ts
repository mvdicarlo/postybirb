import { NodeStatus, PostRecordResumeMode } from '@postybirb/types';

export function availablePostModes(
  newestStatus?: NodeStatus,
): PostRecordResumeMode[] {
  if (
    newestStatus === NodeStatus.FAILED ||
    newestStatus === NodeStatus.CANCELLED
  ) {
    return [
      PostRecordResumeMode.CONTINUE,
      PostRecordResumeMode.CONTINUE_RETRY,
      PostRecordResumeMode.NEW,
    ];
  }
  if (newestStatus === NodeStatus.SUCCEEDED) {
    return [PostRecordResumeMode.CONTINUE, PostRecordResumeMode.NEW];
  }
  return [];
}
