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
import { PostManagerService } from './post-manager.service';

describe('PostManagerService', () => {
  let service: PostManagerService;
  let module: TestingModule;
  let orm: MikroORM;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let websiteOptionsService: WebsiteOptionsService;
  let postService: PostService;
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
        ],
        providers: [
          PostManagerService,
          PostService,
          PostFileResizerService,
          ValidationService,
          FileConverterService,
        ],
      }).compile();

      service = module.get<PostManagerService>(PostManagerService);
      submissionService = module.get<SubmissionService>(SubmissionService);
      accountService = module.get<AccountService>(AccountService);
      const settingsService = module.get<SettingsService>(SettingsService);
      websiteOptionsService = module.get<WebsiteOptionsService>(
        WebsiteOptionsService,
      );
      postService = module.get<PostService>(PostService);
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

  it('should handle Message submission', async () => {
    const submission = await submissionService.create(createSubmissionDto());
    const account = await accountService.create(createAccountDto());
    expect(registryService.findInstance(account)).toBeDefined();

    await websiteOptionsService.create(
      createWebsiteOptionsDto(submission.id, account.id),
    );

    await postService.enqueue({ ids: [submission.id] });
    const postRecord = await postService.getNext();
    expect(postRecord).toBeDefined();

    await service.startPost(postRecord);
    expect(postRecord.children).toBeDefined();
  });
});
