import { Collection, Loaded } from '@mikro-orm/core';
import {
  FileSubmission,
  FileType,
  IAccount,
  ILoginState,
  ISubmission,
  ISubmissionFile,
  IWebsiteOptions,
  IWebsitePostRecord,
  MessageSubmission,
  NullAccount,
  PostData,
  PostRecordResumeMode,
  PostRecordState,
  PostResponse,
  SubmissionRating,
  SubmissionType,
} from '@postybirb/types';
import { PostRecord, WebsitePostRecord } from '../../../database/entities';
import { PostyBirbRepository } from '../../../database/repositories/postybirb-repository';
import { FileConverterService } from '../../../file-converter/file-converter.service';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { ValidationService } from '../../../validation/validation.service';
import { defaultWebsiteDecoratorProps } from '../../../websites/decorators/website-decorator-props';
import { DefaultWebsiteOptionsObject } from '../../../websites/models/default-website-options';
import { FileWebsite } from '../../../websites/models/website-modifiers/file-website';
import { MessageWebsite } from '../../../websites/models/website-modifiers/message-website';
import { UnknownWebsite } from '../../../websites/website';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { PostFileResizerService } from '../post-file-resizer/post-file-resizer.service';
import { PostManagerService } from './post-manager.service';

describe('PostManagerServiceMocks', () => {
  let service: PostManagerService;
  let postRepositoryMock: jest.Mocked<PostyBirbRepository<PostRecord>>;
  let websitePostRecordRepositoryMock: jest.Mocked<
    PostyBirbRepository<WebsitePostRecord>
  >;
  let websiteRegistryMock: jest.Mocked<WebsiteRegistryService>;
  let resizerServiceMock: jest.Mocked<PostFileResizerService>;
  let postParserServiceMock: jest.Mocked<PostParsersService>;
  let validationServiceMock: jest.Mocked<ValidationService>;
  let fileConverterServiceMock: jest.Mocked<FileConverterService>;

  beforeEach(async () => {
    postRepositoryMock = {
      findOne: jest.fn(),
      update: jest.fn(),
      persistAndFlush: jest.fn(),
    } as unknown as jest.Mocked<PostyBirbRepository<PostRecord>>;
    websitePostRecordRepositoryMock = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      persistAndFlush: jest.fn(),
    } as unknown as jest.Mocked<PostyBirbRepository<WebsitePostRecord>>;
    websiteRegistryMock = {
      findInstance: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      persistAndFlush: jest.fn(),
    } as unknown as jest.Mocked<WebsiteRegistryService>;
    resizerServiceMock = {} as unknown as jest.Mocked<PostFileResizerService>;
    postParserServiceMock = {
      parse: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      persistAndFlush: jest.fn(),
    } as unknown as jest.Mocked<PostParsersService>;
    validationServiceMock = {
      validateSubmission: jest.fn(),
    } as unknown as jest.Mocked<ValidationService>;
    fileConverterServiceMock =
      {} as unknown as jest.Mocked<FileConverterService>;

    service = new PostManagerService(
      postRepositoryMock,
      websitePostRecordRepositoryMock,
      websiteRegistryMock,
      resizerServiceMock,
      postParserServiceMock,
      validationServiceMock,
      fileConverterServiceMock,
    );
  });

  function patchCollection<TCollection extends object>(
    referenceArray: TCollection[],
  ): Collection<TCollection> {
    const refAsCollection =
      referenceArray as unknown as Collection<TCollection>;
    refAsCollection.add = (...items: TCollection[]) => {
      referenceArray.push(...items);
    };
    refAsCollection.toArray = () => referenceArray as never;
    refAsCollection.getItems = () => referenceArray as never;
    return refAsCollection;
  }

  function createMessageSubmission(): MessageSubmission {
    const submission = {
      id: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      type: SubmissionType.MESSAGE,
      files: [] as never,
      options: patchCollection<IWebsiteOptions>([]) as never,
      isScheduled: false,
      schedule: {} as never,
      order: 1,
      posts: [] as never,
    };

    return submission as MessageSubmission;
  }

  function createFileSubmission(): FileSubmission {
    const submission = {
      id: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        order: [],
        fileMetadata: {},
      },
      type: SubmissionType.FILE,
      files: patchCollection<ISubmissionFile>([]) as never,
      options: patchCollection<IWebsiteOptions>([]) as never,
      isScheduled: false,
      schedule: {} as never,
      order: 1,
      posts: [] as never,
    };

    return submission as FileSubmission;
  }

  function createPostRecord(
    submission: ISubmission,
  ): Loaded<PostRecord, string> {
    const postRecord = {
      parent: submission,
      state: PostRecordState.PENDING,
      resumeMode: PostRecordResumeMode.CONTINUE,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: 'test-post-record',
      children: patchCollection<IWebsitePostRecord>([]) as never,
      toJSON: jest.fn().mockReturnValue({}),
    };

    postRecord.toJSON = jest.fn().mockReturnValue({});
    return postRecord as Loaded<PostRecord, string>;
  }

  function createAccount(): IAccount {
    return {
      id: 'test-account',
      name: 'Test Account',
      website: 'test',
      groups: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  function createWebsiteOptions(
    submission: ISubmission,
    account: IAccount,
  ): IWebsiteOptions[] {
    return [
      {
        id: 'default',
        account: new NullAccount(),
        submission,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { ...DefaultWebsiteOptionsObject },
      },
      {
        id: 'instance-options',
        account,
        submission,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { ...DefaultWebsiteOptionsObject },
      },
    ];
  }

  function mockFileSubmissionPost() {
    const submission = createFileSubmission();
    const account = createAccount();
    const websiteOptions = createWebsiteOptions(submission, account);
    websiteOptions.forEach((option) => submission.options.add(option));
    const postRecord: Loaded<PostRecord, string> = createPostRecord(submission);
    const websiteInstance: UnknownWebsite = {
      id: 'test',
      supportsFile: true,
      supportsMessage: false,
      decoratedProps: {
        ...defaultWebsiteDecoratorProps(),
        fileOptions: {
          acceptedMimeTypes: ['image/jpeg'],
          fileBatchSize: 1,
          supportedFileTypes: [FileType.IMAGE],
        },
      },
      getLoginState: jest.fn().mockReturnValue({
        isLoggedIn: true,
        pending: false,
        username: 'test',
      } as ILoginState),
      getSupportedTypes: jest.fn().mockReturnValue([SubmissionType.FILE]),
    } as unknown as UnknownWebsite;

    postRepositoryMock.findOne.mockResolvedValue(Promise.resolve(postRecord));
    postRepositoryMock.update.mockImplementation(async (id, record) => {
      Object.assign(postRecord, record);
      return record as unknown as Loaded<PostRecord, never>;
    });
    websitePostRecordRepositoryMock.create.mockImplementation(
      (record) =>
        ({
          ...record,
          id: new Date().getTime().toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            sourceMap: {},
            postedFiles: [],
            nextBatchNumber: 1,
          },
        }) as WebsitePostRecord,
    );
    websiteRegistryMock.findInstance.mockReturnValue(websiteInstance);
    postParserServiceMock.parse.mockResolvedValue({
      submission,
      options: {
        title: 'Test Title',
        description: 'Test Description',
        rating: SubmissionRating.GENERAL,
        tags: ['test'],
      },
    } as PostData);
    validationServiceMock.validateSubmission.mockResolvedValue(
      Promise.resolve([]),
    );

    return { postRecord, submission, websiteOptions, websiteInstance };
  }

  function mockMessageSubmissionPost() {
    const submission = createMessageSubmission();
    const account = createAccount();
    const websiteOptions = createWebsiteOptions(submission, account);
    websiteOptions.forEach((option) => submission.options.add(option));
    const postRecord: Loaded<PostRecord, string> = createPostRecord(submission);
    const websiteInstance: UnknownWebsite = {
      id: 'test',
      supportsFile: false,
      supportsMessage: true,
      decoratedProps: defaultWebsiteDecoratorProps(),
      getLoginState: jest.fn().mockReturnValue({
        isLoggedIn: true,
        pending: false,
        username: 'test',
      } as ILoginState),
      getSupportedTypes: jest.fn().mockReturnValue([SubmissionType.MESSAGE]),
    } as unknown as UnknownWebsite;

    postRepositoryMock.findOne.mockResolvedValue(Promise.resolve(postRecord));
    postRepositoryMock.update.mockImplementation(async (id, record) => {
      Object.assign(postRecord, record);
      return record as unknown as Loaded<PostRecord, never>;
    });
    websitePostRecordRepositoryMock.create.mockImplementation(
      (record) =>
        ({
          ...record,
          id: new Date().getTime().toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            sourceMap: {},
            postedFiles: [],
            nextBatchNumber: 1,
          },
        }) as WebsitePostRecord,
    );
    websiteRegistryMock.findInstance.mockReturnValue(websiteInstance);
    postParserServiceMock.parse.mockResolvedValue({
      submission,
      options: {
        title: 'Test Title',
        description: 'Test Description',
        rating: SubmissionRating.GENERAL,
        tags: ['test'],
      },
    } as PostData);
    validationServiceMock.validateSubmission.mockResolvedValue(
      Promise.resolve([]),
    );

    return { postRecord, submission, websiteOptions, websiteInstance };
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should post a file submission successfully', async () => {
    // This more or less tests the happy path
    const { postRecord, websiteInstance } = mockFileSubmissionPost();

    const response: PostResponse = {
      exception: undefined,
      sourceUrl: 'https://test.postybirb.com',
    };
    (websiteInstance as unknown as FileWebsite).onPostFileSubmission = jest
      .fn()
      .mockResolvedValue(Promise.resolve(response));

    await service.startPost(postRecord);
    expect(postRepositoryMock.update).toHaveBeenNthCalledWith(
      1,
      postRecord.id,
      {
        state: PostRecordState.RUNNING,
      },
    );
    expect(postRecord.state).toBe(PostRecordState.DONE);
    expect(postRecord.completedAt).toBeDefined();
    expect(postRecord.children.toArray()).toHaveLength(1);
    expect(postRecord.children.toArray()[0].completedAt).toBeDefined();
    expect(postRecord.children.toArray()[0].errors).toBeUndefined();
    expect(postRecord.children.toArray()[0].metadata.source).toEqual(
      response.sourceUrl,
    );
  });

  it('should post a message submission successfully', async () => {
    // This more or less tests the happy path
    const { postRecord, websiteInstance } = mockMessageSubmissionPost();

    const response: PostResponse = {
      exception: undefined,
      sourceUrl: 'https://test.postybirb.com',
    };
    (websiteInstance as unknown as MessageWebsite).onPostMessageSubmission =
      jest.fn().mockResolvedValue(Promise.resolve(response));

    await service.startPost(postRecord);
    expect(postRepositoryMock.update).toHaveBeenNthCalledWith(
      1,
      postRecord.id,
      {
        state: PostRecordState.RUNNING,
      },
    );
    expect(postRecord.state).toBe(PostRecordState.DONE);
    expect(postRecord.completedAt).toBeDefined();
    expect(postRecord.children.toArray()).toHaveLength(1);
    expect(postRecord.children.toArray()[0].completedAt).toBeDefined();
    expect(postRecord.children.toArray()[0].errors).toBeUndefined();
    expect(postRecord.children.toArray()[0].metadata.source).toEqual(
      response.sourceUrl,
    );
  });

  it('should post a message submission unsuccessfully at post time', async () => {
    // This more or less tests the happy path
    const { postRecord, websiteInstance } = mockMessageSubmissionPost();

    const response: PostResponse = {
      exception: new Error('Test Error'),
    };
    (websiteInstance as unknown as MessageWebsite).onPostMessageSubmission =
      jest.fn().mockResolvedValue(Promise.resolve(response));

    await service.startPost(postRecord);
    expect(postRepositoryMock.update).toHaveBeenNthCalledWith(
      1,
      postRecord.id,
      {
        state: PostRecordState.RUNNING,
      },
    );
    expect(postRecord.state).toBe(PostRecordState.FAILED);
    expect(postRecord.completedAt).toBeDefined();
    expect(postRecord.children.toArray()).toHaveLength(1);
    expect(postRecord.children.toArray()[0].completedAt).toBeUndefined();
    expect(postRecord.children.toArray()[0].errors).toBeDefined();
  });
});
