import { NodeStatus, PostRecordResumeMode } from '@postybirb/types';
import { availablePostModes } from './available-post-modes';

describe('availablePostModes', () => {
  it.each([NodeStatus.FAILED, NodeStatus.CANCELLED])(
    'offers every mode after %s',
    (status) => {
      expect(availablePostModes(status)).toEqual([
        PostRecordResumeMode.CONTINUE,
        PostRecordResumeMode.CONTINUE_RETRY,
        PostRecordResumeMode.NEW,
      ]);
    },
  );

  it('offers incremental or fresh posting after success', () => {
    expect(availablePostModes(NodeStatus.SUCCEEDED)).toEqual([
      PostRecordResumeMode.CONTINUE,
      PostRecordResumeMode.NEW,
    ]);
  });

  it.each([
    undefined,
    NodeStatus.QUEUED,
    NodeStatus.READY,
    NodeStatus.RUNNING,
    NodeStatus.WAITING,
    NodeStatus.SKIPPED,
  ])('offers no modes for %s', (status) => {
    expect(availablePostModes(status)).toEqual([]);
  });
});
