import { FileConverterService } from '../file-converter/file-converter.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { PostFileResizerService } from '../post/services/post-file-resizer/post-file-resizer.service';
import { ValidationService } from '../validation/validation.service';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CancellationToken } from './cancellation-token';
import { PostingRateLimiterService } from './posting-rate-limiter.service';
import { PostingWorker } from './posting-worker';

interface WorkerMocks {
  accountRepository: {
    findByIdOrThrow: jest.Mock;
  };
  fileRepository: {
    findByIdOrThrow: jest.Mock;
  };
  fileConverterService: {
    canConvert: jest.Mock;
    convert: jest.Mock;
  };
  notificationService: {
    create: jest.Mock;
  };
  onAfterDispose: jest.Mock;
  postFileResizerService: {
    resize: jest.Mock;
  };
  postParsersService: {
    parse: jest.Mock;
  };
  postRepository: {
    cancel: jest.Mock;
    completeIfAllActiveUnitsSettled: jest.Mock;
    findByIdOrThrow: jest.Mock;
    update: jest.Mock;
  };
  postingRateLimiter: {
    acquire: jest.Mock;
  };
  submissionRepository: {
    findByIdOrThrow: jest.Mock;
  };
  unitOfWorkRepository: {
    find: jest.Mock;
    update: jest.Mock;
  };
  validationService: {
    validate: jest.Mock;
  };
  websiteRegistry: {
    findInstance: jest.Mock;
  };
  websiteOptionsRepository: {
    find: jest.Mock;
  };
  websitePost: jest.Mock;
}

