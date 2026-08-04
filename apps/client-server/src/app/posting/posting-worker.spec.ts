import { FileConverterService } from '../file-converter/file-converter.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { PostFileResizerService } from '../post/services/post-file-resizer/post-file-resizer.service';
import { ValidationService } from '../validation/validation.service';
import { WebsiteRegistryService } from '../websites/website-registry.service';
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
  onAfterDispose: jest.Mock;
  postFileResizerService: {
    resize: jest.Mock;
  };
  postParsersService: {
    parse: jest.Mock;
  };
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
  validationService: {
    validate: jest.Mock;
  };
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
    fileRepository: {
      findByIdOrThrow: jest.fn(),
    },
    fileConverterService: {
      canConvert: jest.fn().mockResolvedValue(false),
      convert: jest.fn(),
    },
    onAfterDispose: jest.fn().mockResolvedValue(undefined),
    postFileResizerService: {
      resize: jest.fn().mockResolvedValue({}),
    },
    postParsersService: {
      parse: jest.fn().mockResolvedValue({ options: {} }),
    },
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
    validationService: {
      validate: jest.fn().mockResolvedValue({ errors: [], warnings: [] }),
    },
    websiteRegistry: {
      findInstance: jest.fn().mockReturnValue({
        decoratedProps: {},
        login: jest.fn().mockResolvedValue({
          isLoggedIn: true,
          status: 'loggedIn',
        }),
      }),
    },
    websiteOptionsRepository: {
      find: jest.fn().mockResolvedValue([
        { id: 'options-1', accountId: 'account-1' },
      ]),
    },
  };
  const worker = new PostingWorker(
    'post-1',
    mocks.websiteRegistry as unknown as WebsiteRegistryService,
    mocks.validationService as unknown as ValidationService,
    mocks.postParsersService as unknown as PostParsersService,
    mocks.postFileResizerService as unknown as PostFileResizerService,
    mocks.fileConverterService as unknown as FileConverterService,
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

    const validatingOrder = mocks.unitOfWorkRepository.update.mock.calls
      .filter(([, update]) => update.state === 'VALIDATING')
      .map(([unitId]) => unitId);
    expect(validatingOrder).toEqual([
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
    expect(mocks.fileConverterService.convert.mock.invocationCallOrder[0]).toBeLessThan(
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
    mocks.unitOfWorkRepository.find.mockResolvedValue([]);

    await worker.start();

    expect(mocks.postRepository.update).toHaveBeenCalledWith('post-1', {
      completed: true,
      cancelled: false,
    });
    expect(mocks.onAfterDispose).toHaveBeenCalledTimes(1);
  });
});
