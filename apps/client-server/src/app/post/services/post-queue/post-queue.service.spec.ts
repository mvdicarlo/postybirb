import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
    DefaultDescription,
    SubmissionRating,
    SubmissionType,
} from '@postybirb/types';
import { AccountModule } from '../../../account/account.module';
import { AccountService } from '../../../account/account.service';
import { CreateAccountDto } from '../../../account/dtos/create-account.dto';
import { DatabaseModule } from '../../../database/database.module';
import { FileConverterModule } from '../../../file-converter/file-converter.module';
import { FileConverterService } from '../../../file-converter/file-converter.service';
import { PostParsersModule } from '../../../post-parsers/post-parsers.module';
import { SettingsModule } from '../../../settings/settings.module';
import { SettingsService } from '../../../settings/settings.service';
import { CreateSubmissionDto } from '../../../submission/dtos/create-submission.dto';
import { SubmissionService } from '../../../submission/services/submission.service';
import { SubmissionModule } from '../../../submission/submission.module';
import { UserSpecifiedWebsiteOptionsModule } from '../../../user-specified-website-options/user-specified-website-options.module';
import { ValidationService } from '../../../validation/validation.service';
import { CreateWebsiteOptionsDto } from '../../../website-options/dtos/create-website-options.dto';
import { WebsiteOptionsModule } from '../../../website-options/website-options.module';
import { WebsiteOptionsService } from '../../../website-options/website-options.service';
import { WebsiteRegistryService } from '../../../websites/website-registry.service';
import { WebsitesModule } from '../../../websites/websites.module';
import { PostModule } from '../../post.module';
import { PostService } from '../../post.service';
import { PostFileResizerService } from '../post-file-resizer/post-file-resizer.service';
import { PostManagerService } from '../post-manager/post-manager.service';
import { PostQueueService } from './post-queue.service';

describe('PostQueueService', () => {
  let service: PostQueueService;
  let module: TestingModule;
  let orm: MikroORM;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let websiteOptionsService: WebsiteOptionsService;
  let registryService: WebsiteRegistryService;

  beforeEach(async () => {
    try {
      module = await Test.createTestingModule({
        imports: [
          DatabaseModule,
          SubmissionModule,
          AccountModule,
          WebsiteOptionsModule,
          WebsitesModule,
          UserSpecifiedWebsiteOptionsModule,
          PostParsersModule,
          PostModule,
          FileConverterModule,
          SettingsModule,
        ],
        providers: [
          PostQueueService,
          PostManagerService,
          PostService,
          PostFileResizerService,
          ValidationService,
          FileConverterService,
          SettingsService,
        ],
      }).compile();

      service = module.get<PostQueueService>(PostQueueService);
      submissionService = module.get<SubmissionService>(SubmissionService);
      accountService = module.get<AccountService>(AccountService);
      const settingsService = module.get<SettingsService>(SettingsService);
      websiteOptionsService = module.get<WebsiteOptionsService>(
        WebsiteOptionsService,
      );
      registryService = module.get<WebsiteRegistryService>(
        WebsiteRegistryService,
      );
      orm = module.get(MikroORM);
      try {
        await orm.getSchemaGenerator().refreshDatabase();
      } catch {
        // none
      }
      await accountService.onModuleInit();
      await settingsService.onModuleInit();
    } catch (err) {
      console.log(err);
    }
  });

  function createSubmissionDto(): CreateSubmissionDto {
    const dto = new CreateSubmissionDto();
    dto.name = 'Test';
    dto.type = SubmissionType.MESSAGE;
    return dto;
  }

  function createAccountDto(): CreateAccountDto {
    const dto = new CreateAccountDto();
    dto.name = 'Test';
    dto.website = 'test';
    return dto;
  }

  function createWebsiteOptionsDto(
    submissionId: string,
    accountId: string,
  ): CreateWebsiteOptionsDto {
    const dto = new CreateWebsiteOptionsDto();
    dto.submission = submissionId;
    dto.account = accountId;
    dto.data = {
      title: 'Test Title',
      tags: {
        overrideDefault: true,
        tags: ['test'],
      },
      description: {
        overrideDefault: true,
        description: DefaultDescription(),
      },
      rating: SubmissionRating.GENERAL,
    };
    return dto;
  }

  afterAll(async () => {
    await orm.close(true);
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle pausing and resuming the queue', async () => {
    await service.pause();
    expect(await service.isPaused()).toBe(true);
    await service.resume();
    expect(await service.isPaused()).toBe(false);
  });

  it('should handle enqueue and dequeue of submissions', async () => {
    await service.pause(); // Just to test the function
    const submission = await submissionService.create(createSubmissionDto());
    const account = await accountService.create(createAccountDto());
    expect(registryService.findInstance(account)).toBeDefined();

    await websiteOptionsService.create(
      createWebsiteOptionsDto(submission.id, account.id),
    );

    await service.enqueue([submission.id, submission.id]);
    expect((await service.findAll()).length).toBe(1);
    const top = await service.peek();
    expect(top).toBeDefined();
    expect(top.submission.id).toBe(submission.id);

    await service.dequeue([submission.id]);
    expect((await service.findAll()).length).toBe(0);
    expect(await service.peek()).toBeUndefined();
  });
});