function createWorker(): { worker: PostingWorker; mocks: WorkerMocks } {
  const websitePost = jest.fn().mockResolvedValue({
    instanceId: 'website-1',
  });
  const mocks: WorkerMocks = {
    accountRepository: {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'account-1' }),
    },
    fileRepository: {
      findByIdOrThrow: jest.fn(),
    },
    fileConverterService: {
      canConvert: jest.fn().mockResolvedValue(false),
      convert: jest.fn(),
    },
    notificationService: {
      create: jest.fn().mockResolvedValue({}),
    },
    onAfterDispose: jest.fn().mockResolvedValue(undefined),
    postFileResizerService: {
      resize: jest.fn().mockResolvedValue({}),
    },
    postParsersService: {
      parse: jest.fn().mockResolvedValue({ options: {} }),
    },
    postRepository: {
      cancel: jest.fn().mockResolvedValue(undefined),
      completeIfAllActiveUnitsSettled: jest.fn().mockResolvedValue(false),
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'post-1',
        submissionId: 'submission-1',
        completed: false,
        cancelled: false,
      }),
      update: jest.fn().mockResolvedValue(undefined),
    },
    postingRateLimiter: {
      acquire: jest.fn().mockResolvedValue({ acquired: true }),
    },
    submissionRepository: {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: 'submission-1',
        type: 'FILE',
      }),
    },
    unitOfWorkRepository: {
      find: jest
        .fn()
        .mockResolvedValue([{ id: 'work-1', accountId: 'account-1' }]),
      update: jest.fn().mockResolvedValue(undefined),
    },
    validationService: {
      validate: jest.fn().mockResolvedValue({ errors: [], warnings: [] }),
    },
    websiteRegistry: {
      findInstance: jest.fn().mockReturnValue({
        accountId: 'account-1',
        decoratedProps: {
          metadata: {
            displayName: 'Test Website',
            name: 'test-website',
          },
        },
        login: jest.fn().mockResolvedValue({
          isLoggedIn: true,
          status: 'loggedIn',
        }),
        post: websitePost,
      }),
    },
    websiteOptionsRepository: {
      find: jest
        .fn()
        .mockResolvedValue([{ id: 'options-1', accountId: 'account-1' }]),
    },
    websitePost,
  };
  const worker = new PostingWorker(
    'post-1',
    mocks.websiteRegistry as unknown as WebsiteRegistryService,
    mocks.validationService as unknown as ValidationService,
    mocks.postParsersService as unknown as PostParsersService,
    mocks.postFileResizerService as unknown as PostFileResizerService,
    mocks.fileConverterService as unknown as FileConverterService,
    mocks.notificationService as unknown as NotificationsService,
    mocks.postingRateLimiter as unknown as PostingRateLimiterService,
    mocks.onAfterDispose,
  );
  Object.assign(worker, {
    accountRepository: mocks.accountRepository,
    fileRepository: mocks.fileRepository,
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

  it('posts a prepared batch and stores the successful response', async () => {
    const { worker, mocks } = createWorker();
    const postData = { options: { title: 'Prepared title' } };
    mocks.postParsersService.parse.mockResolvedValue(postData);
    mocks.websitePost.mockResolvedValue({
      instanceId: 'website-1',
      message: 'Posted',
      sourceUrl: 'https://example.com/post/1',
    });

    await worker.start();

    expect(mocks.websitePost).toHaveBeenCalledWith(
      postData,
      [],
      { index: 0, totalBatches: 1 },
      expect.any(CancellationToken),
    );
    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith('work-1', {
      state: 'SUCCEEDED',
      response: {
        instanceId: 'website-1',
        message: 'Posted',
        sourceUrl: 'https://example.com/post/1',
      },
      url: 'https://example.com/post/1',
    });
    expect(mocks.notificationService.create).not.toHaveBeenCalled();
    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalledWith(
      'work-1',
      { state: 'PENDING' },
    );
  });

  it('leaves a deferred-only post untouched and releases the worker', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      {
        id: 'work-1',
        accountId: 'account-1',
        batch: 'batch-1',
        state: 'RATE_LIMITED',
        rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
      },
    ]);

    await worker.start();

    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalled();
    expect(mocks.postingRateLimiter.acquire).not.toHaveBeenCalled();
    expect(mocks.websitePost).not.toHaveBeenCalled();
    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });

  it('marks a denied batch as rate limited without preparing or notifying', async () => {
    const { worker, mocks } = createWorker();
    const rateLimitedUntil = new Date(Date.now() + 60_000).toISOString();
    mocks.postingRateLimiter.acquire.mockResolvedValue({
      acquired: false,
      rateLimitedUntil,
    });

    await worker.start();

    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith('work-1', {
      state: 'RATE_LIMITED',
      rateLimitedUntil,
    });
    expect(mocks.fileRepository.findByIdOrThrow).not.toHaveBeenCalled();
    expect(mocks.websitePost).not.toHaveBeenCalled();
    expect(mocks.notificationService.create).not.toHaveBeenCalled();
  });

  it('executes only ready batches in a mixed post', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      {
        id: 'deferred-work',
        accountId: 'account-1',
        batch: 'batch-1',
        state: 'RATE_LIMITED',
        rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
      },
      {
        id: 'ready-work',
        accountId: 'account-1',
        batch: 'batch-2',
        state: 'NEW',
      },
    ]);

    await worker.start();

    expect(mocks.postingRateLimiter.acquire).toHaveBeenCalledTimes(1);
    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalledWith(
      'deferred-work',
      expect.anything(),
    );
    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith(
      'ready-work',
      expect.objectContaining({ state: 'SUCCEEDED' }),
    );
  });

  it('persists and retains an acquired reservation after success', async () => {
    const { worker, mocks } = createWorker();
    const rateLimitedUntil = new Date(Date.now() + 60_000).toISOString();
    mocks.postingRateLimiter.acquire.mockResolvedValue({
      acquired: true,
      rateLimitedUntil,
    });

    await worker.start();

    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith('work-1', {
      state: 'EXECUTING',
      rateLimitedUntil,
    });
    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith(
      'work-1',
      expect.objectContaining({ state: 'SUCCEEDED' }),
    );
    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalledWith(
      'work-1',
      expect.objectContaining({ rateLimitedUntil: null }),
    );
  });

  it('preserves original batch metadata when resuming after a succeeded batch', async () => {
    const { worker, mocks } = createWorker();
    mocks.submissionRepository.findByIdOrThrow.mockResolvedValue({
      id: 'submission-1',
      type: 'FILE',
      files: [
        { id: 'file-1', order: 0 },
        { id: 'file-2', order: 1 },
      ],
    });
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      {
        id: 'succeeded-work',
        accountId: 'account-1',
        fileId: 'file-1',
        batch: 'batch-1',
        state: 'SUCCEEDED',
      },
      {
        id: 'ready-work',
        accountId: 'account-1',
        fileId: 'file-2',
        batch: 'batch-2',
        state: 'NEW',
      },
    ]);
    mocks.fileRepository.findByIdOrThrow.mockResolvedValue({
      id: 'file-2',
      fileName: 'notes.txt',
      mimeType: 'text/plain',
      file: {
        id: 'buffer-2',
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('notes'),
      },
      metadata: {},
    });

    await worker.start();

    expect(mocks.websitePost).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { index: 1, totalBatches: 2 },
      expect.any(CancellationToken),
    );
    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalledWith(
      'succeeded-work',
      expect.anything(),
    );
  });

  it('merges user and non-evicted cross-account source URLs without mutating stored metadata', async () => {
    const { worker, mocks } = createWorker();
    const currentWork = {
      id: 'work-1',
      postId: 'post-1',
      accountId: 'account-1',
      fileId: 'file-1',
      batch: 'batch-1',
      evicted: false,
    };
    mocks.unitOfWorkRepository.find
      .mockResolvedValueOnce([currentWork])
      .mockResolvedValueOnce([
        {
          postId: 'post-1',
          accountId: 'source-account',
          evicted: false,
          url: 'https://example.com/source',
        },
        {
          postId: 'post-1',
          accountId: 'source-account-2',
          evicted: false,
          url: ' https://example.com/source ',
        },
        {
          postId: 'post-1',
          accountId: 'account-1',
          evicted: false,
          url: 'https://example.com/self',
        },
        {
          postId: 'post-1',
          accountId: 'evicted-account',
          evicted: true,
          url: 'https://example.com/evicted',
        },
        {
          postId: 'another-post',
          accountId: 'other-account',
          evicted: false,
          url: 'https://example.com/unrelated',
        },
        {
          postId: 'post-1',
          accountId: 'blank-account',
          evicted: false,
          url: '   ',
        },
      ])
      .mockResolvedValueOnce([]);
    const storedMetadata = {
      dimensions: {},
      ignoredWebsites: [],
      sourceUrls: ['https://example.com/user', 'https://example.com/source'],
    };
    mocks.fileRepository.findByIdOrThrow.mockResolvedValue({
      id: 'file-1',
      fileName: 'notes.txt',
      mimeType: 'text/plain',
      file: {
        id: 'buffer-1',
        submissionFileId: 'file-1',
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('notes'),
        size: 5,
        width: 0,
        height: 0,
      },
      metadata: storedMetadata,
    });
    mocks.websiteRegistry.findInstance.mockReturnValue({
      accountId: 'account-1',
      decoratedProps: {
        fileOptions: {
          acceptsExternalSourceUrls: true,
          acceptedMimeTypes: ['text/plain'],
        },
      },
      login: jest.fn().mockResolvedValue({
        isLoggedIn: true,
        status: 'loggedIn',
      }),
      post: mocks.websitePost,
    });

    await worker.start();

    const postedFiles = mocks.websitePost.mock.calls[0][1];
    expect(postedFiles[0].metadata.sourceUrls).toEqual([
      'https://example.com/user',
      'https://example.com/source',
    ]);
    expect(storedMetadata.sourceUrls).toEqual([
      'https://example.com/user',
      'https://example.com/source',
    ]);

    const sourceWhere = mocks.unitOfWorkRepository.find.mock.calls[1][0].where;
    const columns = {
      postId: 'postId',
      evicted: 'evicted',
      accountId: 'accountId',
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
    expect(sourceWhere(columns, operators)).toEqual([
      { column: 'postId', operator: 'eq', value: 'post-1' },
      { column: 'evicted', operator: 'eq', value: false },
      { column: 'accountId', operator: 'ne', value: 'account-1' },
    ]);
  });

  it('stores a failed response returned by the website', async () => {
    const { worker, mocks } = createWorker();
    const exception = new Error('Website rejected the post');
    const rateLimitedUntil = new Date(Date.now() + 60_000).toISOString();
    mocks.postingRateLimiter.acquire.mockResolvedValue({
      acquired: true,
      rateLimitedUntil,
    });
    mocks.websitePost.mockResolvedValue({
      instanceId: 'website-1',
      message: exception.message,
      stage: 'submission',
      exception,
    });

    await worker.start();

    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith('work-1', {
      state: 'FAILED',
      response: {
        instanceId: 'website-1',
        message: exception.message,
        stage: 'submission',
        exception: {
          name: 'Error',
          message: exception.message,
          stack: exception.stack,
        },
      },
    });
    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith('work-1', {
      state: 'EXECUTING',
      rateLimitedUntil,
    });
    expect(mocks.notificationService.create).toHaveBeenCalledWith({
      type: 'error',
      title: 'Failed to post to Test Website',
      message: exception.message,
      tags: ['post-failure', 'test-website'],
      data: {
        submissionId: 'submission-1',
        submissionType: 'FILE',
      },
    });
  });

  it('creates only one failure notification when multiple batches fail for an account', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      {
        id: 'work-1',
        accountId: 'account-1',
        batch: 'batch-1',
      },
      {
        id: 'work-2',
        accountId: 'account-1',
        batch: 'batch-2',
      },
    ]);
    mocks.websitePost.mockResolvedValue({
      instanceId: 'website-1',
      message: 'Website rejected the batch',
      exception: new Error('Website rejected the batch'),
    });

    await worker.start();

    expect(mocks.websitePost).toHaveBeenCalledTimes(2);
    expect(mocks.notificationService.create).toHaveBeenCalledTimes(1);
  });

  it('does not hide a posting failure when cancellation is also requested', async () => {
    const { worker, mocks } = createWorker();
    const rateLimitedUntil = new Date(Date.now() + 60_000).toISOString();
    mocks.postingRateLimiter.acquire.mockResolvedValue({
      acquired: true,
      rateLimitedUntil,
    });
    mocks.websitePost.mockImplementation(() => {
      worker.cancel('Cancelled during dispatch');
      throw new Error('Website failed during dispatch');
    });

    await worker.start();

    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith('work-1', {
      state: 'FAILED',
      response: {
        error: "Error posting batch for account 'account-1'",
      },
    });
    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith('work-1', {
      state: 'EXECUTING',
      rateLimitedUntil,
    });
    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalledWith(
      'work-1',
      expect.objectContaining({ state: 'CANCELLED' }),
    );
  });

  it('marks token-originated cancellation without reporting a failure', async () => {
    const { worker, mocks } = createWorker();
    mocks.websitePost.mockImplementation(
      (
        _postData: unknown,
        _files: unknown,
        _batch: unknown,
        cancellationToken: CancellationToken,
      ) => {
        worker.cancel('Cancelled during dispatch');
        cancellationToken.throwIfAborted();
      },
    );

    await worker.start();

    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith('work-1', {
      state: 'CANCELLED',
    });
    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalledWith(
      'work-1',
      expect.objectContaining({ state: 'FAILED' }),
    );
    expect(mocks.notificationService.create).not.toHaveBeenCalled();
  });

  it('marks a returned cancellation response without reporting a failure', async () => {
    const { worker, mocks } = createWorker();
    mocks.websitePost.mockImplementation(() => {
      worker.cancel('Cancelled during dispatch');
      return Promise.resolve({
        instanceId: 'website-1',
        exception: (worker as any).cancellationToken.signal.reason,
      });
    });

    await worker.start();

    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith('work-1', {
      state: 'CANCELLED',
    });
    expect(mocks.notificationService.create).not.toHaveBeenCalled();
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

  it('cancels a post internally when all website options are missing', async () => {
    const { worker, mocks } = createWorker();
    mocks.websiteOptionsRepository.find.mockResolvedValue([]);

    await worker.start();

    expect(mocks.postRepository.cancel).toHaveBeenCalledWith('post-1');
    expect(mocks.websitePost).not.toHaveBeenCalled();
    expect(
      mocks.postRepository.completeIfAllActiveUnitsSettled,
    ).not.toHaveBeenCalled();
  });

  it('honors cancellation requested before start', async () => {
    const { worker, mocks } = createWorker();

    expect(worker.cancel('User requested cancellation')).toBe(true);
    expect(worker.cancel('Duplicate cancellation')).toBe(false);
    await worker.start();

    expect(mocks.postRepository.findByIdOrThrow).not.toHaveBeenCalled();
    expect(mocks.postRepository.cancel).not.toHaveBeenCalled();
    expect(
      mocks.postRepository.completeIfAllActiveUnitsSettled,
    ).not.toHaveBeenCalled();
    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });

  it('loads all non-evicted work for batch metadata', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([]);

    await worker.start();

    const where = mocks.unitOfWorkRepository.find.mock.calls[0][0].where;
    const columns = {
      postId: 'postId',
      evicted: 'evicted',
    };
    const operators = {
      and: jest.fn((...conditions: unknown[]) => conditions),
      eq: jest.fn((column: string, value: unknown) => ({
        column,
        operator: 'eq',
        value,
      })),
    };

    expect(where(columns, operators)).toEqual([
      { column: 'postId', operator: 'eq', value: 'post-1' },
      { column: 'evicted', operator: 'eq', value: false },
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

    const validatingOrder = mocks.unitOfWorkRepository.update.mock.calls
      .filter(([, update]) => update.state === 'VALIDATING')
      .map(([unitId]) => unitId);
    expect(validatingOrder).toEqual([
      'missing-work',
      'standard-work',
      'external-work',
    ]);
  });

  it('leaves external-source work untouched while a source producer is deferred', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      {
        id: 'source-work',
        accountId: 'source-account',
        batch: 'source-batch',
        state: 'RATE_LIMITED',
        rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
      },
      {
        id: 'external-work',
        accountId: 'external-account',
        batch: 'external-batch',
        state: 'NEW',
      },
    ]);
    mocks.accountRepository.findByIdOrThrow.mockImplementation(
      (accountId: string) => Promise.resolve({ id: accountId }),
    );
    mocks.websiteRegistry.findInstance.mockImplementation(
      (account: { id: string }) => ({
        decoratedProps: {
          fileOptions: {
            acceptsExternalSourceUrls: account.id === 'external-account',
          },
        },
      }),
    );

    await worker.start();

    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalled();
    expect(mocks.websitePost).not.toHaveBeenCalled();
  });

  it('stops external-source work when a producer is denied during acquisition', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      {
        id: 'source-work',
        accountId: 'source-account',
        batch: 'source-batch',
        state: 'NEW',
      },
      {
        id: 'external-work',
        accountId: 'external-account',
        batch: 'external-batch',
        state: 'NEW',
      },
    ]);
    mocks.accountRepository.findByIdOrThrow.mockImplementation(
      (accountId: string) => Promise.resolve({ id: accountId }),
    );
    mocks.websiteRegistry.findInstance.mockImplementation(
      (account: { id: string }) => ({
        accountId: account.id,
        decoratedProps: {
          metadata: {
            displayName: account.id,
            name: account.id,
          },
          fileOptions: {
            acceptsExternalSourceUrls: account.id === 'external-account',
          },
        },
        login: jest.fn().mockResolvedValue({
          isLoggedIn: true,
          status: 'loggedIn',
        }),
        post: mocks.websitePost,
      }),
    );
    mocks.websiteOptionsRepository.find.mockResolvedValue([
      { id: 'source-options', accountId: 'source-account' },
      { id: 'external-options', accountId: 'external-account' },
    ]);
    mocks.postingRateLimiter.acquire.mockResolvedValueOnce({
      acquired: false,
      rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
    });

    await worker.start();

    expect(mocks.postingRateLimiter.acquire).toHaveBeenCalledTimes(1);
    expect(mocks.unitOfWorkRepository.update).toHaveBeenCalledWith(
      'source-work',
      expect.objectContaining({ state: 'RATE_LIMITED' }),
    );
    expect(mocks.unitOfWorkRepository.update).not.toHaveBeenCalledWith(
      'external-work',
      expect.objectContaining({ state: 'EXECUTING' }),
    );
    expect(mocks.websitePost).not.toHaveBeenCalled();
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

  it('resizes every image in a batch using the stricter user and website dimensions', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      {
        id: 'image-work-1',
        accountId: 'account-1',
        fileId: 'image-1',
        batch: 'batch-1',
      },
      {
        id: 'image-work-2',
        accountId: 'account-1',
        fileId: 'image-2',
        batch: 'batch-1',
      },
      {
        id: 'text-work',
        accountId: 'account-1',
        fileId: 'text-1',
        batch: 'batch-1',
      },
    ]);
    const files = {
      'image-1': {
        id: 'image-1',
        fileName: 'image-1.png',
        mimeType: 'image/png',
        size: 2000,
        width: 1200,
        height: 1000,
        file: {},
        metadata: {
          dimensions: {
            'account-1': { width: 800, height: 600 },
          },
        },
      },
      'image-2': {
        id: 'image-2',
        fileName: 'image-2.png',
        mimeType: 'image/png',
        size: 2000,
        width: 1200,
        height: 1000,
        file: {},
        metadata: {
          dimensions: {
            'account-1': { width: 400, height: 900 },
          },
        },
      },
      'text-1': {
        id: 'text-1',
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        file: {},
        metadata: {},
      },
    };
    mocks.fileRepository.findByIdOrThrow.mockImplementation(
      (fileId: keyof typeof files) => Promise.resolve(files[fileId]),
    );
    mocks.websiteRegistry.findInstance.mockReturnValue({
      accountId: 'account-1',
      decoratedProps: {},
      calculateImageResize: jest.fn().mockReturnValue({
        width: 500,
        height: 700,
        outputMimeType: 'image/jpeg',
      }),
      login: jest.fn().mockResolvedValue({
        isLoggedIn: true,
        status: 'loggedIn',
      }),
    });

    await worker.start();

    expect(mocks.postFileResizerService.resize).toHaveBeenCalledTimes(2);
    expect(mocks.postFileResizerService.resize).toHaveBeenNthCalledWith(1, {
      file: files['image-1'],
      resize: {
        width: 500,
        height: 700,
        outputMimeType: 'image/jpeg',
      },
    });
    expect(mocks.postFileResizerService.resize).toHaveBeenNthCalledWith(2, {
      file: files['image-2'],
      resize: {
        width: 400,
        height: 900,
        outputMimeType: 'image/jpeg',
      },
    });
  });

  it('converts an unsupported file before resizing without mutating the stored file', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      {
        id: 'image-work',
        accountId: 'account-1',
        fileId: 'image-1',
        batch: 'batch-1',
      },
    ]);
    const originalBuffer = {
      id: 'buffer-1',
      submissionFileId: 'image-1',
      fileName: 'image.png',
      mimeType: 'image/png',
      buffer: Buffer.from('png'),
      size: 3,
      width: 1200,
      height: 800,
    };
    const convertedBuffer = {
      ...originalBuffer,
      fileName: 'image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('jpeg'),
      size: 4,
      width: 600,
      height: 400,
    };
    const storedFile = {
      id: 'image-1',
      fileName: 'image.png',
      mimeType: 'image/png',
      size: 3,
      width: 1200,
      height: 800,
      file: originalBuffer,
      metadata: {},
    };
    mocks.fileRepository.findByIdOrThrow.mockResolvedValue(storedFile);
    mocks.fileConverterService.canConvert.mockResolvedValue(true);
    mocks.fileConverterService.convert.mockResolvedValue(convertedBuffer);
    const calculateImageResize = jest.fn().mockReturnValue({
      width: 500,
      height: 500,
    });
    mocks.websiteRegistry.findInstance.mockReturnValue({
      accountId: 'account-1',
      decoratedProps: {
        fileOptions: { acceptedMimeTypes: ['image/jpeg'] },
      },
      calculateImageResize,
      login: jest.fn().mockResolvedValue({
        isLoggedIn: true,
        status: 'loggedIn',
      }),
    });

    await worker.start();

    expect(mocks.fileConverterService.canConvert).toHaveBeenCalledWith(
      'image/png',
      ['image/jpeg'],
    );
    expect(mocks.fileConverterService.convert).toHaveBeenCalledWith(
      originalBuffer,
      ['image/jpeg'],
    );
    expect(mocks.postFileResizerService.resize).toHaveBeenCalledWith({
      file: expect.objectContaining({
        file: convertedBuffer,
        fileName: 'image.jpg',
        mimeType: 'image/jpeg',
        size: 4,
        width: 600,
        height: 400,
      }),
      resize: { width: 500, height: 500 },
    });
    expect(calculateImageResize).toHaveBeenCalledWith(
      expect.objectContaining({
        file: convertedBuffer,
        mimeType: 'image/jpeg',
      }),
    );
    expect(
      mocks.fileConverterService.convert.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocks.postFileResizerService.resize.mock.invocationCallOrder[0],
    );
    expect(storedFile).toEqual({
      id: 'image-1',
      fileName: 'image.png',
      mimeType: 'image/png',
      size: 3,
      width: 1200,
      height: 800,
      file: originalBuffer,
      metadata: {},
    });
  });

  it('does not convert a file whose MIME type is already accepted', async () => {
    const { worker, mocks } = createWorker();
    mocks.unitOfWorkRepository.find.mockResolvedValue([
      {
        id: 'text-work',
        accountId: 'account-1',
        fileId: 'text-1',
        batch: 'batch-1',
      },
    ]);
    mocks.fileRepository.findByIdOrThrow.mockResolvedValue({
      id: 'text-1',
      fileName: 'notes.txt',
      mimeType: 'text/plain',
      file: {
        id: 'buffer-1',
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('notes'),
      },
      metadata: {},
    });
    mocks.websiteRegistry.findInstance.mockReturnValue({
      accountId: 'account-1',
      decoratedProps: {
        fileOptions: { acceptedMimeTypes: ['text/*'] },
      },
      login: jest.fn().mockResolvedValue({
        isLoggedIn: true,
        status: 'loggedIn',
      }),
    });

    await worker.start();

    expect(mocks.fileConverterService.canConvert).not.toHaveBeenCalled();
    expect(mocks.fileConverterService.convert).not.toHaveBeenCalled();
    expect(mocks.postFileResizerService.resize).not.toHaveBeenCalled();
  });

  it('completes a post that has no work', async () => {
    const { worker, mocks } = createWorker();
    mocks.postRepository.completeIfAllActiveUnitsSettled.mockResolvedValue(
      true,
    );
    mocks.unitOfWorkRepository.find.mockResolvedValue([]);

    await worker.start();

    expect(
      mocks.postRepository.completeIfAllActiveUnitsSettled,
    ).toHaveBeenCalledWith('post-1');
    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });
});
