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

  it('reports the paused state', async () => {
    const arePostsPaused = jest.fn().mockResolvedValue(true);
    const controller = new PostingController({
      arePostsPaused,
    } as unknown as PostingService);

    await expect(controller.isPaused()).resolves.toEqual({ paused: true });
  });

  it('pauses posting before reporting the resulting state', async () => {
    let paused = false;
    const arePostsPaused = jest.fn().mockImplementation(async () => paused);
    const pausePosts = jest.fn().mockImplementation(async () => {
      await Promise.resolve();
      paused = true;
    });
    const controller = new PostingController({
      arePostsPaused,
      pausePosts,
    } as unknown as PostingService);

    await expect(controller.pause()).resolves.toEqual({ paused: true });
    expect(pausePosts).toHaveBeenCalledTimes(1);
  });

  it('does not report a successful pause when saving it fails', async () => {
    const arePostsPaused = jest.fn().mockResolvedValue(false);
    const pausePosts = jest.fn().mockRejectedValue(new Error('Unable to save settings'));
    const controller = new PostingController({
      arePostsPaused,
      pausePosts,
    } as unknown as PostingService);

    await expect(controller.pause()).rejects.toThrow('Unable to save settings');
    expect(arePostsPaused).not.toHaveBeenCalled();
  });

  it('unpauses posting before reporting the resulting state', async () => {
    let paused = true;
    const arePostsPaused = jest.fn().mockImplementation(async () => paused);
    const unpausePosts = jest.fn().mockImplementation(async () => {
      await Promise.resolve();
      paused = false;
    });
    const controller = new PostingController({
      arePostsPaused,
      unpausePosts,
    } as unknown as PostingService);

    await expect(controller.unpause()).resolves.toEqual({ paused: false });
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