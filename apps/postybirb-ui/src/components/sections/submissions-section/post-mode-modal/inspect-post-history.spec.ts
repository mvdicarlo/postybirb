import { NodeStatus } from '@postybirb/types';
import postApi from '../../../../api/post.api';
import { inspectPostHistory } from './inspect-post-history';

jest.mock('../../../../api/post.api', () => ({
  __esModule: true,
  default: { getJobHistory: jest.fn() },
}));

const getJobHistory = postApi.getJobHistory as jest.Mock;

function attempt(status: NodeStatus, fileIds: string[]) {
  return { status, children: [{ children: [{ fileIds }] }] };
}

describe('inspectPostHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    NodeStatus.SUCCEEDED,
    NodeStatus.FAILED,
    NodeStatus.CANCELLED,
    NodeStatus.RUNNING,
  ])('returns the newest %s history status', async (status) => {
    getJobHistory.mockResolvedValue({ body: [attempt(status, ['f1'])] });

    await expect(inspectPostHistory('submission', ['f1'])).resolves.toEqual({
      hasHistory: true,
      newestStatus: status,
      hasNewFiles: false,
    });
  });

  it('reports no history', async () => {
    getJobHistory.mockResolvedValue({ body: [] });
    await expect(inspectPostHistory('submission', ['f1'])).resolves.toEqual({
      hasHistory: false,
      hasNewFiles: false,
    });
  });

  it('reports files absent from the newest attempt', async () => {
    getJobHistory.mockResolvedValue({
      body: [attempt(NodeStatus.FAILED, ['f1', 'f2'])],
    });
    await expect(
      inspectPostHistory('submission', ['f1', 'f2', 'f3']),
    ).resolves.toEqual({
      hasHistory: true,
      newestStatus: NodeStatus.FAILED,
      hasNewFiles: true,
    });
  });

  it('fails closed when history cannot be loaded', async () => {
    getJobHistory.mockRejectedValue(new Error('history unavailable'));
    await expect(inspectPostHistory('submission', ['f1'])).rejects.toThrow(
      'history unavailable',
    );
  });
});
