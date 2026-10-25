import {
  CreateAccountDto,
  CreateSubmissionDto,
  CreateWebsiteOptionsDto,
  DefaultDescriptionValue,
  DefaultTagValue,
  SubmissionRating,
  SubmissionType,
  TipTapNode,
} from '@postybirb/types';
import { ConflictException } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountSchema,
  clearDatabase,
  CustomShortcutSchema,
  getDatabase,
  PostRepository,
  SubmissionSchema,
  WebsiteOptionsSchema,
} from '@postybirb/database';
import { eq, sql } from 'drizzle-orm';

import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';

import { FileConverterService } from '../file-converter/file-converter.service';
import { FileService } from '../file/file.service';
import { CreateFileService } from '../file/services/create-file.service';
import { UpdateFileService } from '../file/services/update-file.service';
import { FormGeneratorModule } from '../form-generator/form-generator.module';
import { SharpInstanceManager } from '../image-processing/sharp-instance-manager';
import { TestPlatformModule } from '../platform/testing/test-platform.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { PostingActivityModule } from '../posting/posting-activity.module';
import { PostingActivityService } from '../posting/posting-activity.service';

import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionService } from '../submission/services/submission.service';
import { SubmissionEventPublisher } from '../submission/submission-event.publisher';
import { ValidationService } from '../validation/validation.service';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { WebsitesModule } from '../websites/websites.module';

import { WebsiteOptionsService } from './website-options.service';

