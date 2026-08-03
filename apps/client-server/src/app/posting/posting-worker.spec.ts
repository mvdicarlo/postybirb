import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingWorker } from './posting-worker';

const stubRegistry = {} as unknown as WebsiteRegistryService;

interface WorkerMocks {
  onAfterDispose: jest.Mock;
  postRepository: {
    findByIdOrThrow: jest.Mock;
    update: jest.Mock;
  };
  submissionRepository: {
    findByIdOrThrow: jest.Mock;
  };
  unitOfWorkRepository: {
    find: jest.Mock;
  };
  websiteOptionsRepository: {
    find: jest.Mock;
  };
}

function createWorker(): { worker: PostingWorker; mocks: WorkerMocks } {
  const mocks: WorkerMocks = {
    onAfterDispose: jest.fn().mockResolvedValue(undefined),
    postRepository: {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'post-1',
        submissionId: 'submission-1',
        completed: false,
        cancelled: false,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    },
    submissionRepository: {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'submission-1' }),
    },
    unitOfWorkRepository: {
      find: jest.fn().mockResolvedValue([{ id: 'work-1' }]),
    },
    websiteOptionsRepository: {
      find: jest.fn().mockResolvedValue([{ id: 'options-1' }]),
    },
  };
  const worker = new PostingWorker('post-1', stubRegistry, mocks.onAfterDispose);
  Object.assign(worker, {
    postRepository: mocks.postRepository,
    submissionRepository: mocks.submissionRepository,
    unitOfWorkRepository: mocks.unitOfWorkRepository,
    websiteOptionsRepository: mocks.websiteOptionsRepository,
  });
  return { worker, mocks };
}

describe('PostingWorker', () => {
  it('disposes after its work settles', async () => {
    const { worker, mocks } = createWorker();

    await worker.start();

    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });

  it('does not process a post that is already cancelled', async () => {
    const { worker, mocks } = createWorker();
    mocks.postRepository.findByIdOrThrow.mockResolvedValue({
      id: 'post-1',
      submissionId: 'submission-1',
      completed: true,
      cancelled: true,
    });

    await worker.start();

    expect(mocks.submissionRepository.findByIdOrThrow).not.toHaveBeenCalled();
    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });

  it('stops after an in-flight load is cancelled', async () => {
    const { worker, mocks } = createWorker();
    let resolvePost!: (post: object) => void;
    mocks.postRepository.findByIdOrThrow.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );
    const start = worker.start();

    expect(worker.cancel('User requested cancellation')).toBe(true);
    expect(worker.cancel('Duplicate cancellation')).toBe(false);
    resolvePost({
      id: 'post-1',
      submissionId: 'submission-1',
      completed: false,
      cancelled: false,
    });
    await start;

    expect(mocks.submissionRepository.findByIdOrThrow).not.toHaveBeenCalled();
    expect(mocks.postRepository.update).toHaveBeenCalledWith('post-1', {
      completed: true,
      cancelled: true,
    });
    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });

  it('completes a post that has no work', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([]);

    await worker.start();

    expect(mocks.postRepository.update).toHaveBeenCalledWith('post-1', {
      completed: true,
      cancelled: false,
    });
    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });
});
