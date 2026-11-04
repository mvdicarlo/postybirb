import { ConflictException } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase, PostRepository, WebsiteOptionsRepository } from '@postybirb/database';
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

import { AccountTemplateDefaultsService } from '../account/account-template-defaults.service';
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

import { WebsiteOptionsMigrationService } from './website-options-migration.service';
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
          WebsiteOptionsMigrationService,
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
    } catch (e) {
      console.error(e);
    }
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('baselines fresh data and copies outdated templates without blocking', async () => {
    const account = await createAccount();
    const templateDto = new CreateSubmissionDto();
    templateDto.name = 'Versioned template';
    templateDto.type = SubmissionType.FILE;
    templateDto.isTemplate = true;
    const template = await submissionService.create(templateDto);
    const option = await service.create({
      accountId: account.id,
      submissionId: template.id,
      data: {},
    } as CreateWebsiteOptionsDto);
    expect(option.migrationVersion).toBe(1);
    expect(option.toDTO()).not.toHaveProperty('migrationVersion');
    expect(await service.createOptionInsertObject(template, account.id, {}))
      .toMatchObject({ migrationVersion: 1 });

    const options = new WebsiteOptionsRepository();
    const outdatedOption = await options.update(option.id, {
      migrationVersion: 0,
      data: { ...option.data, whoCanReply: 'mention' } as typeof option.data,
    });
    await submissionService.duplicate(template.id);
    const copied = await options.findOne({
      where: (entry, { and, eq, ne }) => and(
        ne(entry.submissionId, template.id), eq(entry.accountId, account.id),
      ),
    });
    expect(copied?.migrationVersion).toBe(0);

    for (const sourceOptionId of [undefined, option.id]) {
      const newDestination = await submissionService.create(templateDto);
      const existingDestination = await submissionService.create(templateDto);
      await service.create({
        accountId: account.id,
        submissionId: existingDestination.id,
        data: {},
      } as CreateWebsiteOptionsDto);
      const applied = await submissionService.applyTemplateOptions({
        targetSubmissionIds: [newDestination.id, existingDestination.id],
        options: [{
          accountId: account.id, sourceOptionId, data: outdatedOption.data,
        }],
        overrideTitle: false,
        overrideDescription: false,
      });
      expect(applied).toMatchObject({ success: 2, failed: 0 });
      for (const destination of [newDestination, existingDestination]) {
        const copiedOption = await options.findOne({
          where: (entry, { and, eq }) => and(
            eq(entry.submissionId, destination.id), eq(entry.accountId, account.id),
          ),
        });
        expect(copiedOption?.migrationVersion).toBe(outdatedOption.migrationVersion);
      }
    }

    await accountService.update(account.id, {
      name: account.name,
      groups: account.groups,
      defaultFileTemplateId: template.id,
    });
    expect(await module.get(AccountTemplateDefaultsService)
      .resolveDefaults(account.id, SubmissionType.FILE))
      .toMatchObject({ whoCanReply: 'mention' });

    const target = await submissionService.create(templateDto);
    await submissionService.applyOverridingTemplate(target.id, template.id);
    const copiedRows = await options.find({
      where: (entry, { eq }) => eq(entry.accountId, account.id),
    });
    expect(copiedRows).toHaveLength(7);
    expect(copiedRows.every((entry) => entry.migrationVersion === 0)).toBe(true);

    await service.onModuleInit();
    for (const entry of await options.find({
      where: (row, { eq }) => eq(row.accountId, account.id),
    })) {
      expect(entry).toMatchObject({
        migrationVersion: 1, data: { whoCanReply: ['mention'] },
      });
    }

    const currentSource = await options.findByIdOrThrow(option.id);
    const olderDestination = await options.findOne({
      where: (entry, { and, eq }) => and(
        eq(entry.submissionId, target.id), eq(entry.accountId, account.id),
      ),
    });
    await options.update(olderDestination!.id, { migrationVersion: 0 });
    const freshDestination = await submissionService.create(templateDto);
    expect(await submissionService.applyTemplateOptions({
      targetSubmissionIds: [freshDestination.id, target.id],
      options: [{
        accountId: account.id,
        sourceOptionId: option.id,
        data: outdatedOption.data,
      }],
      overrideTitle: false,
      overrideDescription: false,
    })).toMatchObject({ success: 2, failed: 0 });
    for (const [submissionId, migrationVersion] of [
      [freshDestination.id, currentSource.migrationVersion],
      [target.id, 0],
    ] as const) {
      const copiedOption = await options.findOne({
        where: (entry, { and, eq }) => and(
          eq(entry.submissionId, submissionId), eq(entry.accountId, account.id),
        ),
      });
      expect(copiedOption).toMatchObject({
        migrationVersion, data: { whoCanReply: ['mention'] },
      });
    }
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
