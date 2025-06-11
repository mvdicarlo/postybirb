import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { DirectoryWatcherImportAction, SubmissionType } from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { NotificationsModule } from '../notifications/notifications.module';
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

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      imports: [SubmissionModule, NotificationsModule],
      providers: [DirectoryWatchersService],
    }).compile();

    service = module.get<DirectoryWatchersService>(DirectoryWatchersService);
    submissionService = module.get<SubmissionService>(SubmissionService);
    accountService = module.get<AccountService>(AccountService);

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
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
    updateDto.templateId = template.id;

    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.templateId).toBe(template.id);
    expect(updatedRecord.toDTO()).toEqual({
      createdAt: updatedRecord.createdAt,
      updatedAt: updatedRecord.updatedAt,
      id: updatedRecord.id,
      importAction: DirectoryWatcherImportAction.NEW_SUBMISSION,
      path: 'path',
      templateId: template.id,
    });

    await submissionService.remove(template.id);
    const rec = await service.findById(updatedRecord.id);
    expect(rec.templateId).toBe(null);
  });
});
