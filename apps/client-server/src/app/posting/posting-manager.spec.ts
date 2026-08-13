import { PostId } from '@postybirb/types';
import { FileConverterService } from '../file-converter/file-converter.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { PostFileResizerService } from '../post/services/post-file-resizer/post-file-resizer.service';
import { ValidationService } from '../validation/validation.service';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingActivityService } from './posting-activity.service';
import { PostingManager } from './posting-manager';
import { PostingRateLimiterService } from './posting-rate-limiter.service';
import { PostingWorker } from './posting-worker';

const stubRegistry = {} as unknown as WebsiteRegistryService;
const stubValidationService = {} as ValidationService;
const stubPostParsersService = {} as PostParsersService;
const stubPostFileResizerService = {} as PostFileResizerService;
const stubFileConverterService = {} as FileConverterService;
const stubNotificationService = {} as NotificationsService;
const stubPostingRateLimiter = {} as PostingRateLimiterService;

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
    manager = new TestPostingManager(
      stubRegistry,
      stubValidationService,
      stubPostParsersService,
      stubPostFileResizerService,
      stubFileConverterService,
      stubNotificationService,
      stubPostingRateLimiter,
      new PostingActivityService(),
    );
  });

  it('accepts a new job', async () => {
    expect(manager.isAccepted('post-1')).toBe(false);
    await expect(manager.submit('post-1')).resolves.toBe(true);
    expect(manager.isAccepted('post-1')).toBe(true);

    await manager.workerHarnesses.get('post-1')?.dispose();

    expect(manager.isAccepted('post-1')).toBe(false);
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
