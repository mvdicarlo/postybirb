import { PostId } from '@postybirb/types';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingManager } from './posting-manager';
import { PostingWorker } from './posting-worker';

const stubRegistry = {} as unknown as WebsiteRegistryService;

interface WorkerHarness {
  cancel: jest.Mock;
  dispose: () => Promise<void>;
  start: jest.Mock;
}

class TestPostingManager extends PostingManager {
  public readonly workerHarnesses = new Map<PostId, WorkerHarness>();

  protected override createWorker(
    postId: PostId,
    onAfterDispose: () => void | Promise<void>,
  ): PostingWorker {
    const harness: WorkerHarness = {
      cancel: jest.fn(),
      dispose: async () => onAfterDispose(),
      start: jest.fn().mockResolvedValue(undefined),
    };
    this.workerHarnesses.set(postId, harness);
    return harness as unknown as PostingWorker;
  }
}

describe('PostingManager', () => {
  let manager: TestPostingManager;

  beforeEach(() => {
    manager = new TestPostingManager(stubRegistry);
  });

  it('accepts a new job', async () => {
    await expect(manager.submit('post-1')).resolves.toBe(true);
  });

  it('rejects a job that has already been accepted', async () => {
    await manager.submit('post-1');

    await expect(manager.submit('post-1')).resolves.toBe(false);
  });

  it('rejects work after reaching capacity', async () => {
    await expect(manager.submit('post-1')).resolves.toBe(true);
    await expect(manager.submit('post-2')).resolves.toBe(true);
    await expect(manager.submit('post-3')).resolves.toBe(true);

    await expect(manager.submit('post-4')).resolves.toBe(false);
  });

  it('serializes concurrent submissions for the same job', async () => {
    const results = await Promise.all([
      manager.submit('post-1'),
      manager.submit('post-1'),
      manager.submit('post-1'),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('retains capacity until a cancelled worker disposes', async () => {
    await manager.submit('post-1');
    await manager.submit('post-2');
    await manager.submit('post-3');

    await expect(manager.cancel('post-1', 'User cancelled')).resolves.toBe(
      true,
    );
    expect(manager.workerHarnesses.get('post-1')?.cancel).toHaveBeenCalledWith(
      'User cancelled',
    );
    await expect(manager.submit('post-4')).resolves.toBe(false);

    await manager.workerHarnesses.get('post-1')?.dispose();

    await expect(manager.submit('post-4')).resolves.toBe(true);
  });

  it('releases completed workers and rejects unknown cancellations', async () => {
    await expect(manager.cancel('post-1', 'Not active')).resolves.toBe(false);
    await manager.submit('post-1');

    await manager.workerHarnesses.get('post-1')?.dispose();

    await expect(manager.submit('post-1')).resolves.toBe(true);
  });
});
