import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionType } from '@postybirb/types';
import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';
import { DatabaseModule } from '../database/database.module';
import { FileConverterService } from '../file-converter/file-converter.service';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { SettingsService } from '../settings/settings.service';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { SubmissionService } from '../submission/services/submission.service';
import { SubmissionModule } from '../submission/submission.module';
import { UserSpecifiedWebsiteOptionsModule } from '../user-specified-website-options/user-specified-website-options.module';
import { ValidationModule } from '../validation/validation.module';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { WebsitesModule } from '../websites/websites.module';
import { PostFileResizerService } from './post-file-resizer.service';
import { PostManagerService } from './post-manager.service';
import { PostModule } from './post.module';
import { PostService } from './post.service';

describe('PostService', () => {
  let service: PostService;
  let submissionService: SubmissionService;
  let module: TestingModule;
  let orm: MikroORM;

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
          ValidationModule,
        ],
        providers: [
          PostService,
          PostManagerService,
          PostFileResizerService,
          FileConverterService,
        ],
      }).compile();

      service = module.get<PostService>(PostService);
      const settingsService = module.get<SettingsService>(SettingsService);
      submissionService = module.get<SubmissionService>(SubmissionService);
      const accountService = module.get<AccountService>(AccountService);
      orm = module.get(MikroORM);
      try {
        await orm.getSchemaGenerator().refreshDatabase();
      } catch {
        // none
      }
      await accountService.onModuleInit();
      await settingsService.onModuleInit();
    } catch (e) {
      console.error(e);
    }
  });

  function createSubmissionDto(): CreateSubmissionDto {
    const dto = new CreateSubmissionDto();
    dto.name = 'Test';
    dto.type = SubmissionType.MESSAGE;
    return dto;
  }

  afterAll(async () => {
    await orm.close(true);
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entities', async () => {
    const dto = createSubmissionDto();
    const record = await submissionService.create(dto);

    const postRecords = await service.enqueue({ ids: [record.id, record.id] });

    const records = await service.findAll();
    expect(records).toHaveLength(1);
    expect(records[0].id).toEqual(postRecords[0]);

    const doubleInsert = await service.enqueue({ ids: [record.id] });
    expect(doubleInsert).toHaveLength(0);
  });

  function wait(ms: number) {
    // eslint-disable-next-line no-promise-executor-return
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  it('should dequeue entities', async () => {
    const dto = createSubmissionDto();
    const record = await submissionService.create(dto);
    const record2 = await submissionService.create(dto);
    const request = { ids: [record.id, record2.id] };

    await service.enqueue(request);
    await wait(100);
    await service.dequeue(request);
    const records = await service.findAll();
    expect(records).toHaveLength(1);
  }, 60_000);
});
