import { NodeStatus } from '@postybirb/types';
import postApi from '../../../../api/post.api';
import { hasResumableAttempt } from './has-resumable-attempt';

jest.mock('../../../../api/post.api', () => ({
  __esModule: true,
  default: { getJobHistory: jest.fn() },
}));

const getJobHistory = postApi.getJobHistory as jest.Mock;

describe('hasResumableAttempt', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([NodeStatus.FAILED, NodeStatus.CANCELLED])(
    'recognizes %s as resumable',
    async (status) => {
      getJobHistory.mockResolvedValue({ body: [{ status }] });

      await expect(hasResumableAttempt('submission')).resolves.toBe(true);
    },
  );

  it.each([NodeStatus.SUCCEEDED, NodeStatus.RUNNING])(
    'does not treat %s as resumable',
    async (status) => {
      getJobHistory.mockResolvedValue({ body: [{ status }] });

      await expect(hasResumableAttempt('submission')).resolves.toBe(false);
    },
  );

  it('does not prompt when there is no history', async () => {
    getJobHistory.mockResolvedValue({ body: [] });

    await expect(hasResumableAttempt('submission')).resolves.toBe(false);
  });

  it('fails closed when history cannot be loaded', async () => {
    getJobHistory.mockRejectedValue(new Error('history unavailable'));

    await expect(hasResumableAttempt('submission')).rejects.toThrow(
      'history unavailable',
    );
  });
});