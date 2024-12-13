import { Collection, Loaded } from '@mikro-orm/core';
import {
  IAccount,
  ISubmission,
  IWebsiteOptions,
  IWebsitePostRecord,
  MessageSubmission,
  NullAccount,
  PostRecordResumeMode,
  PostRecordState,
  SubmissionType,
} from '@postybirb/types';
import { PostRecord, WebsitePostRecord } from '../../../database/entities';
import { PostyBirbRepository } from '../../../database/repositories/postybirb-repository';
import { FileConverterService } from '../../../file-converter/file-converter.service';
import { PostParsersService } from '../../../post-parsers/post-parsers.service';
import { ValidationService } from '../../../validation/validation.service';
import { DefaultWebsiteOptionsObject } from '../../../websites/models/default-website-options';
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
      // ...mock implementation...
    } as unknown as jest.Mocked<PostyBirbRepository<WebsitePostRecord>>;
    websiteRegistryMock = {
      // ...mock implementation...
    } as unknown as jest.Mocked<WebsiteRegistryService>;
    resizerServiceMock = {} as unknown as jest.Mocked<PostFileResizerService>;
    postParserServiceMock = {} as unknown as jest.Mocked<PostParsersService>;
    validationServiceMock = {} as unknown as jest.Mocked<ValidationService>;
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

  function createMessageSubmission(): MessageSubmission {
    const submission = {
      id: 'test',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      type: SubmissionType.MESSAGE,
      files: [] as never,
      options: [] as never,
      isScheduled: false,
      schedule: {} as never,
      order: 1,
      posts: [] as never,
    };

    (submission.options as Collection<IWebsiteOptions>).add = (
      ...options: IWebsiteOptions[]
    ) => {
      (submission.options as IWebsiteOptions[]).push(...options);
    };

    return submission as MessageSubmission;
  }

  function createPostRecord(
    submission: ISubmission,
  ): Loaded<PostRecord, string> {
    const record = new PostRecord({
      parent: submission,
      state: PostRecordState.PENDING,
      resumeMode: PostRecordResumeMode.CONTINUE,
    });

    record.createdAt = new Date();
    record.updatedAt = new Date();
    record.id = 'test-post-record';
    record.children = new Collection<IWebsitePostRecord>(record);
    record.toJSON = jest.fn().mockReturnValue({});

    return record as Loaded<PostRecord, string>;
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should post a message submission', async () => {
    const submission = createMessageSubmission();
    const account = createAccount();
    const websiteOptions = createWebsiteOptions(submission, account);
    submission.options.add(websiteOptions);
    const postRecord: Loaded<PostRecord, string> = createPostRecord(submission);

    postRepositoryMock.findOne.mockResolvedValue(Promise.resolve(postRecord));
    postRepositoryMock.update.mockImplementation(async (id, record) => {
      Object.assign(postRecord, record);
      return record as unknown as Loaded<PostRecord, never>;
    });

    await service.startPost(postRecord);
    expect(postRepositoryMock.update).toHaveBeenNthCalledWith(
      1,
      postRecord.id,
      {
        state: PostRecordState.RUNNING,
      },
    );
    expect(postRecord.state).toBe(PostRecordState.DONE);
  });
});
