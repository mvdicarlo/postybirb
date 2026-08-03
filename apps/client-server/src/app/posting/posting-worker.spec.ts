import { PostParsersService } from '../post-parsers/post-parsers.service';
import { ValidationService } from '../validation/validation.service';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingWorker } from './posting-worker';

interface WorkerMocks {
  accountRepository: {
    findByIdOrThrow: jest.Mock;
  };
  onAfterDispose: jest.Mock;
  postParsersService: PostParsersService;
  postRepository: {
    findByIdOrThrow: jest.Mock;
    update: jest.Mock;
  };
  submissionRepository: {
    findByIdOrThrow: jest.Mock;
  };
  unitOfWorkRepository: {
    find: jest.Mock;
    update: jest.Mock;
  };
  validationService: ValidationService;
  websiteRegistry: {
    findInstance: jest.Mock;
  };
  websiteOptionsRepository: {
    find: jest.Mock;
  };
}

function createWorker(): { worker: PostingWorker; mocks: WorkerMocks } {
  const mocks: WorkerMocks = {
    accountRepository: {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'account-1' }),
    },
    onAfterDispose: jest.fn().mockResolvedValue(undefined),
    postParsersService: {} as PostParsersService,
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
      find: jest.fn().mockResolvedValue([
        { id: 'work-1', accountId: 'account-1' },
      ]),
      update: jest.fn().mockResolvedValue(undefined),
    },
    validationService: {} as ValidationService,
    websiteRegistry: {
      findInstance: jest.fn().mockReturnValue({}),
    },
    websiteOptionsRepository: {
      find: jest.fn().mockResolvedValue([{ id: 'options-1' }]),
    },
  };
  const worker = new PostingWorker(
    'post-1',
    mocks.websiteRegistry as unknown as WebsiteRegistryService,
    mocks.validationService,
    mocks.postParsersService,
    mocks.onAfterDispose,
  );
  Object.assign(worker, {
    accountRepository: mocks.accountRepository,
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

  it('leaves a post that is already cancelled unchanged', async () => {
    const { worker, mocks } = createWorker();
    mocks.postRepository.findByIdOrThrow.mockResolvedValue({
      id: 'post-1',
      submissionId: 'submission-1',
      completed: false,
      cancelled: true,
    });

    await worker.start();

    expect(mocks.submissionRepository.findByIdOrThrow).not.toHaveBeenCalled();
    expect(mocks.unitOfWorkRepository.find).not.toHaveBeenCalled();
    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalled();
    expect(mocks.postRepository.update).not.toHaveBeenCalled();
    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });

  it('honors cancellation requested before start', async () => {
    const { worker, mocks } = createWorker();

    expect(worker.cancel('User requested cancellation')).toBe(true);
    expect(worker.cancel('Duplicate cancellation')).toBe(false);
    await worker.start();

    expect(mocks.postRepository.findByIdOrThrow).not.toHaveBeenCalled();
    expect(mocks.postRepository.update).toHaveBeenCalledWith('post-1', {
      completed: true,
      cancelled: true,
    });
    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });

  it('loads only non-evicted, non-succeeded work for the post', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([]);

    await worker.start();

    const where = mocks.unitOfWorkRepository.find.mock.calls[0][0].where;
    const columns = {
      postId: 'postId',
      evicted: 'evicted',
      state: 'state',
    };
    const operators = {
      and: jest.fn((...conditions: unknown[]) => conditions),
      eq: jest.fn((column: string, value: unknown) => ({
        column,
        operator: 'eq',
        value,
      })),
      ne: jest.fn((column: string, value: unknown) => ({
        column,
        operator: 'ne',
        value,
      })),
    };

    expect(where(columns, operators)).toEqual([
      { column: 'postId', operator: 'eq', value: 'post-1' },
      { column: 'evicted', operator: 'eq', value: false },
      { column: 'state', operator: 'ne', value: 'SUCCEEDED' },
    ]);
  });

  it('posts external-source accounts last without dropping missing instances', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      { id: 'external-work', accountId: 'external-account' },
      { id: 'missing-work', accountId: 'missing-account' },
      { id: 'standard-work', accountId: 'standard-account' },
    ]);
    mocks.accountRepository.findByIdOrThrow.mockImplementation(
      (accountId: string) => Promise.resolve({ id: accountId }),
    );
    mocks.websiteRegistry.findInstance.mockImplementation(
      (account: { id: string }) => {
        if (account.id === 'missing-account') {
          return undefined;
        }
        return {
          decoratedProps: {
            fileOptions: {
              acceptsExternalSourceUrls: account.id === 'external-account',
            },
          },
        };
      },
    );

    await worker.start();

    const executingOrder = mocks.unitOfWorkRepository.update.mock.calls
      .filter(([, update]) => update.state === 'EXECUTING')
      .map(([unitId]) => unitId);
    expect(executingOrder).toEqual([
      'missing-work',
      'standard-work',
      'external-work',
    ]);
  });

  it('limits concurrent accounts without mixing external-source accounts', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      { id: 'external-work-1', accountId: 'external-account-1' },
      { id: 'standard-work-1', accountId: 'standard-account-1' },
      { id: 'standard-work-2', accountId: 'standard-account-2' },
      { id: 'standard-work-3', accountId: 'standard-account-3' },
      { id: 'standard-work-4', accountId: 'standard-account-4' },
      { id: 'external-work-2', accountId: 'external-account-2' },
    ]);
    mocks.accountRepository.findByIdOrThrow.mockImplementation(
      (accountId: string) => Promise.resolve({ id: accountId }),
    );
    mocks.websiteRegistry.findInstance.mockImplementation(
      (account: { id: string }) => ({
        decoratedProps: {
          fileOptions: {
            acceptsExternalSourceUrls: account.id.startsWith('external-'),
          },
        },
      }),
    );

    const started: string[] = [];
    const releases = new Map<string, () => void>();
    let resolveFirstBatchStarted!: () => void;
    let resolveSecondBatchStarted!: () => void;
    let resolveExternalBatchStarted!: () => void;
    const firstBatchStarted = new Promise<void>((resolve) => {
      resolveFirstBatchStarted = resolve;
    });
    const secondBatchStarted = new Promise<void>((resolve) => {
      resolveSecondBatchStarted = resolve;
    });
    const externalBatchStarted = new Promise<void>((resolve) => {
      resolveExternalBatchStarted = resolve;
    });
    const post = jest.fn((accountId: string) => {
      started.push(accountId);
      if (started.length === 3) resolveFirstBatchStarted();
      if (started.length === 4) resolveSecondBatchStarted();
      if (started.length === 6) resolveExternalBatchStarted();
      return new Promise<void>((resolve) => {
        releases.set(accountId, resolve);
      });
    });
    Object.assign(worker, { post });

    const execution = worker.start();
    await firstBatchStarted;
    expect(started).toEqual([
      'standard-account-1',
      'standard-account-2',
      'standard-account-3',
    ]);

    started.slice(0, 3).forEach((accountId) => releases.get(accountId)?.());
    await secondBatchStarted;
    expect(started).toEqual([
      'standard-account-1',
      'standard-account-2',
      'standard-account-3',
      'standard-account-4',
    ]);

    releases.get('standard-account-4')?.();
    await externalBatchStarted;
    expect(started.slice(4)).toEqual([
      'external-account-1',
      'external-account-2',
    ]);

    releases.get('external-account-1')?.();
    releases.get('external-account-2')?.();
    await execution;
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
