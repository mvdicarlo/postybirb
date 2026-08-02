import { PostingController } from './posting.controller';
import type { PostingService } from './posting.service';

describe('PostingController', () => {
  it('forwards a post request to the service', async () => {
    const result = { id: 'post-1' };
    const post = jest.fn().mockResolvedValue(result);
    const controller = new PostingController({
      post,
    } as unknown as PostingService);
    const request = {
      submissionId: 'submission-1',
      evictions: {
        'account-1': ['file-1'],
      },
    };

    await expect(controller.post(request)).resolves.toBe(result);
    expect(post).toHaveBeenCalledWith(request.submissionId, request.evictions);
  });

  it('forwards incomplete-work request data to the service', async () => {
    const result = {
      missingWork: [],
      removedWork: [],
      evicted: [],
    };
    const getIncompleteWork = jest.fn().mockResolvedValue(result);
    const controller = new PostingController({
      getIncompleteWork,
    } as unknown as PostingService);
    const request = {
      submissionId: 'submission-1',
      evictions: {
        'account-1': ['file-1'],
        'account-2': [],
      },
    };

    await expect(controller.getIncompleteWork(request)).resolves.toBe(result);
    expect(getIncompleteWork).toHaveBeenCalledWith(
      request.submissionId,
      request.evictions,
    );
  });
});