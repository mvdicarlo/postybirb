import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DirectoryWatcherImportAction, SubmissionType } from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { DatabaseModule } from '../database/database.module';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { SubmissionService } from '../submission/services/submission.service';
import { SubmissionModule } from '../submission/submission.module';
import { DirectoryWatchersService } from './directory-watchers.service';
import { CreateDirectoryWatcherDto } from './dtos/create-directory-watcher.dto';
import { UpdateDirectoryWatcherDto } from './dtos/update-directory-watcher.dto';

describe('DirectoryWatchersService', () => {
  let service: DirectoryWatchersService;
  let submissionService: SubmissionService;
  let accountService: AccountService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, SubmissionModule],
      providers: [DirectoryWatchersService],
    }).compile();

    service = module.get<DirectoryWatchersService>(DirectoryWatchersService);
    submissionService = module.get<SubmissionService>(SubmissionService);
    accountService = module.get<AccountService>(AccountService);

    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }
    await accountService.onModuleInit();
  });

  async function createSubmission() {
    const dto = new CreateSubmissionDto();
    dto.name = 'test';
    dto.type = SubmissionType.MESSAGE;
    dto.isTemplate = true;

    const record = await submissionService.create(dto);
    return record;
  }

  afterAll(async () => {
    await orm.close(true);
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(orm).toBeDefined();
    expect(module).toBeDefined();
  });

  it('should create entities', async () => {
    const dto = new CreateDirectoryWatcherDto();
    dto.importAction = DirectoryWatcherImportAction.NEW_SUBMISSION;
    dto.path = 'path';

    await service.create(dto);
    const entities = await service.findAll();
    const record = entities[0];
    expect(record.path).toBe(dto.path);
    expect(record.importAction).toBe(dto.importAction);
  });

  it('should update entities', async () => {
    const dto = new CreateDirectoryWatcherDto();
    dto.importAction = DirectoryWatcherImportAction.NEW_SUBMISSION;
    dto.path = 'path';

    const record = await service.create(dto);
    expect(record.path).toBe(dto.path);
    expect(record.importAction).toBe(dto.importAction);

    const updateDto = new UpdateDirectoryWatcherDto();
    updateDto.path = 'updated-path';
    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.path).toBe(updateDto.path);
  });

  it('should support templates', async () => {
    const template = await createSubmission();
    const dto = new CreateDirectoryWatcherDto();
    dto.importAction = DirectoryWatcherImportAction.NEW_SUBMISSION;
    dto.path = 'path';
    const record = await service.create(dto);
    expect(record.path).toBe(dto.path);
    const updateDto = new UpdateDirectoryWatcherDto();
    updateDto.template = template.id;

    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.template).toBeDefined();
    expect(updatedRecord.template?.id).toBe(template.id);
    expect(updatedRecord.toJSON()).toEqual({
      createdAt: updatedRecord.createdAt.toISOString(),
      updatedAt: updatedRecord.updatedAt.toISOString(),
      id: updatedRecord.id,
      importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
      path: 'path',
      template: template.id,
    });

    await submissionService.remove(template.id);
    const rec = await service.findById(updatedRecord.id);
    expect(rec.template).toBeUndefined();
  });
});
