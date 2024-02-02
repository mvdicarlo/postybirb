import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionType } from '@postybirb/types';
import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';
import { DatabaseModule } from '../database/database.module';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { SubmissionService } from '../submission/services/submission.service';
import { SubmissionModule } from '../submission/submission.module';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { PostService } from './post.service';

describe('PostService', () => {
  let service: PostService;
  let submissionService: SubmissionService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        SubmissionModule,
        AccountModule,
        WebsiteOptionsModule,
      ],
      providers: [PostService],
    }).compile();

    service = module.get<PostService>(PostService);
    submissionService = module.get<SubmissionService>(SubmissionService);
    const accountService = module.get<AccountService>(AccountService);
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }
    await accountService.onModuleInit();
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

  it('should dequeue entities', async () => {
    const dto = createSubmissionDto();
    const record = await submissionService.create(dto);
    const request = { ids: [record.id] };

    await service.enqueue(request);
    await service.dequeue(request);

    const records = await service.findAll();
    expect(records).toHaveLength(0);
  });
});
