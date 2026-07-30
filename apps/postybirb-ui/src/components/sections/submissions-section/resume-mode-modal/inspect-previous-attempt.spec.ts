import { NodeStatus } from '@postybirb/types';
import postApi from '../../../../api/post.api';
import { inspectPreviousAttempt } from './inspect-previous-attempt';

jest.mock('../../../../api/post.api', () => ({
  __esModule: true,
  default: { getJobHistory: jest.fn() },
}));

const getJobHistory = postApi.getJobHistory as jest.Mock;

/** A one-website attempt whose single batch posted the given files. */
function attempt(status: NodeStatus, fileIds: string[]) {
  return { status, children: [{ children: [{ fileIds }] }] };
}

describe('inspectPreviousAttempt', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([NodeStatus.FAILED, NodeStatus.CANCELLED])(
    'recognizes %s as resumable',
    async (status) => {
      getJobHistory.mockResolvedValue({ body: [attempt(status, ['f1'])] });

      await expect(
        inspectPreviousAttempt('submission', ['f1']),
      ).resolves.toEqual({ resumable: true, hasNewFiles: false });
    },
  );

  it.each([NodeStatus.SUCCEEDED, NodeStatus.RUNNING])(
    'does not treat %s as resumable',
    async (status) => {
      getJobHistory.mockResolvedValue({ body: [attempt(status, ['f1'])] });

      await expect(
        inspectPreviousAttempt('submission', ['f1', 'f2']),
      ).resolves.toEqual({ resumable: false, hasNewFiles: false });
    },
  );

  it('does not prompt when there is no history', async () => {
    getJobHistory.mockResolvedValue({ body: [] });

    await expect(inspectPreviousAttempt('submission', ['f1'])).resolves.toEqual(
      { resumable: false, hasNewFiles: false },
    );
  });

  it('reports files the attempt never planned to post', async () => {
    getJobHistory.mockResolvedValue({
      body: [attempt(NodeStatus.FAILED, ['f1', 'f2'])],
    });

    await expect(
      inspectPreviousAttempt('submission', ['f1', 'f2', 'f3']),
    ).resolves.toEqual({ resumable: true, hasNewFiles: true });
  });

  it('ignores files that were removed since the attempt', async () => {
    getJobHistory.mockResolvedValue({
      body: [attempt(NodeStatus.FAILED, ['f1', 'f2'])],
    });

    await expect(
      inspectPreviousAttempt('submission', ['f2']),
    ).resolves.toEqual({ resumable: true, hasNewFiles: false });
  });

  it('fails closed when history cannot be loaded', async () => {
    getJobHistory.mockRejectedValue(new Error('history unavailable'));

    await expect(
      inspectPreviousAttempt('submission', ['f1']),
    ).rejects.toThrow('history unavailable');
  });
});