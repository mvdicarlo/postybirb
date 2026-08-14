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
      remainingWork: [],
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

  it('forwards dry-run request data to the service', async () => {
    const result = {
      remainingWork: [],
      removedWork: [],
      evicted: [],
      executableWork: [],
      deferredWork: [],
      paused: false,
      dependenciesCompleted: true,
    };
    const dryRun = jest.fn().mockResolvedValue(result);
    const controller = new PostingController({
      dryRun,
    } as unknown as PostingService);
    const request = {
      submissionId: 'submission-1',
      evictions: { 'account-1': ['file-1'] },
    };

    await expect(controller.dryRun(request)).resolves.toBe(result);
    expect(dryRun).toHaveBeenCalledWith(
      request.submissionId,
      request.evictions,
    );
  });

  it('reports the paused state', () => {
    const arePostsPaused = jest.fn().mockReturnValue(true);
    const controller = new PostingController({
      arePostsPaused,
    } as unknown as PostingService);

    expect(controller.isPaused()).toEqual({ paused: true });
  });

  it('unpauses posting and reports the resulting state', () => {
    const arePostsPaused = jest.fn().mockReturnValue(false);
    const unpausePosts = jest.fn();
    const controller = new PostingController({
      arePostsPaused,
      unpausePosts,
    } as unknown as PostingService);

    expect(controller.unpause()).toEqual({ paused: false });
    expect(unpausePosts).toHaveBeenCalledTimes(1);
  });

  it('forwards a unit-of-work eviction to the service', async () => {
    const result = { id: 'unit-1', evicted: true };
    const evictUnitOfWork = jest.fn().mockResolvedValue(result);
    const controller = new PostingController({
      evictUnitOfWork,
    } as unknown as PostingService);

    await expect(controller.evictUnitOfWork('unit-1')).resolves.toBe(result);
    expect(evictUnitOfWork).toHaveBeenCalledWith('unit-1');
  });
});