import { clearDatabase } from '@postybirb/database';
import {
  AccountId,
  DefaultSubmissionFileMetadata,
  EntityId,
  FileSubmissionMetadata,
  FileType,
  IPostResponse,
  PostData,
  PostEventType,
  PostRecordState,
  SubmissionRating,
  SubmissionType,
} from '@postybirb/types';
import 'reflect-metadata';
import {
  FileBuffer,
  PostRecord,
  Submission,
  SubmissionFile,
} from '../../../drizzle/models';
import { FileConverterService } from '../../../file-converter/file-converter.service';
import { NotificationsService } from '../../../notifications/notifications.service';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { ValidationService } from '../../../validation/validation.service';
import {
  FileWebsite,
  ImplementedFileWebsite,
} from '../../../websites/models/website-modifiers/file-website';
import { UnknownWebsite } from '../../../websites/website';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { CancellableToken } from '../../models/cancellable-token';
import { PostingFile } from '../../models/posting-file';
import { PostFileResizerService } from '../post-file-resizer/post-file-resizer.service';
import { PostEventRepository } from '../post-record-factory';
import { FileSubmissionPostManager } from './file-submission-post-manager.service';

describe('FileSubmissionPostManager', () => {
  let manager: FileSubmissionPostManager;
  let postEventRepositoryMock: jest.Mocked<PostEventRepository>;
  let websiteRegistryMock: jest.Mocked<WebsiteRegistryService>;
  let postParserServiceMock: jest.Mocked<PostParsersService>;
  let validationServiceMock: jest.Mocked<ValidationService>;
  let notificationServiceMock: jest.Mocked<NotificationsService>;
  let resizerServiceMock: jest.Mocked<PostFileResizerService>;
  let fileConverterServiceMock: jest.Mocked<FileConverterService>;

  beforeEach(() => {
    clearDatabase();

    postEventRepositoryMock = {
      insert: jest.fn().mockResolvedValue({}),
      findByPostRecordId: jest.fn().mockResolvedValue([]),
      getCompletedAccounts: jest.fn().mockResolvedValue([]),
      getFailedEvents: jest.fn().mockResolvedValue([]),
      getSourceUrlsFromPost: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<PostEventRepository>;

    websiteRegistryMock = {
      findInstance: jest.fn(),
    } as unknown as jest.Mocked<WebsiteRegistryService>;

    postParserServiceMock = {
      parse: jest.fn(),
    } as unknown as jest.Mocked<PostParsersService>;

    validationServiceMock = {
      validateSubmission: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ValidationService>;

    notificationServiceMock = {
      create: jest.fn(),
      sendDesktopNotification: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;

    resizerServiceMock = {
      resize: jest.fn(),
    } as unknown as jest.Mocked<PostFileResizerService>;

    fileConverterServiceMock = {
      convert: jest.fn(),
      canConvert: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<FileConverterService>;

    manager = new FileSubmissionPostManager(
      postEventRepositoryMock,
      websiteRegistryMock,
      postParserServiceMock,
      validationServiceMock,
      notificationServiceMock,
      resizerServiceMock,
      fileConverterServiceMock,
    );
  });

  function createFileBuffer(): FileBuffer {
    return new FileBuffer({
      id: 'test-file-buffer',
      fileName: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data'),
      size: 100,
      width: 600,
      height: 600,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function createSubmissionFile(
    id: string = 'test-file',
    order: number = 1,
  ): SubmissionFile {
    const fileBuffer = createFileBuffer();
    return new SubmissionFile({
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileName: 'test.png',
      hash: 'fake-hash',
      mimeType: 'image/png',
      size: fileBuffer.size,
      width: 600,
      height: 600,
      hasAltFile: false,
      hasThumbnail: false,
      hasCustomThumbnail: false,
      file: fileBuffer,
      order,
      metadata: DefaultSubmissionFileMetadata(),
    });
  }

  function createSubmission(
    files: SubmissionFile[] = [],
  ): Submission<FileSubmissionMetadata> {
    return new Submission<FileSubmissionMetadata>({
      id: 'test-submission',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {},
      type: SubmissionType.FILE,
      files,
      options: [],
      isScheduled: false,
      schedule: {} as never,
      order: 1,
      posts: [] as never,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
    });
  }

  function createPostRecord(
    submission: Submission<FileSubmissionMetadata>,
  ): PostRecord {
    return new PostRecord({
      id: 'test-post-record' as EntityId,
      submission,
      state: PostRecordState.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function createMockFileWebsite(accountId: AccountId): UnknownWebsite {
    return {
      id: 'test-website',
      accountId,
      account: {
        id: accountId,
        name: 'test-account',
      },
      decoratedProps: {
        metadata: {
          name: 'Test Website',
          displayName: 'Test Website',
        },
        fileOptions: {
          acceptedMimeTypes: ['image/png', 'image/jpeg'],
          fileBatchSize: 1,
          supportedFileTypes: [FileType.IMAGE],
        },
      },
      onPostFileSubmission: jest.fn(),
      calculateImageResize: jest.fn().mockReturnValue(undefined),
      supportsFile: true,
    } as unknown as UnknownWebsite;
  }

  function createPostingFile(file: SubmissionFile): PostingFile {
    const postingFile = new PostingFile(file.id, file.file, file.thumbnail);
    postingFile.metadata = file.metadata;
    return postingFile;
  }

  describe('getSupportedType', () => {
    it('should return FILE submission type', () => {
      expect(manager.getSupportedType()).toBe(SubmissionType.FILE);
    });
  });

  describe('attemptToPost', () => {
    let mockWebsite: UnknownWebsite;
    let postRecord: PostRecord;
    let accountId: AccountId;
    let postData: PostData;
    let cancelToken: CancellableToken;
    let submissionFile: SubmissionFile;

    beforeEach(() => {
      accountId = 'test-account-id' as AccountId;
      submissionFile = createSubmissionFile();
      const submission = createSubmission([submissionFile]);
      postRecord = createPostRecord(submission);
      mockWebsite = createMockFileWebsite(accountId);

      cancelToken = new CancellableToken();
      (manager as any).cancelToken = cancelToken;
      (manager as any).lastTimePostedToWebsite = {};

      postData = {
        submission,
        options: {
          title: 'Test Title',
          description: 'Test Description',
          rating: SubmissionRating.GENERAL,
          tags: ['test'],
        },
      } as PostData;

      // Setup resizer mock to return a PostingFile
      resizerServiceMock.resize.mockImplementation(async (request) => {
        const file = request.file as SubmissionFile;
        return createPostingFile(file);
      });
    });

    it('should throw error if website does not support file submissions', async () => {
      const nonFileWebsite = {
        ...mockWebsite,
        supportsFile: false,
        decoratedProps: {
          ...mockWebsite.decoratedProps,
          metadata: {
            name: 'Message Only Website',
            displayName: 'Message Only Website',
          },
        },
      } as unknown as UnknownWebsite;
      delete (nonFileWebsite as any).onPostFileSubmission;

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          nonFileWebsite,
          postData,
        ),
      ).rejects.toThrow('does not support file submissions');
    });

    it('should successfully post a file and emit FILE_POSTED event', async () => {
      const sourceUrl = 'https://example.com/file/123';
      const responseMessage = 'File posted successfully';

      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl,
        message: responseMessage,
      });

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      // Verify website method was called
      expect(
        (mockWebsite as unknown as FileWebsite).onPostFileSubmission,
      ).toHaveBeenCalledWith(
        postData,
        expect.any(Array),
        1,
        cancelToken,
      );

      // Verify FILE_POSTED event was emitted
      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          postRecordId: postRecord.id,
          accountId,
          eventType: PostEventType.FILE_POSTED,
          fileId: submissionFile.id,
          sourceUrl,
          metadata: expect.objectContaining({
            batchNumber: 1,
            accountSnapshot: {
              name: 'test-account',
              website: 'Test Website',
            },
            fileSnapshot: expect.objectContaining({
              fileName: submissionFile.fileName,
              mimeType: submissionFile.mimeType,
            }),
          }),
        }),
      );
    });

    it('should emit FILE_FAILED event and throw on error', async () => {
      const errorMessage = 'Failed to upload file';
      const exception = new Error('API Error');
      const stage = 'upload';
      const additionalInfo = { code: 'ERR_API' };

      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        message: errorMessage,
        exception,
        stage,
        additionalInfo,
      } as IPostResponse);

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          mockWebsite,
          postData,
        ),
      ).rejects.toThrow('API Error');

      // Verify FILE_FAILED event was emitted
      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          postRecordId: postRecord.id,
          accountId,
          eventType: PostEventType.FILE_FAILED,
          fileId: submissionFile.id,
          error: expect.objectContaining({
            message: errorMessage,
            stage,
            additionalInfo,
          }),
        }),
      );
    });

    it('should emit FILE_FAILED with unknown error when no message provided', async () => {
      const exception = new Error('Unknown API Error');

      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        exception,
      } as IPostResponse);

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          mockWebsite,
          postData,
        ),
      ).rejects.toThrow('Unknown API Error');

      // Verify FILE_FAILED event was emitted with default message
      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: PostEventType.FILE_FAILED,
          error: expect.objectContaining({
            message: 'Unknown error',
          }),
        }),
      );
    });

    it('should return early if no files to post', async () => {
      const emptySubmission = createSubmission([]);
      const emptyPostRecord = createPostRecord(emptySubmission);
      postData.submission = emptySubmission;

      await (manager as any).attemptToPost(
        emptyPostRecord,
        accountId,
        mockWebsite,
        postData,
      );

      // Website method should not have been called
      expect(
        (mockWebsite as unknown as FileWebsite).onPostFileSubmission,
      ).not.toHaveBeenCalled();

      // No events should have been emitted
      expect(postEventRepositoryMock.insert).not.toHaveBeenCalled();
    });

    it('should check cancel token during posting', async () => {
      // Cancel immediately
      cancelToken.cancel();

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          mockWebsite,
          postData,
        ),
      ).rejects.toThrow('Task was cancelled');

      // Website method should not have been called
      expect(
        (mockWebsite as unknown as FileWebsite).onPostFileSubmission,
      ).not.toHaveBeenCalled();
    });

    it('should filter out files ignored for this website', async () => {
      const ignoredFile = createSubmissionFile('ignored-file', 1);
      ignoredFile.metadata.ignoredWebsites = [accountId];

      const validFile = createSubmissionFile('valid-file', 2);

      const submission = createSubmission([ignoredFile, validFile]);
      const postRecordWithIgnored = createPostRecord(submission);
      postData.submission = submission;

      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl: 'https://example.com/file/456',
      });

      await (manager as any).attemptToPost(
        postRecordWithIgnored,
        accountId,
        mockWebsite,
        postData,
      );

      // Should only post one file (the valid one)
      expect(
        (mockWebsite as unknown as FileWebsite).onPostFileSubmission,
      ).toHaveBeenCalledTimes(1);

      // Verify FILE_POSTED event only for valid file
      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: validFile.id,
          eventType: PostEventType.FILE_POSTED,
        }),
      );
    });

    it('should sort files by order before posting', async () => {
      const file1 = createSubmissionFile('file-1', 3);
      const file2 = createSubmissionFile('file-2', 1);
      const file3 = createSubmissionFile('file-3', 2);

      const submission = createSubmission([file1, file2, file3]);
      const postRecordWithMultiple = createPostRecord(submission);
      postData.submission = submission;

      // Set batch size to 3 to get all files in one batch
      (mockWebsite as unknown as ImplementedFileWebsite).decoratedProps.fileOptions.fileBatchSize = 3;

      let capturedFiles: PostingFile[] = [];
      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockImplementation((data, files) => {
        capturedFiles = files;
        return {
          instanceId: 'test-website',
          sourceUrl: 'https://example.com/file/all',
        };
      });

      await (manager as any).attemptToPost(
        postRecordWithMultiple,
        accountId,
        mockWebsite,
        postData,
      );

      // Verify files are sorted by order
      expect(capturedFiles.map((f) => f.id)).toEqual([
        'file-2', // order 1
        'file-3', // order 2
        'file-1', // order 3
      ]);
    });
  });

  describe('file batching', () => {
    let mockWebsite: UnknownWebsite;
    let accountId: AccountId;
    let postData: PostData;
    let cancelToken: CancellableToken;

    beforeEach(() => {
      accountId = 'test-account-id' as AccountId;
      mockWebsite = createMockFileWebsite(accountId);
      cancelToken = new CancellableToken();
      (manager as any).cancelToken = cancelToken;
      (manager as any).lastTimePostedToWebsite = {};

      resizerServiceMock.resize.mockImplementation(async (request) => {
        const file = request.file as SubmissionFile;
        return createPostingFile(file);
      });
    });

    it('should batch files according to website batch size', async () => {
      const files = [
        createSubmissionFile('file-1', 1),
        createSubmissionFile('file-2', 2),
        createSubmissionFile('file-3', 3),
      ];

      const submission = createSubmission(files);
      const postRecord = createPostRecord(submission);

      postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // Set batch size to 2
      (mockWebsite as unknown as ImplementedFileWebsite).decoratedProps.fileOptions.fileBatchSize = 2;

      const batchIndices: number[] = [];
      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockImplementation(
        (data, files, batchIndex) => {
          batchIndices.push(batchIndex);
          return {
            instanceId: 'test-website',
            sourceUrl: `https://example.com/batch/${batchIndex}`,
          };
        },
      );

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      // Should have 2 batches: [file-1, file-2] and [file-3]
      expect(
        (mockWebsite as unknown as FileWebsite).onPostFileSubmission,
      ).toHaveBeenCalledTimes(2);
      expect(batchIndices).toEqual([1, 2]);
    });

    it('should use minimum batch size of 1', async () => {
      const file = createSubmissionFile();
      const submission = createSubmission([file]);
      const postRecord = createPostRecord(submission);

      postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // Set invalid batch size
      (mockWebsite as unknown as ImplementedFileWebsite).decoratedProps.fileOptions.fileBatchSize = 0;

      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl: 'https://example.com/file',
      });

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      // Should still work with batch size 1
      expect(
        (mockWebsite as unknown as FileWebsite).onPostFileSubmission,
      ).toHaveBeenCalledTimes(1);
    });

    it('should stop posting if a batch fails', async () => {
      const files = [
        createSubmissionFile('file-1', 1),
        createSubmissionFile('file-2', 2),
        createSubmissionFile('file-3', 3),
      ];

      const submission = createSubmission(files);
      const postRecord = createPostRecord(submission);

      postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // Set batch size to 1 to have 3 separate batches
      (mockWebsite as unknown as ImplementedFileWebsite).decoratedProps.fileOptions.fileBatchSize = 1;

      let callCount = 0;
      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return {
            instanceId: 'test-website',
            exception: new Error('Batch 2 failed'),
            message: 'Failed on second batch',
          };
        }
        return {
          instanceId: 'test-website',
          sourceUrl: `https://example.com/file/${callCount}`,
        };
      });

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          mockWebsite,
          postData,
        ),
      ).rejects.toThrow('Batch 2 failed');

      // Should have stopped at batch 2
      expect(
        (mockWebsite as unknown as FileWebsite).onPostFileSubmission,
      ).toHaveBeenCalledTimes(2);

      // Should have emitted FILE_POSTED for first file and FILE_FAILED for second
      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: 'file-1',
          eventType: PostEventType.FILE_POSTED,
        }),
      );
      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: 'file-2',
          eventType: PostEventType.FILE_FAILED,
        }),
      );
    });
  });

  describe('source URL propagation', () => {
    let mockWebsite: UnknownWebsite;
    let accountId: AccountId;
    let postData: PostData;
    let cancelToken: CancellableToken;

    beforeEach(() => {
      accountId = 'test-account-id' as AccountId;
      mockWebsite = createMockFileWebsite(accountId);
      cancelToken = new CancellableToken();
      (manager as any).cancelToken = cancelToken;
      (manager as any).lastTimePostedToWebsite = {};

      resizerServiceMock.resize.mockImplementation(async (request) => {
        const file = request.file as SubmissionFile;
        return createPostingFile(file);
      });
    });

    it('should include source URLs from previous posts in current batch', async () => {
      const file = createSubmissionFile();
      const submission = createSubmission([file]);
      const postRecord = createPostRecord(submission);

      postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // Mock that another account has already posted
      postEventRepositoryMock.getSourceUrlsFromPost.mockResolvedValue([
        'https://other-site.com/post/1',
        'https://other-site.com/post/2',
      ]);

      let capturedFiles: PostingFile[] = [];
      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockImplementation((data, files) => {
        capturedFiles = files;
        return {
          instanceId: 'test-website',
          sourceUrl: 'https://example.com/file',
        };
      });

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      // Verify source URLs were included in file metadata
      expect(capturedFiles[0].metadata.sourceUrls).toContain(
        'https://other-site.com/post/1',
      );
      expect(capturedFiles[0].metadata.sourceUrls).toContain(
        'https://other-site.com/post/2',
      );
    });

    it('should include source URLs from resume context', async () => {
      const file = createSubmissionFile();
      const submission = createSubmission([file]);
      const postRecord = createPostRecord(submission);

      postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // Set resume context with source URLs from prior attempts
      const resumeContext = {
        sourceUrlsByAccount: new Map([
          ['other-account' as AccountId, ['https://prior-site.com/post/1']],
          [accountId, ['https://self-url.com/post/1']], // Should be excluded
        ]),
        postedFilesByAccount: new Map(),
      };
      (manager as any).resumeContext = resumeContext;

      let capturedFiles: PostingFile[] = [];
      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockImplementation((data, files) => {
        capturedFiles = files;
        return {
          instanceId: 'test-website',
          sourceUrl: 'https://example.com/file',
        };
      });

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      // Verify source URLs from prior attempts were included (excluding self)
      expect(capturedFiles[0].metadata.sourceUrls).toContain(
        'https://prior-site.com/post/1',
      );
      expect(capturedFiles[0].metadata.sourceUrls).not.toContain(
        'https://self-url.com/post/1',
      );
    });

    it('should deduplicate source URLs', async () => {
      const file = createSubmissionFile();
      const submission = createSubmission([file]);
      const postRecord = createPostRecord(submission);

      postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // Same URL from both sources
      postEventRepositoryMock.getSourceUrlsFromPost.mockResolvedValue([
        'https://duplicate.com/post/1',
      ]);

      const resumeContext = {
        sourceUrlsByAccount: new Map([
          ['other-account' as AccountId, ['https://duplicate.com/post/1']],
        ]),
        postedFilesByAccount: new Map(),
      };
      (manager as any).resumeContext = resumeContext;

      let capturedFiles: PostingFile[] = [];
      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockImplementation((data, files) => {
        capturedFiles = files;
        return {
          instanceId: 'test-website',
          sourceUrl: 'https://example.com/file',
        };
      });

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      // Verify URL appears only once
      const duplicateCount = capturedFiles[0].metadata.sourceUrls.filter(
        (url) => url === 'https://duplicate.com/post/1',
      ).length;
      expect(duplicateCount).toBe(1);
    });
  });

  describe('resume context handling', () => {
    let mockWebsite: UnknownWebsite;
    let accountId: AccountId;
    let postData: PostData;
    let cancelToken: CancellableToken;

    beforeEach(() => {
      accountId = 'test-account-id' as AccountId;
      mockWebsite = createMockFileWebsite(accountId);
      cancelToken = new CancellableToken();
      (manager as any).cancelToken = cancelToken;
      (manager as any).lastTimePostedToWebsite = {};

      resizerServiceMock.resize.mockImplementation(async (request) => {
        const file = request.file as SubmissionFile;
        return createPostingFile(file);
      });
    });

    it('should skip files that were already posted according to resume context', async () => {
      const alreadyPostedFile = createSubmissionFile('already-posted', 1);
      const newFile = createSubmissionFile('new-file', 2);

      const submission = createSubmission([alreadyPostedFile, newFile]);
      const postRecord = createPostRecord(submission);

      postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // Set resume context indicating one file was already posted
      const resumeContext = {
        sourceUrlsByAccount: new Map(),
        postedFilesByAccount: new Map([
          [accountId, new Set(['already-posted'])],
        ]),
      };
      (manager as any).resumeContext = resumeContext;

      let capturedFiles: PostingFile[] = [];
      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockImplementation((data, files) => {
        capturedFiles = files;
        return {
          instanceId: 'test-website',
          sourceUrl: 'https://example.com/file',
        };
      });

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      // Should only post the new file
      expect(capturedFiles).toHaveLength(1);
      expect(capturedFiles[0].id).toBe('new-file');
    });
  });

  describe('file verification', () => {
    let mockWebsite: UnknownWebsite;
    let accountId: AccountId;
    let postData: PostData;
    let cancelToken: CancellableToken;

    beforeEach(() => {
      accountId = 'test-account-id' as AccountId;
      mockWebsite = createMockFileWebsite(accountId);
      cancelToken = new CancellableToken();
      (manager as any).cancelToken = cancelToken;
      (manager as any).lastTimePostedToWebsite = {};
    });

    it('should throw error if file type is not supported after processing', async () => {
      const unsupportedFile = createSubmissionFile();

      const submission = createSubmission([unsupportedFile]);
      const postRecord = createPostRecord(submission);

      postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // Website only accepts JPEG
      (mockWebsite as unknown as ImplementedFileWebsite).decoratedProps.fileOptions.acceptedMimeTypes = [
        'image/jpeg',
      ];

      // Resizer returns PNG (which website doesn't accept)
      resizerServiceMock.resize.mockImplementation(async (request) => {
        const file = request.file as SubmissionFile;
        return createPostingFile(file); // Returns PNG
      });

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          mockWebsite,
          postData,
        ),
      ).rejects.toThrow('does not support the file type image/png');
    });

    it('should not verify if no accepted mime types are specified', async () => {
      const file = createSubmissionFile();
      const submission = createSubmission([file]);
      const postRecord = createPostRecord(submission);

      postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      // Website accepts all file types
      (mockWebsite as unknown as ImplementedFileWebsite).decoratedProps.fileOptions.acceptedMimeTypes = [];

      resizerServiceMock.resize.mockImplementation(async (request) => {
        const f = request.file as SubmissionFile;
        return createPostingFile(f);
      });

      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl: 'https://example.com/file',
      });

      await expect(
        (manager as any).attemptToPost(
          postRecord,
          accountId,
          mockWebsite,
          postData,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('event metadata structure', () => {
    it('should create events with proper file snapshot metadata', async () => {
      const accountId = 'metadata-account' as AccountId;
      const submissionFile = createSubmissionFile();
      submissionFile.hash = 'test-hash-123';

      const submission = createSubmission([submissionFile]);
      const postRecord = createPostRecord(submission);
      const mockWebsite = createMockFileWebsite(accountId);

      (
        mockWebsite as unknown as FileWebsite
      ).onPostFileSubmission = jest.fn().mockResolvedValue({
        instanceId: 'test-website',
        sourceUrl: 'https://example.com/file/456',
        message: 'Successfully posted file',
      });

      resizerServiceMock.resize.mockImplementation(async (request) => {
        const file = request.file as SubmissionFile;
        return createPostingFile(file);
      });

      const cancelToken = new CancellableToken();
      (manager as any).cancelToken = cancelToken;
      (manager as any).lastTimePostedToWebsite = {};

      const postData = {
        submission,
        options: {
          title: 'Test',
          description: 'Test',
          rating: SubmissionRating.GENERAL,
          tags: [],
        },
      } as PostData;

      await (manager as any).attemptToPost(
        postRecord,
        accountId,
        mockWebsite,
        postData,
      );

      expect(postEventRepositoryMock.insert).toHaveBeenCalledWith({
        postRecordId: postRecord.id,
        accountId,
        eventType: PostEventType.FILE_POSTED,
        fileId: submissionFile.id,
        sourceUrl: 'https://example.com/file/456',
        metadata: {
          batchNumber: 1,
          accountSnapshot: {
            name: 'test-account',
            website: 'Test Website',
          },
          fileSnapshot: {
            fileName: submissionFile.fileName,
            mimeType: submissionFile.mimeType,
            size: submissionFile.size,
            hash: submissionFile.hash,
          },
          responseMessage: 'Successfully posted file',
        },
      });
    });
  });
});