describe('WebsiteOptionsService', () => {
  let service: WebsiteOptionsService;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let module: TestingModule;
  let postingActivity: PostingActivityService;
  let postRepository: PostRepository;
  const markChanged = jest.fn();
  const markRemoved = jest.fn();

  async function createAccount() {
    const dto = new CreateAccountDto();
    dto.groups = ['test'];
    dto.name = 'test';
    dto.website = 'test';

    const record = await accountService.create(dto);
    return record;
  }

  async function createSubmission() {
    const dto = new CreateSubmissionDto();
    dto.name = 'test';
    dto.type = SubmissionType.MESSAGE;

    const record = await submissionService.create(dto);
    return record;
  }

  async function acceptSubmission(submissionId: string): Promise<void> {
    const post = await postRepository.insert({ submissionId });
    expect(postingActivity.accept(post.id, 3)).toBe(true);
  }

  beforeEach(async () => {
    clearDatabase();
    markChanged.mockReset();
    markRemoved.mockReset();
    try {
      module = await Test.createTestingModule({
        imports: [
          EventEmitterModule.forRoot(),
          TestPlatformModule,
          WebsitesModule,
          AccountModule,
          PostParsersModule,
          FormGeneratorModule,
          PostingActivityModule,
        ],
        providers: [
          SubmissionService,
          CreateFileService,
          UpdateFileService,
          SharpInstanceManager,
          FileService,
          SubmissionService,
          FileSubmissionService,
          MessageSubmissionService,
          AccountService,
          WebsiteRegistryService,
          ValidationService,
          WebsiteOptionsService,
          {
            provide: SubmissionEventPublisher,
            useValue: { markChanged, markRemoved },
          },
          WebsiteImplProvider,
          FileConverterService,
        ],
      }).compile();

      service = module.get<WebsiteOptionsService>(WebsiteOptionsService);
      submissionService = module.get<SubmissionService>(SubmissionService);
      accountService = module.get<AccountService>(AccountService);
      postingActivity = module.get<PostingActivityService>(
        PostingActivityService,
      );
      postRepository = new PostRepository();
      await accountService.onModuleInit();
      await module
        .get<WebsiteRegistryService>(WebsiteRegistryService)
        .waitForInitialization();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(async () => {
    await module.close();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not load modern description or shortcut payloads on repeated startups', async () => {
    const db = getDatabase();
    const modern = await createSubmission();
    const missingDescription = await createSubmission();
    await db
      .update(WebsiteOptionsSchema)
      .set({ data: { title: 'No description' } })
      .where(eq(WebsiteOptionsSchema.submissionId, missingDescription.id));
    await db.insert(CustomShortcutSchema).values({
      name: 'Modern shortcut',
      shortcut: { type: 'doc', content: [] },
    });
    const optionRead = jest.spyOn(
      WebsiteOptionsSchema.data,
      'mapFromDriverValue',
    );
    const shortcutRead = jest.spyOn(
      CustomShortcutSchema.shortcut,
      'mapFromDriverValue',
    );
    const submissionRead = jest.spyOn(
      SubmissionSchema.metadata,
      'mapFromDriverValue',
    );
    const accountRead = jest.spyOn(AccountSchema.groups, 'mapFromDriverValue');

    await service.onModuleInit();
    await service.onModuleInit();

    expect(modern.options[0].data.description?.description.type).toBe('doc');
    expect(optionRead).not.toHaveBeenCalled();
    expect(shortcutRead).not.toHaveBeenCalled();
    expect(submissionRead).not.toHaveBeenCalled();
    expect(accountRead).not.toHaveBeenCalled();
  });

  it('converts only legacy descriptions and discovers later legacy imports', async () => {
    const db = getDatabase();
    const legacy = await createSubmission();
    await createSubmission();
    const blocks = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Legacy description', styles: {} }],
        children: [],
      },
    ];
    const data = {
      ...legacy.options[0].data,
      title: 'Preserved title',
      description: {
        overrideDefault: true,
        insertTags: true,
        insertTitle: false,
        description: blocks,
      },
    };
    await db
      .update(WebsiteOptionsSchema)
      .set({ data: sql`${JSON.stringify(data)}` })
      .where(eq(WebsiteOptionsSchema.id, legacy.options[0].id));
    await db.insert(CustomShortcutSchema).values([
      { name: 'Legacy shortcut', shortcut: sql`${JSON.stringify(blocks)}` },
      { name: 'Empty legacy shortcut', shortcut: sql`${JSON.stringify([])}` },
      { name: 'Modern shortcut', shortcut: { type: 'doc', content: [] } },
    ]);
    const optionRead = jest.spyOn(
      WebsiteOptionsSchema.data,
      'mapFromDriverValue',
    );
    const shortcutRead = jest.spyOn(
      CustomShortcutSchema.shortcut,
      'mapFromDriverValue',
    );
    const submissionRead = jest.spyOn(
      SubmissionSchema.metadata,
      'mapFromDriverValue',
    );
    const accountRead = jest.spyOn(AccountSchema.groups, 'mapFromDriverValue');

    await service.onModuleInit();

    expect(optionRead).toHaveBeenCalledTimes(1);
    expect(shortcutRead).toHaveBeenCalledTimes(2);
    expect(submissionRead).not.toHaveBeenCalled();
    expect(accountRead).not.toHaveBeenCalled();
    const converted = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Legacy description' }],
        },
      ],
    };
    const [option] = await db
      .select({ data: WebsiteOptionsSchema.data })
      .from(WebsiteOptionsSchema)
      .where(eq(WebsiteOptionsSchema.id, legacy.options[0].id));
    expect(option.data).toEqual({
      ...data,
      description: { ...data.description, description: converted },
    });
    const [shortcut] = await db
      .select({ shortcut: CustomShortcutSchema.shortcut })
      .from(CustomShortcutSchema)
      .where(eq(CustomShortcutSchema.name, 'Legacy shortcut'));
    expect(shortcut.shortcut).toEqual(converted);

    optionRead.mockClear();
    shortcutRead.mockClear();
    await service.onModuleInit();
    expect(optionRead).not.toHaveBeenCalled();
    expect(shortcutRead).not.toHaveBeenCalled();

    await db.insert(CustomShortcutSchema).values({
      name: 'Imported later',
      shortcut: sql`${JSON.stringify(blocks)}`,
    });
    await service.onModuleInit();
    expect(shortcutRead).toHaveBeenCalledTimes(1);
  });

  it('should create entity', async () => {
    const account = await createAccount();
    const submission = await createSubmission();

    const dto = new CreateWebsiteOptionsDto();
    dto.data = {
      contentWarning: '',
      title: 'title',
      tags: DefaultTagValue(),
      description: DefaultDescriptionValue(),
      rating: SubmissionRating.GENERAL,
    };
    dto.accountId = account.id;
    dto.submissionId = submission.id;

    markChanged.mockClear();
    const record = await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(2); // 2 because default

    expect(groups[1].accountId).toEqual(dto.accountId);
    expect(groups[1].isDefault).toEqual(false);
    expect(groups[1].data).toEqual(dto.data);
    expect(groups[1].submission.id).toEqual(dto.submissionId);
    expect(markChanged).toHaveBeenCalledWith(submission.id, true);

    expect(record.toDTO()).toEqual({
      data: record.data,
      isDefault: false,
      id: record.id,
      accountId: account.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      account: record.account,
      submission: record.submission.toDTO(),
    });
  });

  it('should remove entity', async () => {
    const account = await createAccount();
    const submission = await createSubmission();

    const dto = new CreateWebsiteOptionsDto();
    dto.data = {
      title: 'title',
      tags: DefaultTagValue(),
      description: DefaultDescriptionValue(),
      rating: SubmissionRating.GENERAL,
    };
    dto.accountId = account.id;
    dto.submissionId = submission.id;

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(2); // 2 because default

    markChanged.mockClear();
    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(1);
    expect(markChanged).toHaveBeenCalledWith(submission.id, true);
  });

  it('immediately publishes bulk option additions and removals once', async () => {
    const account = await createAccount();
    const submission = await createSubmission();
    const data = {
      title: 'title',
      tags: DefaultTagValue(),
      description: DefaultDescriptionValue(),
      rating: SubmissionRating.GENERAL,
    };
    const record = await service.create({
      accountId: account.id,
      submissionId: submission.id,
      data,
    });

    markChanged.mockClear();
    await service.updateSubmissionOptions(submission.id, {
      remove: [record.id],
      add: [{ accountId: account.id, submissionId: submission.id, data }],
    });

    expect(markChanged).toHaveBeenCalledTimes(1);
    expect(markChanged).toHaveBeenCalledWith(submission.id, true);
  });

  it('should remove entity when parent is removed', async () => {
    const account = await createAccount();
    const submission = await createSubmission();

    const dto = new CreateWebsiteOptionsDto();
    dto.data = {
      title: 'title',
      tags: DefaultTagValue(),
      description: DefaultDescriptionValue(),
      rating: SubmissionRating.GENERAL,
    };
    dto.accountId = account.id;
    dto.submissionId = submission.id;

    await service.create(dto);
    expect(await service.findAll()).toHaveLength(2); // 2 because default

    await submissionService.remove(submission.id);
    expect(await service.findAll()).toHaveLength(0);
  });

  it('should update entity', async () => {
    const account = await createAccount();
    const submission = await createSubmission();

    const dto = new CreateWebsiteOptionsDto();
    dto.data = {
      contentWarning: '',
      title: 'title',
      tags: DefaultTagValue(),
      description: DefaultDescriptionValue(),
      rating: SubmissionRating.GENERAL,
    };
    dto.accountId = account.id;
    dto.submissionId = submission.id;

    const record = await service.create(dto);
    expect(record.accountId).toEqual(dto.accountId);
    expect(record.isDefault).toEqual(false);
    expect(record.data).toEqual(dto.data);
    expect(record.submission.id).toEqual(dto.submissionId);

    const update = await service.update(record.id, {
      data: {
        title: 'title updated',
        tags: DefaultTagValue(),
        description: DefaultDescriptionValue(),
        rating: SubmissionRating.GENERAL,
      },
    });

    expect(update.data.title).toEqual('title updated');
  });

  it('rejects option updates and removals while its submission is accepted', async () => {
    const account = await createAccount();
    const submission = await createSubmission();
    const record = await service.create({
      accountId: account.id,
      submissionId: submission.id,
      data: {
        title: 'original',
        tags: DefaultTagValue(),
        description: DefaultDescriptionValue(),
        rating: SubmissionRating.GENERAL,
      },
    });
    await acceptSubmission(submission.id);

    await expect(
      service.update(record.id, {
        data: { ...record.data, title: 'blocked' },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(service.remove(record.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.findByIdOrThrow(record.id)).resolves.toMatchObject({
      data: { title: 'original' },
    });
  });

  it('allows shortcut cleanup while an affected submission is accepted', async () => {
    const submission = await createSubmission();
    const option = submission.options[0];
    const description = DefaultDescriptionValue();
    description.description.content = [
      {
        type: 'paragraph',
        content: [{ type: 'customShortcut', attrs: { id: 'active-shortcut' } }],
      },
    ];
    await service.update(option.id, {
      data: { ...option.data, description },
    });
    await acceptSubmission(submission.id);
    const deleteShortcut = Reflect.get(service, 'onCustomShortcutDelete') as (
      id: string,
    ) => Promise<void>;

    await expect(
      deleteShortcut.call(service, 'active-shortcut'),
    ).resolves.toBeUndefined();
    await expect(service.findByIdOrThrow(option.id)).resolves.toMatchObject({
      data: {
        description: {
          description: {
            content: [
              {
                content: [],
              },
            ],
          },
        },
      },
    });
  });

  it('filters nested inline content', async () => {
    const blocks: TipTapNode[] = [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello, ', marks: [{ type: 'bold' }] },
          {
            type: 'customShortcut',
            attrs: {
              id: 'to-delete',
            },
            content: [
              {
                type: 'text',
                text: 'User',
              },
            ],
          },
        ],
      },
    ];

    const { changed, filtered } = service.filterCustomShortcut(
      blocks,
      'to-delete',
    );
    expect(changed).toBeTruthy();
    expect(filtered).toEqual([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello, ', marks: [{ type: 'bold' }] }],
      },
    ]);
  });
});
